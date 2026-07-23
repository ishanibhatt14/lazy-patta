/**
 * Seat-presence policy for live rooms.
 *
 * The server records a raw `last_seen_at` per seat (see migration 0017); all the
 * judgement about whether a player is present, briefly reconnecting, or gone
 * lives here so it is easy to test and tune without a migration. Connected
 * clients heartbeat every {@link HEARTBEAT_MS}; a seat unseen for longer than
 * the grace window is shown as reconnecting, and only after a longer silence is
 * it treated as gone. The generous windows tolerate a locked phone or a brief
 * tunnel without alarming the table.
 */

/** How often a connected client refreshes its own seat's presence stamp. */
export const HEARTBEAT_MS = 8_000;

/**
 * A seat seen within this window is present. Set to just over two heartbeats so
 * a single dropped ping never flickers a "reconnecting" note.
 */
export const PRESENCE_GRACE_MS = 20_000;

/** Past this silence a seat is treated as gone rather than merely reconnecting. */
export const PRESENCE_ABANDON_MS = 60_000;

export type SeatPresence = 'present' | 'reconnecting' | 'gone';

/**
 * Classify a seat from its last-seen timestamp against the current time.
 *
 * A missing or unparseable timestamp is treated as `present`: absence of a
 * signal must never manufacture a scary "disconnected" state (e.g. an older row
 * before this column existed, or a seat that has not heartbeat yet).
 */
export function seatPresence(
  lastSeenAt: string | null | undefined,
  nowMs: number,
  graceMs: number = PRESENCE_GRACE_MS,
  abandonMs: number = PRESENCE_ABANDON_MS,
): SeatPresence {
  if (!lastSeenAt) return 'present';
  const seenMs = Date.parse(lastSeenAt);
  if (Number.isNaN(seenMs)) return 'present';

  const age = nowMs - seenMs;
  if (age <= graceMs) return 'present';
  if (age <= abandonMs) return 'reconnecting';
  return 'gone';
}
