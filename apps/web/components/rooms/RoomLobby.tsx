'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';

import { timeoutState, type AsyncViewState } from '../../lib/async-view-state';
import { useAuth } from '../../lib/auth/auth-context';
import { trackGrowthEvent } from '../../lib/growth/analytics';
import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import { startGame } from '../../lib/online-game/games-client';
import { subscribeToRoom } from '../../lib/rooms/realtime';
import { rememberRecentRoom } from '../../lib/rooms/recent-rooms';
import { classifyRoomError, type ClassifiedRoomError } from '../../lib/rooms/room-error';
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

import { GameBoard } from './GameBoard';
import { RoomSharePanel } from './RoomSharePanel';

/**
 * Room lobby. Joining is idempotent, so landing here (via create, join, or a
 * shared code link) simply ensures a seat and then reflects the room. Seat state
 * arrives over a Supabase Realtime subscription (see subscribeToRoom); a slow
 * interval poll stays on as a backstop for a dropped socket or an environment
 * without Realtime enabled.
 */

const POLL_MS = 15000;

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function seatLabel(
  occupant: string,
  displayName: string | null,
  t: ReturnType<typeof createTranslator>,
): string {
  if (occupant === 'bot') return displayName ?? t.t('rooms.seatBot');
  if (occupant === 'human') return displayName ?? t.t('rooms.seatPlayer');
  return t.t('rooms.seatEmpty');
}

function gameLabel(gameKey: string | undefined, t: ReturnType<typeof createTranslator>): string {
  if (gameKey === 'lal_satti') return t.t('rooms.gameLalSatti');
  if (gameKey === 'jhabbu') return t.t('rooms.gameJhabbu');
  return t.t('rooms.gameGadhaChor');
}

function gameSlug(gameKey: string | undefined): 'gadha-chor' | 'lal-satti' | 'jhabbu' | 'kachuful' {
  if (gameKey === 'lal_satti') return 'lal-satti';
  if (gameKey === 'jhabbu') return 'jhabbu';
  if (gameKey === 'kachuful') return 'kachuful';
  return 'gadha-chor';
}

