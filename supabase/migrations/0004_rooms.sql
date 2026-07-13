-- Private live-room schema for authenticated Gadha Chor games.
--
-- Authority model (ADR-0003, refined by ADR-0009): the server is authoritative
-- and every state change runs through a SECURITY DEFINER RPC (migration 0005)
-- that validates membership, capacity, host rights, and — for game actions —
-- idempotency and version, all inside a single transaction. Clients therefore
-- hold NO direct INSERT/UPDATE/DELETE on any table here: base grants expose
-- SELECT only, and RLS scopes every readable row to the caller's room
-- membership. The one hard privacy boundary is game_private_hands, where a
-- player may read ONLY their own hand — never another seat's cards.

-- ---------------------------------------------------------------------------
-- rooms — one lobby/session; the host owns it.
-- ---------------------------------------------------------------------------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  host_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'lobby'
    check (status in ('lobby', 'in_progress', 'complete', 'abandoned')),
  max_seats smallint not null default 6 check (max_seats between 2 and 6),
  locale text not null default 'en' check (locale in ('en', 'gu', 'hi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rooms_host_idx on public.rooms (host_id);

-- ---------------------------------------------------------------------------
-- room_seats — 0..5 fixed positions; occupant is human | bot | empty.
-- ---------------------------------------------------------------------------
create table if not exists public.room_seats (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  seat_index smallint not null check (seat_index between 0 and 5),
  occupant text not null default 'empty'
    check (occupant in ('human', 'bot', 'empty')),
  user_id uuid references auth.users (id) on delete set null,
  display_name text
    check (display_name is null or char_length(display_name) between 1 and 40),
  is_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_id, seat_index),
  -- A human seat must name its occupant; bots/empty seats never carry a user.
  constraint room_seats_human_has_user
    check ((occupant = 'human') = (user_id is not null))
);

-- A given user may hold at most one seat in a room.
create unique index if not exists room_seats_unique_user
  on public.room_seats (room_id, user_id)
  where user_id is not null;

create index if not exists room_seats_room_idx on public.room_seats (room_id);
create index if not exists room_seats_user_idx on public.room_seats (user_id);

-- ---------------------------------------------------------------------------
-- games — the authoritative per-round state. public_snapshot is card-safe
-- (counts, turn, tokens — never another player's identities).
-- ---------------------------------------------------------------------------
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'complete', 'abandoned')),
  state_version integer not null default 0,
  public_snapshot jsonb not null default '{}'::jsonb,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists games_room_idx on public.games (room_id);

-- ---------------------------------------------------------------------------
-- game_private_hands — THE privacy boundary. One row per (game, player);
-- a player reads only their own row. Never selectable across users.
-- ---------------------------------------------------------------------------
create table if not exists public.game_private_hands (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  hand jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

-- ---------------------------------------------------------------------------
-- game_events — append-only public event log, ordered by seq within a game.
-- ---------------------------------------------------------------------------
create table if not exists public.game_events (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.games (id) on delete cascade,
  seq integer not null,
  event jsonb not null,
  created_at timestamptz not null default now(),
  unique (game_id, seq)
);

create index if not exists game_events_game_idx on public.game_events (game_id);

-- ---------------------------------------------------------------------------
-- Membership helpers. SECURITY DEFINER so they read seat rows without tripping
-- the very RLS policies that call them (avoids recursion); STABLE + pinned
-- search_path for safety. Every policy below scopes rows through these.
-- ---------------------------------------------------------------------------
create or replace function public.is_room_member(p_room_id uuid)
  returns boolean
  language sql
  security definer
  set search_path = public
  stable
as $$
  select exists (
    select 1
    from public.room_seats s
    where s.room_id = p_room_id
      and s.user_id = auth.uid()
  );
$$;

create or replace function public.is_game_member(p_game_id uuid)
  returns boolean
  language sql
  security definer
  set search_path = public
  stable
as $$
  select exists (
    select 1
    from public.games g
    join public.room_seats s on s.room_id = g.room_id
    where g.id = p_game_id
      and s.user_id = auth.uid()
  );
$$;

revoke all on function public.is_room_member(uuid) from public;
revoke all on function public.is_game_member(uuid) from public;
grant execute on function public.is_room_member(uuid) to authenticated, service_role;
grant execute on function public.is_game_member(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row level security. Read-only, membership-scoped for authenticated users;
-- guests (anon) see nothing. There are deliberately NO client write policies —
-- all mutations flow through the SECURITY DEFINER RPCs in migration 0005.
-- ---------------------------------------------------------------------------
alter table public.rooms enable row level security;
alter table public.room_seats enable row level security;
alter table public.games enable row level security;
alter table public.game_private_hands enable row level security;
alter table public.game_events enable row level security;

-- rooms: the host and any seated member may read the room.
create policy "rooms_select_member"
  on public.rooms for select
  using (auth.uid() = host_id or public.is_room_member(id));

-- room_seats: any seated member may read all seats in their room.
create policy "room_seats_select_member"
  on public.room_seats for select
  using (public.is_room_member(room_id));

-- games: any seated member may read the game's public snapshot.
create policy "games_select_member"
  on public.games for select
  using (public.is_room_member(room_id));

-- game_private_hands: a player may read ONLY their own hand. This is the
-- non-negotiable card-privacy boundary — no membership widening here.
create policy "game_private_hands_select_own"
  on public.game_private_hands for select
  using (auth.uid() = user_id);

-- game_events: any member of the game's room may read the event log.
create policy "game_events_select_member"
  on public.game_events for select
  using (public.is_game_member(game_id));

-- ---------------------------------------------------------------------------
-- Base grants. Authenticated users get SELECT only; every write is denied at
-- the privilege level and must go through an RPC. service_role (server) keeps
-- full access for administrative/authority paths.
-- ---------------------------------------------------------------------------
grant select on public.rooms to authenticated;
grant select on public.room_seats to authenticated;
grant select on public.games to authenticated;
grant select on public.game_private_hands to authenticated;
grant select on public.game_events to authenticated;

grant all on public.rooms to service_role;
grant all on public.room_seats to service_role;
grant all on public.games to service_role;
grant all on public.game_private_hands to service_role;
grant all on public.game_events to service_role;
