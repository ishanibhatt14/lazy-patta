-- Online rooms can now host more than one game while preserving the existing
-- server-authoritative room/persistence boundary.

alter table public.rooms
  add column if not exists game_key text not null default 'gadha_chor'
    check (game_key in ('gadha_chor', 'lal_satti'));

alter table public.games
  add column if not exists game_key text not null default 'gadha_chor'
    check (game_key in ('gadha_chor', 'lal_satti'));

-- New clients pass an explicit game key. The original three-argument
-- create_room remains available for older callers and will use the column
-- default ('gadha_chor').
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
  if p_game_key not in ('gadha_chor', 'lal_satti') then
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

-- Carry the room's game key onto the game row so route handlers and clients can
-- dispatch without inspecting JSON snapshots.
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

  insert into public.games (room_id, game_key, status, state_version, public_snapshot)
  values (p_room_id, v_room.game_key, 'active', v_version, p_public_snapshot)
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

revoke all on function public.create_room(smallint, text, text, text) from public;
revoke all on function public.start_game(uuid, jsonb, jsonb, jsonb, jsonb) from public;

grant execute on function public.create_room(smallint, text, text, text) to authenticated, service_role;
grant execute on function public.start_game(uuid, jsonb, jsonb, jsonb, jsonb) to service_role;
