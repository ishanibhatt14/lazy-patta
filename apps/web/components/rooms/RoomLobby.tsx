'use client';

import { DEFAULT_LOCALE } from '@lazy-patta/localization';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactElement } from 'react';

import { useAuth } from '../../lib/auth/auth-context';
import { createTranslator } from '../../lib/i18n';
import {
  addBotSeat,
  fetchRoomByCode,
  joinRoomByCode,
  leaveRoom,
  setSeatReady,
  type RoomWithSeats,
} from '../../lib/rooms/rooms-client';
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client';
import { Button } from '../Button';
import { LoginPanel } from '../auth/LoginPanel';

/**
 * Room lobby. Joining is idempotent, so landing here (via create, join, or a
 * shared code link) simply ensures a seat and then reflects the room. Seat state
 * is polled on an interval — live realtime updates are a deferred follow-up.
 */

const t = createTranslator(DEFAULT_LOCALE);
const POLL_MS = 3000;

function messageFor(error: unknown): string {
  return error instanceof Error && error.message ? error.message : t.t('rooms.errorGeneric');
}

function seatLabel(occupant: string, displayName: string | null): string {
  if (occupant === 'bot') return displayName ?? t.t('rooms.seatBot');
  if (occupant === 'human') return displayName ?? t.t('rooms.seatPlayer');
  return t.t('rooms.seatEmpty');
}

export function RoomLobby({ code }: { code: string }): ReactElement {
  const { state, configured } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<RoomWithSeats | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);

  const userId = state.status === 'signed-in' ? state.session.user.userId : undefined;
  const displayName = state.status === 'signed-in' ? state.session.user.displayName : undefined;

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const next = await fetchRoomByCode(getSupabaseBrowserClient(), code);
      setData(next);
    } catch (caught) {
      setError(messageFor(caught));
    }
  }, [code]);

  // Ensure a seat once signed in (idempotent), then poll for seat changes.
  useEffect(() => {
    if (!configured || !userId || joined) return;
    let cancelled = false;
    void (async () => {
      try {
        await joinRoomByCode(getSupabaseBrowserClient(), code, displayName);
        if (!cancelled) {
          setJoined(true);
          await refresh();
        }
      } catch (caught) {
        if (!cancelled) setError(messageFor(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, userId, joined, code, displayName, refresh]);

  useEffect(() => {
    if (!joined) return;
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [joined, refresh]);

  if (!configured) {
    return (
      <p className="rounded-md bg-surface-primary px-4 py-3 text-sm text-text-primary shadow-sm">
        {t.t('auth.notConfigured')}
      </p>
    );
  }

  if (state.status !== 'signed-in') {
    return <LoginPanel />;
  }

  const room = data?.room;
  const seats = data?.seats ?? [];
  const isHost = room ? room.host_id === userId : false;
  const mySeat = seats.find((s) => s.user_id === userId);
  const humanCount = seats.filter((s) => s.occupant !== 'empty').length;
  const isFull = room ? humanCount >= room.max_seats : false;

  const withBusy = async (fn: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
      await refresh();
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <header className="flex flex-col items-center gap-1">
        <span className="text-sm text-text-primary">{t.t('rooms.roomCodeLabel')}</span>
        <span className="text-3xl font-bold tracking-[0.3em] text-action-primary">{code}</span>
        <span className="text-xs text-text-primary">{t.t('rooms.shareHint')}</span>
      </header>

      <ul className="flex flex-col gap-2">
        {seats.map((seat) => {
          const isYou = seat.user_id === userId;
          return (
            <li
              key={seat.id}
              className="flex items-center justify-between gap-3 rounded-md bg-surface-primary px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${seat.is_ready ? 'bg-brand-accent' : 'bg-action-primary/30'}`}
                  aria-hidden
                />
                <span className="text-sm font-medium text-text-primary">
                  {seatLabel(seat.occupant, seat.display_name)}
                  {isYou ? ` (${t.t('rooms.you')})` : ''}
                  {room && seat.user_id === room.host_id ? ` · ${t.t('rooms.host')}` : ''}
                </span>
              </div>
              <span className="text-xs text-text-primary">
                {seat.is_ready ? t.t('rooms.ready') : t.t('rooms.notReady')}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2">
        {mySeat ? (
          <Button
            disabled={busy}
            onClick={() =>
              withBusy(() =>
                setSeatReady(getSupabaseBrowserClient(), mySeat.room_id, !mySeat.is_ready),
              )
            }
          >
            {mySeat.is_ready ? t.t('rooms.markNotReady') : t.t('rooms.markReady')}
          </Button>
        ) : null}

        {isHost && room ? (
          <Button
            variant="secondary"
            disabled={busy || isFull}
            onClick={() =>
              withBusy(async () => {
                await addBotSeat(getSupabaseBrowserClient(), room.id);
              })
            }
          >
            {t.t('rooms.addBot')}
          </Button>
        ) : null}

        {room ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() =>
              withBusy(async () => {
                await leaveRoom(getSupabaseBrowserClient(), room.id);
                router.push('/play/online');
              })
            }
          >
            {t.t('rooms.leave')}
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-center text-sm text-status-error">{error}</p> : null}
    </div>
  );
}
