-- Harden room-code allocation and allow Kachuful's seven-seat family table.
-- Codes use crypto-backed bytes, avoid ambiguous characters, and retry on
-- active-code collisions inside the existing SECURITY DEFINER create_room RPC.

alter table public.rooms drop constraint if exists rooms_max_seats_check;
alter table public.rooms
  add constraint rooms_max_seats_check check (max_seats between 2 and 7);

alter table public.room_seats drop constraint if exists room_seats_seat_index_check;
alter table public.room_seats
  add constraint room_seats_seat_index_check check (seat_index between 0 and 6);

create or replace function public.allocate_room_code()
  returns text
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_byte int;
  v_try int := 0;
  v_pos int;
begin
  loop
    v_try := v_try + 1;
    v_code := '';

    for v_pos in 1..6 loop
      v_byte := get_byte(gen_random_bytes(1), 0);
      v_code := v_code || substr(v_alphabet, (v_byte % length(v_alphabet)) + 1, 1);
    end loop;

    if not exists (
      select 1
      from public.rooms
      where code = v_code
        and status in ('lobby', 'in_progress')
    ) then
      return v_code;
    end if;

    if v_try >= 20 then
      raise exception 'could not allocate a unique room code' using errcode = 'P0001';
    end if;
  end loop;
end;
$$;

create or replace function public.create_room(
  p_max_seats smallint default 6,
  p_locale text default 'en',
  p_display_name text default null,
  p_game_key text default 'gadha_chor'
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

  v_max_allowed := case when p_game_key = 'kachuful' then 7 else 6 end;
  if p_max_seats is null or p_max_seats < 2 or p_max_seats > v_max_allowed then
    raise exception 'max_seats out of range for game' using errcode = '22023';
  end if;

  v_code := public.allocate_room_code();

  insert into public.rooms (code, host_id, max_seats, locale, game_key)
  values (v_code, v_uid, p_max_seats, p_locale, p_game_key)
  returning * into v_room;

  insert into public.room_seats (room_id, seat_index, occupant, user_id, display_name)
  values (v_room.id, 0, 'human', v_uid, v_name);

  return v_room;
exception
  when unique_violation then
    raise exception 'could not allocate a unique room code' using errcode = 'P0001';
end;
$$;

revoke all on function public.allocate_room_code() from public;
revoke all on function public.create_room(smallint, text, text, text) from public;

grant execute on function public.create_room(smallint, text, text, text) to authenticated, service_role;
