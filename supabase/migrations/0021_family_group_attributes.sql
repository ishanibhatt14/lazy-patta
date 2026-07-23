-- Release Train 2, PR 11 (increment 3) — Family Group attributes.
--
-- Builds on 0020's family circle with the three things a persistent family
-- keeps between sessions: the games they love (favorite_games), the tables they
-- recently sat at (recent_tables), and who won past series (series_results).
--
-- Security follows 0020 exactly: clients hold NO direct writes. Reads are scoped
-- to the caller's own family memberships through the recursion-safe
-- is_family_group_member predicate; every mutation goes through a SECURITY
-- DEFINER RPC that stamps the caller from auth.uid() and re-checks membership.
-- game_key mirrors the online-rooms allow-list (gadha_chor, lal_satti, jhabbu,
-- kachuful) so a family can only pin games the platform actually hosts.

-- ---------------------------------------------------------------------------
-- family_group_favorite_games — the family's shortlist of games to play. One
-- row per (family, game); any member may pin or unpin.
-- ---------------------------------------------------------------------------
create table if not exists public.family_group_favorite_games (
  group_id uuid not null references public.family_groups (id) on delete cascade,
  game_key text not null
    check (game_key in ('gadha_chor', 'lal_satti', 'jhabbu', 'kachuful')),
  added_by uuid references auth.users (id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (group_id, game_key)
);

-- ---------------------------------------------------------------------------
-- family_group_recent_tables — a rolling log of rooms the family sat at,
-- newest first. Deduped by (family, room_code): re-recording a code just
-- refreshes played_at so the list stays a set of distinct recent tables.
-- ---------------------------------------------------------------------------
create table if not exists public.family_group_recent_tables (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.family_groups (id) on delete cascade,
  game_key text not null
    check (game_key in ('gadha_chor', 'lal_satti', 'jhabbu', 'kachuful')),
  room_code text not null check (room_code ~ '^[A-Z0-9]{6}$'),
  played_at timestamptz not null default now(),
  recorded_by uuid references auth.users (id) on delete set null,
  unique (group_id, room_code)
);

create index if not exists family_group_recent_tables_group_idx
  on public.family_group_recent_tables (group_id, played_at desc);

-- ---------------------------------------------------------------------------
-- family_group_series_results — series history: who won a past series within
-- this family, and a small game-defined summary blob. Append-only.
-- ---------------------------------------------------------------------------
create table if not exists public.family_group_series_results (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.family_groups (id) on delete cascade,
  game_key text not null
    check (game_key in ('gadha_chor', 'lal_satti', 'jhabbu', 'kachuful')),
  winner_user_id uuid references auth.users (id) on delete set null,
  winner_display_name text
    check (winner_display_name is null or char_length(winner_display_name) <= 60),
  rounds_played smallint check (rounds_played is null or rounds_played >= 0),
  summary jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references auth.users (id) on delete set null
);

create index if not exists family_group_series_results_group_idx
  on public.family_group_series_results (group_id, recorded_at desc);

-- ---------------------------------------------------------------------------
-- RLS: read only rows for families you belong to. No client write policies —
-- the RPCs below own every mutation.
-- ---------------------------------------------------------------------------
alter table public.family_group_favorite_games enable row level security;
alter table public.family_group_recent_tables enable row level security;
alter table public.family_group_series_results enable row level security;

create policy "family_favorite_games_select_member"
  on public.family_group_favorite_games for select
  using (public.is_family_group_member(group_id, auth.uid()));

create policy "family_recent_tables_select_member"
  on public.family_group_recent_tables for select
  using (public.is_family_group_member(group_id, auth.uid()));

create policy "family_series_results_select_member"
  on public.family_group_series_results for select
  using (public.is_family_group_member(group_id, auth.uid()));

grant select on public.family_group_favorite_games to authenticated;
grant select on public.family_group_recent_tables to authenticated;
grant select on public.family_group_series_results to authenticated;
grant all on public.family_group_favorite_games to service_role;
grant all on public.family_group_recent_tables to service_role;
grant all on public.family_group_series_results to service_role;

-- ---------------------------------------------------------------------------
-- Shared guard: raise unless the caller is a member of the given family. Kept
-- SECURITY DEFINER + STABLE so it reads membership with RLS bypassed, exactly
-- like is_family_group_member (which it reuses).
-- ---------------------------------------------------------------------------
create or replace function public.assert_family_group_member(p_group_id uuid)
  returns uuid
  language plpgsql
  security definer
  set search_path = public
  stable
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if not public.is_family_group_member(p_group_id, v_uid) then
    raise exception 'not a member of this family' using errcode = '42501';
  end if;
  return v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- add_family_favorite_game / remove_family_favorite_game — members pin or unpin
-- a game. Pinning is idempotent.
-- ---------------------------------------------------------------------------
create or replace function public.add_family_favorite_game(p_group_id uuid, p_game_key text)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := public.assert_family_group_member(p_group_id);
begin
  if p_game_key not in ('gadha_chor', 'lal_satti', 'jhabbu', 'kachuful') then
    raise exception 'unsupported game' using errcode = '22023';
  end if;

  insert into public.family_group_favorite_games (group_id, game_key, added_by)
  values (p_group_id, p_game_key, v_uid)
  on conflict (group_id, game_key) do nothing;
end;
$$;

create or replace function public.remove_family_favorite_game(p_group_id uuid, p_game_key text)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  perform public.assert_family_group_member(p_group_id);

  delete from public.family_group_favorite_games
  where group_id = p_group_id and game_key = p_game_key;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_family_table — note that the family sat at a table. Deduped by code:
-- re-recording refreshes played_at (and the game, in case a code was reused).
-- ---------------------------------------------------------------------------
create or replace function public.record_family_table(
  p_group_id uuid,
  p_game_key text,
  p_room_code text
)
  returns public.family_group_recent_tables
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := public.assert_family_group_member(p_group_id);
  v_code text := upper(nullif(trim(coalesce(p_room_code, '')), ''));
  v_row public.family_group_recent_tables;
begin
  if p_game_key not in ('gadha_chor', 'lal_satti', 'jhabbu', 'kachuful') then
    raise exception 'unsupported game' using errcode = '22023';
  end if;
  if v_code is null or v_code !~ '^[A-Z0-9]{6}$' then
    raise exception 'that table code is not valid' using errcode = '22023';
  end if;

  insert into public.family_group_recent_tables (group_id, game_key, room_code, recorded_by)
  values (p_group_id, p_game_key, v_code, v_uid)
  on conflict (group_id, room_code)
  do update set played_at = now(), game_key = excluded.game_key, recorded_by = excluded.recorded_by
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_family_series_result — append a finished series to the family's
-- history. winner fields are optional (a series may end without a named human
-- winner); summary is a small game-defined blob.
-- ---------------------------------------------------------------------------
create or replace function public.record_family_series_result(
  p_group_id uuid,
  p_game_key text,
  p_winner_user_id uuid default null,
  p_winner_display_name text default null,
  p_rounds_played smallint default null,
  p_summary jsonb default '{}'::jsonb
)
  returns public.family_group_series_results
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := public.assert_family_group_member(p_group_id);
  v_row public.family_group_series_results;
begin
  if p_game_key not in ('gadha_chor', 'lal_satti', 'jhabbu', 'kachuful') then
    raise exception 'unsupported game' using errcode = '22023';
  end if;

  insert into public.family_group_series_results (
    group_id, game_key, winner_user_id, winner_display_name, rounds_played, summary, recorded_by
  )
  values (
    p_group_id,
    p_game_key,
    p_winner_user_id,
    nullif(trim(coalesce(p_winner_display_name, '')), ''),
    p_rounds_played,
    coalesce(p_summary, '{}'::jsonb),
    v_uid
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.assert_family_group_member(uuid) from public;
revoke all on function public.add_family_favorite_game(uuid, text) from public;
revoke all on function public.remove_family_favorite_game(uuid, text) from public;
revoke all on function public.record_family_table(uuid, text, text) from public;
revoke all on function public.record_family_series_result(uuid, text, uuid, text, smallint, jsonb) from public;

grant execute on function public.assert_family_group_member(uuid) to authenticated, service_role;
grant execute on function public.add_family_favorite_game(uuid, text) to authenticated, service_role;
grant execute on function public.remove_family_favorite_game(uuid, text) to authenticated, service_role;
grant execute on function public.record_family_table(uuid, text, text) to authenticated, service_role;
grant execute on function public.record_family_series_result(uuid, text, uuid, text, smallint, jsonb) to authenticated, service_role;
