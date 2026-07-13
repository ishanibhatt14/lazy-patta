-- Live-gameplay authority: server-only state + thin persistence RPCs.
--
-- Authority model (ADR-0003 → ADR-0010): the Gadha Chor rules live in the
-- TypeScript engine, which PL/pgSQL cannot run. Live game actions are therefore
-- validated and applied by a Next.js Route Handler (Node) that imports the pure
-- engine, using the service_role key. The handler computes the next state and
-- commits it through the two SECURITY DEFINER functions below — start_game and
-- commit_game_action — which carry NO game rules. Each runs in one transaction,
-- locks the games row, enforces the expectedVersion optimistic-concurrency guard
-- and (game_id, actor_id, client_action_id) idempotency, and writes the derived
-- projections clients read. These functions are granted to service_role ONLY;
-- authenticated users never call them and keep SELECT-only, RLS-scoped reads.

-- ---------------------------------------------------------------------------
-- game_authority_state — the FULL engine state (every hand, incl. bots). This
-- is the one place hidden cards live together; it is server-only. RLS is on and
-- there is deliberately NO grant to authenticated, so the database itself refuses
-- to hand this row to a client. Clients read game_private_hands (own hand only)
-- and games.public_snapshot instead.
-- ---------------------------------------------------------------------------
create table if not exists public.game_authority_state (
  game_id uuid primary key references public.games (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- game_action_log — idempotency ledger. A given (game, actor, client action id)
-- applies at most once; a retried submit is a no-op that returns current state.
-- ---------------------------------------------------------------------------
create table if not exists public.game_action_log (
  game_id uuid not null references public.games (id) on delete cascade,
  actor_id text not null,
  client_action_id text not null,
  state_version integer not null,
  created_at timestamptz not null default now(),
  primary key (game_id, actor_id, client_action_id)
);

create index if not exists game_action_log_game_idx on public.game_action_log (game_id);

-- ---------------------------------------------------------------------------
-- RLS: both tables are server-only. Enable RLS with no policies for
-- authenticated (default-deny), and grant only to service_role.
-- ---------------------------------------------------------------------------
alter table public.game_authority_state enable row level security;
alter table public.game_action_log enable row level security;

grant all on public.game_authority_state to service_role;
grant all on public.game_action_log to service_role;

-- ---------------------------------------------------------------------------
-- start_game — create the authoritative game for a room and seed its projections.
-- The caller (server) has already validated host rights + readiness in TS; this
-- function owns only the atomic write: flip the room to in_progress, insert the
-- games row + full authority state, seed each human's private hand, and append
-- the initial event log. Bots hold no private-hand row (no user_id).
--
--   p_public_snapshot : PublicSnapshot jsonb (includes stateVersion)
--   p_authority_state : full GameState jsonb (all hands, incl. bots)
--   p_hands           : jsonb array of { user_id, hand } for human seats
--   p_events          : jsonb array of GameEvent, appended from seq 0
-- ---------------------------------------------------------------------------
create or replace function public.start_game(
  p_room_id uuid,
  p_public_snapshot jsonb,
  p_authority_state jsonb,
  p_hands jsonb,
  p_events jsonb
)
  returns public.games
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_room public.rooms;
  v_game public.games;
  v_version integer := coalesce((p_public_snapshot ->> 'stateVersion')::int, 0);
begin
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'room is not in lobby' using errcode = '22023';
  end if;

  update public.rooms set status = 'in_progress', updated_at = now() where id = p_room_id;

  insert into public.games (room_id, status, state_version, public_snapshot)
  values (p_room_id, 'active', v_version, p_public_snapshot)
  returning * into v_game;

  insert into public.game_authority_state (game_id, state)
  values (v_game.id, p_authority_state);

  insert into public.game_private_hands (game_id, user_id, hand)
  select v_game.id, (h ->> 'user_id')::uuid, h -> 'hand'
  from jsonb_array_elements(coalesce(p_hands, '[]'::jsonb)) as h;

  insert into public.game_events (game_id, seq, event)
  select v_game.id, (ord - 1)::int, elem
  from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) with ordinality as e(elem, ord);

  return v_game;
end;
$$;

-- ---------------------------------------------------------------------------
-- commit_game_action — apply one already-computed engine step atomically.
-- The caller has run the pure engine; this function is the authority WRITE:
-- lock the game row, short-circuit on idempotent retry, enforce the version
-- guard, then persist snapshot + full state + affected hands + events and record
-- the action id. p_actor is a text player id (a user uuid, or a bot id like
-- "bot:2"); p_client_action_id is unique per (game, actor).
-- ---------------------------------------------------------------------------
create or replace function public.commit_game_action(
  p_game_id uuid,
  p_actor text,
  p_client_action_id text,
  p_expected_version integer,
  p_public_snapshot jsonb,
  p_authority_state jsonb,
  p_hands jsonb,
  p_events jsonb,
  p_status text,
  p_result jsonb
)
  returns public.games
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_game public.games;
  v_version integer := coalesce((p_public_snapshot ->> 'stateVersion')::int, p_expected_version + 1);
  v_base_seq integer;
begin
  select * into v_game from public.games where id = p_game_id for update;
  if not found then
    raise exception 'game not found' using errcode = 'P0002';
  end if;

  -- Idempotent retry: the action already landed; return current state unchanged.
  if exists (
    select 1 from public.game_action_log
    where game_id = p_game_id and actor_id = p_actor and client_action_id = p_client_action_id
  ) then
    return v_game;
  end if;

  if v_game.state_version <> p_expected_version then
    raise exception 'version conflict: expected %, found %', p_expected_version, v_game.state_version
      using errcode = '40001';
  end if;

  update public.games
  set state_version = v_version,
      public_snapshot = p_public_snapshot,
      status = p_status,
      result = p_result,
      updated_at = now()
  where id = p_game_id
  returning * into v_game;

  update public.game_authority_state
  set state = p_authority_state, updated_at = now()
  where game_id = p_game_id;

  insert into public.game_private_hands (game_id, user_id, hand, updated_at)
  select p_game_id, (h ->> 'user_id')::uuid, h -> 'hand', now()
  from jsonb_array_elements(coalesce(p_hands, '[]'::jsonb)) as h
  on conflict (game_id, user_id) do update
    set hand = excluded.hand, updated_at = now();

  select coalesce(max(seq) + 1, 0) into v_base_seq
  from public.game_events where game_id = p_game_id;

  insert into public.game_events (game_id, seq, event)
  select p_game_id, v_base_seq + (ord - 1)::int, elem
  from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) with ordinality as e(elem, ord);

  insert into public.game_action_log (game_id, actor_id, client_action_id, state_version)
  values (p_game_id, p_actor, p_client_action_id, v_version);

  -- Reflect a finished game up to the room so the lobby can offer a rematch.
  if p_status = 'complete' then
    update public.rooms set status = 'complete', updated_at = now()
    where id = v_game.room_id;
  end if;

  return v_game;
end;
$$;

-- Persistence authority is server-only: revoke from everyone, grant to
-- service_role. Authenticated users reach these effects only by asking the
-- Next.js route handler, which holds the service_role key server-side.
revoke all on function public.start_game(uuid, jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function public.commit_game_action(uuid, text, text, integer, jsonb, jsonb, jsonb, jsonb, text, jsonb) from public;

grant execute on function public.start_game(uuid, jsonb, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.commit_game_action(uuid, text, text, integer, jsonb, jsonb, jsonb, jsonb, text, jsonb) to service_role;
