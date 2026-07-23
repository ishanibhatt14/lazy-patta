-- Seat presence + reconnect grace for live rooms.
--
-- A family match should survive a phone locking, a tunnel, or a flaky café
-- Wi-Fi hiccup without ejecting the player. We track a lightweight liveness
-- signal per seat: each connected client calls heartbeat_seat() on a short
-- interval, stamping last_seen_at. Every other member reads that timestamp
-- (over the same Realtime stream added in 0016) and classifies the seat as
-- present, briefly reconnecting (within the grace window), or gone — so the UI
-- can show a calm "reconnecting…" note instead of pretending the player left.
--
-- The grace policy itself lives in the client (see lib/rooms/presence.ts): the
-- server only records the raw timestamp and never mutates seats on a missed
-- heartbeat, so a reconnect is instantaneous (the next heartbeat simply refreshes
-- the stamp) and no background job is required.

alter table public.room_seats
  add column if not exists last_seen_at timestamptz not null default now();

-- heartbeat_seat: the caller refreshes their own seat's liveness stamp. Scoped
-- to the caller via auth.uid(), so one player can never forge another's presence.
create or replace function public.heartbeat_seat(p_room_id uuid)
  returns timestamptz
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  update public.room_seats
    set last_seen_at = v_now
    where room_id = p_room_id and user_id = v_uid;
  if not found then
    raise exception 'not seated in this room' using errcode = '42501';
  end if;
  return v_now;
end;
$$;

revoke all on function public.heartbeat_seat(uuid) from public;
grant execute on function public.heartbeat_seat(uuid) to authenticated, service_role;
