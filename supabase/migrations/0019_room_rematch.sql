-- Rematch: return a finished room to the lobby so the family can deal again.
--
-- When a hand ends the room sits at status 'complete' with everyone still
-- seated. A rematch is not a new room — it is the same table playing another
-- hand — so rather than tearing anything down we simply flip the room back to
-- 'lobby'. The host then starts the next hand through the existing start flow,
-- which inserts a fresh games row; fetchLatestGame always reads the newest, so
-- the completed game is left untouched as history.
--
-- Seats (and their ready flags) are deliberately preserved: they were all ready
-- to have started the game that just ended, so returning to the lobby lets the
-- host re-deal immediately without every player re-confirming. Anyone who wants
-- out simply leaves from the lobby as usual.
--
-- Host-only, stamped by auth.uid() (defense in depth behind the host-only UI).
-- Idempotent: calling it on a room already in the lobby is a no-op, so a double
-- tap or a retry after a dropped response cannot error.

create or replace function public.rematch_room(p_room_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'room not found' using errcode = 'P0002';
  end if;
  if v_room.host_id <> v_uid then
    raise exception 'only the host may start a rematch' using errcode = '42501';
  end if;

  -- Already back in the lobby: nothing to do (idempotent).
  if v_room.status = 'lobby' then
    return;
  end if;
  -- A rematch only makes sense once the previous hand has finished.
  if v_room.status <> 'complete' then
    raise exception 'room is not finished' using errcode = '55000';
  end if;

  update public.rooms
    set status = 'lobby', updated_at = now()
    where id = p_room_id;
end;
$$;

revoke all on function public.rematch_room(uuid) from public;
grant execute on function public.rematch_room(uuid) to authenticated, service_role;
