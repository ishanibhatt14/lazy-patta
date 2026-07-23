-- Release Train 2, PR 14 — scheduled family game nights.
--
-- A game night is a lightweight, forward-looking plan a family makes together:
-- "Sunday 8pm, we play Lal Satti." It is the retention primitive for Release
-- Train 2 — a reason to come back — and it deliberately carries NO server-side
-- delivery machinery. The app never claims to send a message it cannot honestly
-- deliver; the client instead offers a calendar (.ics) download so the reminder
-- lives in the device's own calendar. This keeps the promise we can actually
-- keep.
--
-- Security follows 0020/0021 exactly: clients hold NO direct writes. Reads are
-- scoped to the caller's family memberships through is_family_group_member; every
-- mutation goes through a SECURITY DEFINER RPC that re-checks membership via
-- assert_family_group_member (0021) and stamps the caller from auth.uid().
-- game_key mirrors the online-rooms allow-list and is optional (a family may set
-- a time before deciding the game).

create table if not exists public.family_group_game_nights (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.family_groups (id) on delete cascade,
  game_key text
    check (game_key is null or game_key in ('gadha_chor', 'lal_satti', 'jhabbu', 'kachuful')),
  scheduled_for timestamptz not null,
  note text check (note is null or char_length(note) <= 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists family_group_game_nights_group_idx
  on public.family_group_game_nights (group_id, scheduled_for);

-- ---------------------------------------------------------------------------
-- RLS: read only game nights for families you belong to. No client write
-- policies — the RPCs below own every mutation.
-- ---------------------------------------------------------------------------
alter table public.family_group_game_nights enable row level security;

create policy "family_game_nights_select_member"
  on public.family_group_game_nights for select
  using (public.is_family_group_member(group_id, auth.uid()));

grant select on public.family_group_game_nights to authenticated;
grant all on public.family_group_game_nights to service_role;

-- ---------------------------------------------------------------------------
-- schedule_family_game_night — a member proposes a date/time (and optionally a
-- game and a short note). Returns the created row.
-- ---------------------------------------------------------------------------
create or replace function public.schedule_family_game_night(
  p_group_id uuid,
  p_scheduled_for timestamptz,
  p_game_key text default null,
  p_note text default null
)
  returns public.family_group_game_nights
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := public.assert_family_group_member(p_group_id);
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_row public.family_group_game_nights;
begin
  if p_scheduled_for is null then
    raise exception 'a game-night time is required' using errcode = '22023';
  end if;
  if p_game_key is not null
     and p_game_key not in ('gadha_chor', 'lal_satti', 'jhabbu', 'kachuful') then
    raise exception 'unsupported game' using errcode = '22023';
  end if;
  if v_note is not null and char_length(v_note) > 200 then
    raise exception 'that note is too long' using errcode = '22023';
  end if;

  insert into public.family_group_game_nights (group_id, game_key, scheduled_for, note, created_by)
  values (p_group_id, p_game_key, p_scheduled_for, v_note, v_uid)
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_family_game_night — any member of the night's family may cancel it.
-- Membership is re-derived from the night's own group, so a caller can never
-- cancel a plan for a family they do not belong to.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_family_game_night(p_night_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_group_id uuid;
begin
  select group_id into v_group_id
  from public.family_group_game_nights
  where id = p_night_id;

  if v_group_id is null then
    -- Nothing to cancel (already gone, or never existed). Idempotent no-op.
    return;
  end if;

  perform public.assert_family_group_member(v_group_id);

  delete from public.family_group_game_nights where id = p_night_id;
end;
$$;

revoke all on function public.schedule_family_game_night(uuid, timestamptz, text, text) from public;
revoke all on function public.cancel_family_game_night(uuid) from public;

grant execute on function public.schedule_family_game_night(uuid, timestamptz, text, text)
  to authenticated, service_role;
grant execute on function public.cancel_family_game_night(uuid) to authenticated, service_role;
