-- Room lifecycle RPCs — the atomic authority boundary for lobby operations.
--
-- Clients never write room/seat rows directly (see 0004: SELECT-only grants).
-- Every mutation goes through one of these SECURITY DEFINER functions, which
-- run as the migration owner (bypassing RLS) but still read the CALLER's
-- identity via auth.uid() (PostgREST sets the JWT claims GUC per request, so
-- auth.uid() is the caller even inside a definer function). Each function
-- validates auth, capacity, and host rights, and takes a row lock where two
-- callers could race for the same seat.

-- create_room: allocate a room with a unique 6-char code and seat the host at 0.
create or replace function public.create_room(
  p_max_seats smallint default 6,
  p_locale text default 'en',
  p_display_name text default null
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

  -- Unique 6-char [A-F0-9] code (md5 hex, uppercased); retry on collision.
  loop
    v_try := v_try + 1;
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    begin
      insert into public.rooms (code, host_id, max_seats, locale)
      values (v_code, v_uid, p_max_seats, p_locale)
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

-- join_room_by_code: claim the lowest free seat in a lobby. Idempotent — if the
-- caller already holds a seat, the room is returned unchanged.
create or replace function public.join_room_by_code(
  p_code text,
  p_display_name text default null
)
  returns public.rooms
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms;
  v_name text := coalesce(nullif(trim(p_display_name), ''), 'Player');
  v_seat_index smallint;
  v_occupied int;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_room from public.rooms where code = upper(trim(p_code)) for update;
  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'room is not accepting players' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.room_seats where room_id = v_room.id and user_id = v_uid
  ) then
    return v_room;
  end if;

  select count(*) into v_occupied
  from public.room_seats
  where room_id = v_room.id and occupant <> 'empty';
  if v_occupied >= v_room.max_seats then
    raise exception 'room is full' using errcode = '22023';
  end if;

  select gs.i into v_seat_index
  from generate_series(0, v_room.max_seats - 1) as gs(i)
  where not exists (
    select 1 from public.room_seats s
    where s.room_id = v_room.id and s.seat_index = gs.i and s.occupant <> 'empty'
  )
  order by gs.i
  limit 1;

  insert into public.room_seats (room_id, seat_index, occupant, user_id, display_name)
  values (v_room.id, v_seat_index, 'human', v_uid, v_name)
  on conflict (room_id, seat_index)
  do update set occupant = 'human', user_id = v_uid, display_name = v_name,
                is_ready = false, joined_at = now();

  return v_room;
end;
$$;

-- set_seat_ready: toggle the caller's own ready state.
create or replace function public.set_seat_ready(p_room_id uuid, p_is_ready boolean)
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
  update public.room_seats set is_ready = p_is_ready
  where room_id = p_room_id and user_id = v_uid;
  if not found then
    raise exception 'not seated in this room' using errcode = '42501';
  end if;
end;
$$;

-- add_bot_seat: host-only. Fill the lowest free seat with a ready bot.
create or replace function public.add_bot_seat(p_room_id uuid, p_display_name text default 'Bot')
  returns public.room_seats
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms;
  v_seat public.room_seats;
  v_seat_index smallint;
  v_occupied int;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;
  if v_room.host_id <> v_uid then
    raise exception 'only the host may add bots' using errcode = '42501';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'room is not in lobby' using errcode = '22023';
  end if;

  select count(*) into v_occupied
  from public.room_seats
  where room_id = p_room_id and occupant <> 'empty';
  if v_occupied >= v_room.max_seats then
    raise exception 'room is full' using errcode = '22023';
  end if;

  select gs.i into v_seat_index
  from generate_series(0, v_room.max_seats - 1) as gs(i)
  where not exists (
    select 1 from public.room_seats s
    where s.room_id = p_room_id and s.seat_index = gs.i and s.occupant <> 'empty'
  )
  order by gs.i
  limit 1;

  insert into public.room_seats (room_id, seat_index, occupant, display_name, is_ready)
  values (p_room_id, v_seat_index, 'bot', coalesce(nullif(trim(p_display_name), ''), 'Bot'), true)
  on conflict (room_id, seat_index)
  do update set occupant = 'bot', user_id = null,
                display_name = excluded.display_name, is_ready = true
  returning * into v_seat;

  return v_seat;
end;
$$;

-- remove_seat: host-only. Free a bot or kick a guest seat. The host's own seat
-- cannot be removed this way (they leave via leave_room).
create or replace function public.remove_seat(p_room_id uuid, p_seat_index smallint)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;
  if v_room.host_id <> v_uid then
    raise exception 'only the host may remove seats' using errcode = '42501';
  end if;

  delete from public.room_seats
  where room_id = p_room_id
    and seat_index = p_seat_index
    and not (occupant = 'human' and user_id = v_room.host_id);
end;
$$;

-- leave_room: give up the caller's seat. If the host leaves, promote the next
-- human by seat order, or abandon the room when no humans remain.
create or replace function public.leave_room(p_room_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms;
  v_next uuid;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then
    return;
  end if;

  delete from public.room_seats where room_id = p_room_id and user_id = v_uid;

  if v_room.host_id = v_uid then
    select user_id into v_next
    from public.room_seats
    where room_id = p_room_id and occupant = 'human' and user_id is not null
    order by seat_index
    limit 1;

    if v_next is null then
      update public.rooms set status = 'abandoned', updated_at = now() where id = p_room_id;
    else
      update public.rooms set host_id = v_next, updated_at = now() where id = p_room_id;
    end if;
  end if;
end;
$$;

-- Only signed-in users may call these; guests (anon) get nothing.
revoke all on function public.create_room(smallint, text, text) from public;
revoke all on function public.join_room_by_code(text, text) from public;
revoke all on function public.set_seat_ready(uuid, boolean) from public;
revoke all on function public.add_bot_seat(uuid, text) from public;
revoke all on function public.remove_seat(uuid, smallint) from public;
revoke all on function public.leave_room(uuid) from public;

grant execute on function public.create_room(smallint, text, text) to authenticated, service_role;
grant execute on function public.join_room_by_code(text, text) to authenticated, service_role;
grant execute on function public.set_seat_ready(uuid, boolean) to authenticated, service_role;
grant execute on function public.add_bot_seat(uuid, text) to authenticated, service_role;
grant execute on function public.remove_seat(uuid, smallint) to authenticated, service_role;
grant execute on function public.leave_room(uuid) to authenticated, service_role;