export function RoomLobby({ code }: { code: string }): ReactElement {
  const { state, configured } = useAuth();
  const { locale } = usePreferredLocale();
  const t = useMemo(() => createTranslator(locale), [locale]);
  const router = useRouter();
  const [data, setData] = useState<RoomWithSeats | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);
  const [initState, setInitState] = useState<AsyncViewState<RoomWithSeats>>({
    status: 'loading',
    startedAt: Date.now(),
  });
  const [initError, setInitError] = useState<ClassifiedRoomError | null>(null);
  const [slowInit, setSlowInit] = useState(false);
  // LP-113: ignore late responses. Every refresh takes a monotonic id; a slow
  // in-flight fetch that resolves after a newer one (or after unmount) is
  // discarded so it can never overwrite fresher state or a resolved error.
  const refreshRunId = useRef(0);
  useEffect(() => () => void (refreshRunId.current += 1), []);

  const userId = state.status === 'signed-in' ? state.session.user.userId : undefined;
  const displayName = state.status === 'signed-in' ? state.session.user.displayName : undefined;

  const refresh = useCallback(async (): Promise<void> => {
    const runId = (refreshRunId.current += 1);
    try {
      const next = await fetchRoomByCode(getSupabaseBrowserClient(), code);
      if (runId !== refreshRunId.current) return;
      setData(next);
      if (next) {
        rememberRecentRoom({ roomCode: code, gameSlug: gameSlug(next.room.game_key) });
        setInitState({ status: 'success', data: next });
      } else setInitState({ status: 'empty' });
    } catch (caught) {
      if (runId !== refreshRunId.current) return;
      const classified = classifyRoomError(caught);
      setInitError(classified);
      setError(t.t(classified.bodyKey));
      setInitState({ status: 'error', code: classified.code, recoverable: classified.retryable });
    }
  }, [code, t]);

  // Ensure a seat once signed in (idempotent), then poll for seat changes.
  useEffect(() => {
    if (!configured || !userId || joined) return;
    let cancelled = false;
    setInitState({ status: 'loading', startedAt: Date.now() });
    void (async () => {
      try {
        trackGrowthEvent({ name: 'invite_opened' });
        await joinRoomByCode(getSupabaseBrowserClient(), code, displayName);
        if (!cancelled) {
          setJoined(true);
          await refresh();
          trackGrowthEvent({ name: 'room_joined', gameSlug: gameSlug(data?.room.game_key) });
        }
      } catch (caught) {
        if (!cancelled) {
          const classified = classifyRoomError(caught);
          setInitError(classified);
          setError(t.t(classified.bodyKey));
          setInitState({ status: 'error', code: classified.code, recoverable: classified.retryable });
        }
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

  // Live seat/room updates. Refetch on any change to the room or its seats so a
  // family member joining, readying up, or the host starting shows instantly —
  // the interval above stays on as a slower backstop.
  const roomId = data?.room.id;
  useEffect(() => {
    if (!joined || !roomId) return;
    return subscribeToRoom(getSupabaseBrowserClient(), roomId, () => void refresh());
  }, [joined, roomId, refresh]);

  useEffect(() => {
    if (initState.status !== 'loading') return;
    setSlowInit(false);
    const slowId = window.setTimeout(() => setSlowInit(true), 8_000);
    const timeoutId = window.setTimeout(() => setInitState(timeoutState()), 12_000);
    return () => {
      window.clearTimeout(slowId);
      window.clearTimeout(timeoutId);
    };
  }, [initState]);

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
  const occupiedSeats = seats.filter((s) => s.occupant !== 'empty');
  const humanCount = occupiedSeats.length;
  const isFull = room ? humanCount >= room.max_seats : false;
  const canStart = humanCount >= 2 && occupiedSeats.every((s) => s.is_ready);

  const withBusy = async (fn: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
      await refresh();
    } catch (caught) {
      setError(messageFor(caught, t.t('rooms.errorGeneric')));
    } finally {
      setBusy(false);
    }
  };

  if (initState.status === 'loading' && !room) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-lg bg-surface-primary p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-text-primary">{t.t('rooms.loadingRoom')}</p>
        {slowInit ? (
          <p role="status" className="text-sm text-text-primary">
            {t.t('rooms.takingLonger')}
          </p>
        ) : null}
      </div>
    );
  }

  if (initState.status === 'empty' && !room) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-surface-primary p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-text-primary">{t.t('rooms.notFoundTitle')}</h2>
        <p className="text-sm text-text-primary">{t.t('rooms.notFoundBody')}</p>
        <Button onClick={() => router.push('/mobile/rooms')}>
          {t.t('rooms.enterAnotherCode')}
        </Button>
        <Button variant="ghost" onClick={() => router.push('/mobile')}>
          {t.t('action.returnHome')}
        </Button>
      </div>
    );
  }

  if (initState.status === 'error' && !room) {
    const isTimeout = initState.code === 'room_initialization_timeout';
    const titleKey = isTimeout
      ? 'rooms.timeoutTitle'
      : (initError?.titleKey ?? 'rooms.unavailableTitle');
    const bodyKey = isTimeout
      ? 'rooms.timeoutBody'
      : (initError?.bodyKey ?? 'rooms.errorGeneric');
    // Non-retryable reasons (full, expired, missing) must not offer a
    // meaningless "Try Again" — only a fresh path forward.
    const canRetry = isTimeout || (initError?.retryable ?? true);
    return (
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-surface-primary p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-text-primary">{t.t(titleKey)}</h2>
        <p className="text-sm text-text-primary">{t.t(bodyKey)}</p>
        {canRetry ? (
          <Button
            onClick={() => {
              setError(undefined);
              setInitError(null);
              setJoined(false);
              setInitState({ status: 'loading', startedAt: Date.now() });
            }}
          >
            {t.t('action.tryAgain')}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          onClick={() => router.push('/mobile/game/gadha-chor/setup?mode=computer')}
        >
          {t.t('action.playComputer')}
        </Button>
        <Button variant="ghost" onClick={() => router.push('/mobile/rooms')}>
          {t.t('rooms.enterAnotherCode')}
        </Button>
      </div>
    );
  }

  // Once the host starts, the room leaves 'lobby' — swap the seat list for the
  // live board, which takes over the viewport as a full-screen immersive table
  // (matching the solo experience). Truth still comes from the server; the board
  // only reads + draws, and owns its own room-code header and leave control.
  if (room && room.status !== 'lobby') {
    return (
      <GameBoard
        roomId={room.id}
        seats={seats}
        userId={state.session.user.userId}
        locale={room.locale}
        code={code}
        onLeave={() =>
          withBusy(async () => {
            await leaveRoom(getSupabaseBrowserClient(), room.id);
            router.push('/play/online');
          })
        }
      />
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <header className="flex flex-col items-center gap-1">
        <span className="text-sm text-text-primary">{t.t('rooms.roomCodeLabel')}</span>
        <span className="text-3xl font-bold tracking-[0.3em] text-action-primary">{code}</span>
        <span className="text-xs font-semibold text-brand-accent">
          {gameLabel(room?.game_key, t)}
        </span>
        <span className="text-xs text-text-primary">{t.t('rooms.shareHint')}</span>
      </header>

      <RoomSharePanel
        code={code}
        locale={locale}
        gameName={gameLabel(room?.game_key, t)}
        inviterName={displayName}
        occupiedSeats={humanCount}
        maxPlayers={room?.max_seats}
      />

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
                  {seatLabel(seat.occupant, seat.display_name, t)}
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

        {isHost && room ? (
          <Button
            disabled={busy || !canStart}
            onClick={() =>
              withBusy(async () => {
                trackGrowthEvent({
                  name: 'game_start_clicked',
                  gameSlug: gameSlug(room.game_key),
                  playerCount: humanCount,
                });
                await startGame(getSupabaseBrowserClient(), room.id);
                trackGrowthEvent({
                  name: 'game_start_succeeded',
                  gameSlug: gameSlug(room.game_key),
                  playerCount: humanCount,
                });
              })
            }
          >
            {busy ? t.t('rooms.starting') : t.t('rooms.startGame')}
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
