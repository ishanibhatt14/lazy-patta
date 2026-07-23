-- Persist a room's chosen house-rule preset so a private table opens with the
-- host's selected regional variant. The preset id is a real engine rule-pack id
-- (see packages/game-contracts house-rules registry); the room's authority
-- (apps/web/app/api/rooms/[roomId]/start) resolves it to the concrete rule pack
-- when it deals. NULL means "use the game's default preset".
--
-- The set of valid preset ids is game-specific, so the check constraint pairs
-- each id with its game_key. This keeps a Lal Satti room from ever storing a
-- Jhabbu preset. create_room validates the same pairing before insert so the
-- caller gets a clean error rather than a raw constraint violation.

alter table public.rooms
  add column if not exists ruleset_preset text;

alter table public.rooms drop constraint if exists rooms_ruleset_preset_check;
alter table public.rooms
  add constraint rooms_ruleset_preset_check check (
    ruleset_preset is null
    or (game_key = 'gadha_chor' and ruleset_preset in ('classic-gulam-chor'))
    or (game_key = 'lal_satti'
        and ruleset_preset in ('lal-satti-classic-seven-of-hearts', 'lal-satti-all-sevens-open'))
    or (game_key = 'jhabbu' and ruleset_preset in ('gujarati-family-v1', 'classic-bhabho-v1'))
    or (game_key = 'kachuful' and ruleset_preset in ('family-descending-v1'))
  );

-- Replace create_room with a variant that accepts the optional preset. The old
-- four-argument overload is dropped so the five-argument version (preset
-- defaulted to NULL) is the single, unambiguous entry point — same reasoning as
-- migration 0014.
drop function if exists public.create_room(smallint, text, text, text);

create or replace function public.create_room(
  p_max_seats smallint default 6,
  p_locale text default 'en',
  p_display_name text default null,
  p_game_key text default 'gadha_chor',
  p_ruleset_preset text default null
)
  returns public.rooms
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms;
  v_code text;
  v_name text := left(coalesce(nullif(regexp_replace(trim(p_display_name), '\s+', ' ', 'g'), ''), 'Host'), 40);
  v_max_allowed smallint;
  v_preset text := nullif(trim(p_ruleset_preset), '');
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_locale not in ('en', 'gu', 'hi') then
    raise exception 'unsupported locale' using errcode = '22023';
  end if;
  if p_game_key not in ('gadha_chor', 'lal_satti', 'jhabbu', 'kachuful') then
    raise exception 'unsupported game' using errcode = '22023';
  end if;

  -- A supplied preset must belong to the room's game (NULL = game default).
  if v_preset is not null and not (
    (p_game_key = 'gadha_chor' and v_preset in ('classic-gulam-chor'))
    or (p_game_key = 'lal_satti'
        and v_preset in ('lal-satti-classic-seven-of-hearts', 'lal-satti-all-sevens-open'))
    or (p_game_key = 'jhabbu' and v_preset in ('gujarati-family-v1', 'classic-bhabho-v1'))
    or (p_game_key = 'kachuful' and v_preset in ('family-descending-v1'))
  ) then
    raise exception 'unsupported house-rule preset for game' using errcode = '22023';
  end if;

  v_max_allowed := case when p_game_key = 'kachuful' then 7 else 6 end;
  if p_max_seats is null or p_max_seats < 2 or p_max_seats > v_max_allowed then
    raise exception 'max_seats out of range for game' using errcode = '22023';
  end if;

  v_code := public.allocate_room_code();

  insert into public.rooms (code, host_id, max_seats, locale, game_key, ruleset_preset)
  values (v_code, v_uid, p_max_seats, p_locale, p_game_key, v_preset)
  returning * into v_room;

  insert into public.room_seats (room_id, seat_index, occupant, user_id, display_name)
  values (v_room.id, 0, 'human', v_uid, v_name);

  return v_room;
exception
  when unique_violation then
    raise exception 'could not allocate a unique room code' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_room(smallint, text, text, text, text) from public;
grant execute on function public.create_room(smallint, text, text, text, text)
  to authenticated, service_role;
