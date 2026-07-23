-- Player safety: reports and blocks.
--
-- Even a warm family-and-friends table needs a quiet exit from a bad actor. Two
-- small tables back that:
--   * player_reports — an append-only record that one user flagged another,
--     optionally tied to the room it happened in, with a coarse reason. Reviewed
--     out of band; nothing here auto-moderates.
--   * player_blocks — a personal, one-directional "I don't want to play with
--     this person" list. Enforcement (hiding them, refusing shared rooms) is a
--     client/product concern layered on top; the row is the durable intent.
--
-- Consistent with the rest of the schema (0004), clients hold NO direct writes:
-- every mutation goes through a SECURITY DEFINER RPC that stamps the caller from
-- auth.uid(), and RLS lets a user read only their OWN reports and blocks — never
-- anyone else's. A user can neither report nor block on someone else's behalf,
-- nor see who has reported or blocked them.

-- ---------------------------------------------------------------------------
-- player_reports — one row per flag raised by a reporter.
-- ---------------------------------------------------------------------------
create table if not exists public.player_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reported_user_id uuid not null references auth.users (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete set null,
  reason text not null
    check (reason in ('abuse', 'cheating', 'inappropriate_name', 'spam', 'other')),
  details text check (details is null or char_length(details) <= 500),
  created_at timestamptz not null default now(),
  -- A user cannot report themselves.
  constraint player_reports_not_self check (reporter_id <> reported_user_id)
);

create index if not exists player_reports_reporter_idx on public.player_reports (reporter_id);
create index if not exists player_reports_reported_idx on public.player_reports (reported_user_id);

-- ---------------------------------------------------------------------------
-- player_blocks — a blocker's personal do-not-pair list.
-- ---------------------------------------------------------------------------
create table if not exists public.player_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_user_id),
  constraint player_blocks_not_self check (blocker_id <> blocked_user_id)
);

create index if not exists player_blocks_blocker_idx on public.player_blocks (blocker_id);

-- ---------------------------------------------------------------------------
-- RLS: read only your own rows. No client write policies — RPCs handle writes.
-- ---------------------------------------------------------------------------
alter table public.player_reports enable row level security;
alter table public.player_blocks enable row level security;

create policy "player_reports_select_own"
  on public.player_reports for select
  using (auth.uid() = reporter_id);

create policy "player_blocks_select_own"
  on public.player_blocks for select
  using (auth.uid() = blocker_id);

grant select on public.player_reports to authenticated;
grant select on public.player_blocks to authenticated;
grant all on public.player_reports to service_role;
grant all on public.player_blocks to service_role;

-- ---------------------------------------------------------------------------
-- report_player: record a flag against another user, stamped with the caller.
-- ---------------------------------------------------------------------------
create or replace function public.report_player(
  p_reported_user_id uuid,
  p_reason text,
  p_room_id uuid default null,
  p_details text default null
)
  returns public.player_reports
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_report public.player_reports;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_reported_user_id is null or p_reported_user_id = v_uid then
    raise exception 'cannot report this user' using errcode = '22023';
  end if;
  if p_reason not in ('abuse', 'cheating', 'inappropriate_name', 'spam', 'other') then
    raise exception 'unsupported report reason' using errcode = '22023';
  end if;

  insert into public.player_reports (reporter_id, reported_user_id, room_id, reason, details)
  values (v_uid, p_reported_user_id, p_room_id, p_reason, nullif(trim(coalesce(p_details, '')), ''))
  returning * into v_report;

  return v_report;
end;
$$;

-- ---------------------------------------------------------------------------
-- block_player / unblock_player: manage the caller's own block list. block is
-- idempotent (re-blocking is a no-op that returns the existing row).
-- ---------------------------------------------------------------------------
create or replace function public.block_player(p_blocked_user_id uuid)
  returns public.player_blocks
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_block public.player_blocks;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_blocked_user_id is null or p_blocked_user_id = v_uid then
    raise exception 'cannot block this user' using errcode = '22023';
  end if;

  insert into public.player_blocks (blocker_id, blocked_user_id)
  values (v_uid, p_blocked_user_id)
  on conflict (blocker_id, blocked_user_id) do update set blocker_id = excluded.blocker_id
  returning * into v_block;

  return v_block;
end;
$$;

create or replace function public.unblock_player(p_blocked_user_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  delete from public.player_blocks
  where blocker_id = v_uid and blocked_user_id = p_blocked_user_id;
end;
$$;

revoke all on function public.report_player(uuid, text, uuid, text) from public;
revoke all on function public.block_player(uuid) from public;
revoke all on function public.unblock_player(uuid) from public;

grant execute on function public.report_player(uuid, text, uuid, text) to authenticated, service_role;
grant execute on function public.block_player(uuid) to authenticated, service_role;
grant execute on function public.unblock_player(uuid) to authenticated, service_role;
