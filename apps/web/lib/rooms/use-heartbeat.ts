'use client';

import { useEffect } from 'react';

import { getSupabaseBrowserClient } from '../supabase/browser-client';

import { HEARTBEAT_MS } from './presence';
import { heartbeatSeat } from './rooms-client';

/**
 * Keep the caller's own seat marked present while they are in a room.
 *
 * Fires a heartbeat immediately, then every {@link HEARTBEAT_MS}, and again the
 * moment the tab becomes visible again — so a phone that was locked or a tab
 * that was backgrounded reconnects on the next glance rather than waiting out a
 * full interval. Heartbeat failures are swallowed: a missed beat on a flaky link
 * is expected and is absorbed by the presence grace window, never surfaced as an
 * error to the player.
 */
export function useSeatHeartbeat(roomId: string | undefined, active: boolean): void {
  useEffect(() => {
    if (!active || !roomId) return;

    const beat = (): void => {
      void heartbeatSeat(getSupabaseBrowserClient(), roomId).catch(() => {
        // Intentionally ignored — the grace window handles transient failures.
      });
    };

    beat();
    const id = setInterval(beat, HEARTBEAT_MS);

    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') beat();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [roomId, active]);
}
