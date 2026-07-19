-- Add Kachuful (Judgement) as a fourth online game key. Mirrors migration 0010:
-- rooms and games may now host 'kachuful' alongside 'gadha_chor', 'lal_satti',
-- and 'jhabbu', and create_room() accepts it. The server-authoritative
-- room/persistence boundary is unchanged — only the allowed set of game keys
-- widens.

alter table public.rooms
  drop constraint if exists rooms_game_key_check;
alter table public.rooms
  add constraint rooms_game_key_check
    check (game_key in ('gadha_chor', 'lal_satti', 'jhabbu', 'kachuful'));

alter table public.games
  drop constraint if exists games_game_key_check;
alter table public.games
  add constraint games_game_key_check
    check (game_key in ('gadha_chor', 'lal_satti', 'jhabbu', 'kachuful'));

-- Re-create create_room() with the widened game-key validation. Body is
-- otherwise identical to migration 0010.
create or replace function public.create_room(
  p_max_seats smallint,
  p_locale text,
  p_display_name text,
  p_game_key text
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
  v_name text := coalesce(nullif(trim(p_display_name), ''), 'Host');
  v_try int := 0;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_max_seats is null or p_max_seats < 2 or p_max_seats > 6 then
    raise exception 'max_seats must be between 2 and 6' using errcode = '22023';
  end if;
  if p_locale not in ('en', 'gu', 'hi') then
    raise exception 'unsupported locale' using errcode = '22023';
  end if;
  if p_game_key not in ('gadha_chor', 'lal_satti', 'jhabbu', 'kachuful') then
    raise exception 'unsupported game' using errcode = '22023';
  end if;

  loop
    v_try := v_try + 1;
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    begin
      insert into public.rooms (code, host_id, max_seats, locale, game_key)
      values (v_code, v_uid, p_max_seats, p_locale, p_game_key)
      returning * into v_room;
      exit;
    exception when unique_violation then
      if v_try >= 10 then
        raise exception 'could not allocate a unique room code';
      end if;
    end;
  end loop;

  insert into public.room_seats (room_id, seat_index, occupant, user_id, display_name)
  values (v_room.id, 0, 'human', v_uid, v_name);

  return v_room;
end;
$$;

revoke all on function public.create_room(smallint, text, text, text) from public;
grant execute on function public.create_room(smallint, text, text, text) to authenticated, service_role;
