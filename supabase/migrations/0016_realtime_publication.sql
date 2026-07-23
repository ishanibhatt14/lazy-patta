-- Enable Postgres Changes realtime for the live-play tables.
--
-- Up to now the room lobby and game board have learned about state changes only
-- by polling on a timer. That is fine as a backstop but adds seconds of lag to a
-- family match. Supabase's Realtime "postgres_changes" feature streams row
-- change events over a websocket and — crucially — enforces the very same RLS
-- policies the REST reads already respect, so a subscriber is only ever notified
-- about rows it is entitled to read. That makes it safe to stream even
-- `game_private_hands`: a player is pushed changes to *their own* hand row and
-- never anyone else's, because the own-row RLS policy filters the stream too.
--
-- Two things are required per table:
--   1. Membership in the `supabase_realtime` publication, so the WAL decoder
--      emits its changes to the Realtime service.
--   2. REPLICA IDENTITY FULL, so UPDATE/DELETE events carry the full previous
--      row. Without it the old-record payload only contains the primary key,
--      which breaks RLS evaluation for the "old" image and can silently drop
--      events for subscribers whose visibility depends on non-PK columns
--      (e.g. room membership on room_seats).
--
-- Idempotent: re-running skips tables already in the publication, so this is
-- safe on a database where the publication was seeded by an earlier
-- environment. The publication itself is created by Supabase by default; guard
-- for the rare self-hosted case where it is absent.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

do $$
declare
  v_table text;
  v_tables constant text[] := array[
    'rooms',
    'room_seats',
    'games',
    'game_events',
    'game_private_hands'
  ];
begin
  foreach v_table in array v_tables loop
    -- Full previous-row image for correct UPDATE/DELETE + RLS on the old record.
    execute format('alter table public.%I replica identity full', v_table);

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end
$$;
