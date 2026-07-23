'use client';

import type { Locale } from '@lazy-patta/localization';
import { useEffect, useState, type ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import { HEARTBEAT_MS, seatPresence } from '../../lib/rooms/presence';
import type { RoomSeat } from '../../lib/rooms/rooms-client';

/**
 * A calm, live status note for any human seat that has gone briefly quiet — a
 * locked phone or a tunnel — while still inside the reconnect grace window. It
 * keeps the family reassured that the player is coming back rather than
 * vanishing. Renders nothing when everyone is present. Seats past the grace
 * window (classified `gone`) are intentionally not announced here: this banner
 * is about "hang on, they're reconnecting", not a departure notice.
 */
export function ReconnectBanner({
  seats,
  userId,
  locale,
}: {
  readonly seats: readonly RoomSeat[];
  readonly userId: string;
  readonly locale: Locale;
}): ReactElement | null {
  // Advance a local clock so presence re-evaluates as heartbeats age, even with
  // no new row data arriving. Half the heartbeat cadence keeps it responsive
  // without churning renders.
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), Math.max(1_000, HEARTBEAT_MS / 2));
    return () => clearInterval(id);
  }, []);

  const t = createTranslator(locale);

  const reconnecting = seats.filter(
    (seat) => seat.occupant === 'human' && seatPresence(seat.last_seen_at, nowMs) === 'reconnecting',
  );
  if (reconnecting.length === 0) return null;

  const selfReconnecting = reconnecting.some((seat) => seat.user_id === userId);
  const message = selfReconnecting
    ? t.t('rooms.reconnectingSelf')
    : t.format('rooms.reconnectingOthers', {
        names: reconnecting
          .map((seat) => seat.display_name ?? t.t('rooms.seatPlayer'))
          .join(', '),
      });

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 rounded-md bg-brand-accent/15 px-3 py-2 text-center text-sm font-semibold text-action-primary"
    >
      <span
        aria-hidden
        className="h-2 w-2 animate-pulse rounded-full bg-brand-accent"
      />
      {message}
    </div>
  );
}
