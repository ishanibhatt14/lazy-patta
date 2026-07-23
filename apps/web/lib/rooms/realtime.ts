import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Realtime subscriptions for live-play surfaces.
 *
 * The lobby and game board are correct with polling alone, but polling adds
 * seconds of lag to a family match. These helpers open a Supabase Realtime
 * channel and fire a caller-supplied callback whenever a watched row changes,
 * so the UI can refetch immediately instead of waiting for the next poll tick.
 *
 * Two properties make this safe to use even for private hands:
 *   - Realtime `postgres_changes` runs the table's RLS policies against every
 *     change, so a subscriber is only notified about rows it is entitled to
 *     read. A player subscribed to `game_private_hands` is pushed changes to
 *     their own hand and never anyone else's.
 *   - The callback carries no row payload here; it is a bare "something moved,
 *     go refetch" signal. The authoritative read still goes through the same
 *     RLS-scoped client, so realtime can only ever *accelerate* a fetch the
 *     caller was already allowed to make — never widen what it can see.
 *
 * Callers keep their existing interval poll as a slower backstop, so a dropped
 * websocket or an environment without Realtime enabled degrades to today's
 * behaviour rather than a stall.
 */

/** A single table+filter to watch on a channel. */
export interface ChangeWatch {
  readonly table: string;
  /**
   * A Realtime row filter, e.g. `id=eq.<uuid>` or `room_id=eq.<uuid>`. Applied
   * server-side in addition to RLS, so an unfiltered flood never reaches the
   * client. Omit to watch every (RLS-visible) row in the table.
   */
  readonly filter?: string;
}

/** Tear down a subscription. Safe to call once; further calls are no-ops. */
export type Unsubscribe = () => void;

/**
 * Open a channel that invokes `onChange` on any insert/update/delete to any of
 * the `watches`. Returns an unsubscribe that removes the channel. The callback
 * is intentionally payload-free: treat it as an invalidation signal and refetch
 * through the normal RLS-scoped path.
 */
export function subscribeToChanges(
  client: SupabaseClient,
  channelName: string,
  watches: readonly ChangeWatch[],
  onChange: () => void,
): Unsubscribe {
  const channel = client.channel(channelName);

  for (const watch of watches) {
    channel.on(
      // The realtime-js types model this as a string-literal overload; the
      // config object is validated at runtime by the server binding.
      'postgres_changes' as never,
      {
        event: '*',
        schema: 'public',
        table: watch.table,
        ...(watch.filter ? { filter: watch.filter } : {}),
      },
      () => onChange(),
    );
  }

  channel.subscribe();

  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    void client.removeChannel(channel);
  };
}

/**
 * Watch a room's lobby state: the room row itself (status, host, game key) and
 * its seats (occupancy, ready flags). Fires `onChange` when a seat joins/leaves,
 * toggles ready, or the host starts the game.
 */
export function subscribeToRoom(
  client: SupabaseClient,
  roomId: string,
  onChange: () => void,
): Unsubscribe {
  return subscribeToChanges(
    client,
    `room:${roomId}`,
    [
      { table: 'rooms', filter: `id=eq.${roomId}` },
      { table: 'room_seats', filter: `room_id=eq.${roomId}` },
    ],
    onChange,
  );
}

/**
 * Watch a live game: the room's game row (new deal, every committed action bumps
 * its version, completion) and the viewer's own private hand. RLS keeps the hand
 * stream scoped to `userId`, so no other player's cards are ever streamed here.
 */
export function subscribeToGame(
  client: SupabaseClient,
  roomId: string,
  userId: string,
  onChange: () => void,
): Unsubscribe {
  return subscribeToChanges(
    client,
    `game:${roomId}:${userId}`,
    [
      { table: 'games', filter: `room_id=eq.${roomId}` },
      { table: 'game_private_hands', filter: `user_id=eq.${userId}` },
    ],
    onChange,
  );
}
