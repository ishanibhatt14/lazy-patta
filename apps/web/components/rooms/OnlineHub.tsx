'use client';

import type { MessageKey } from '@lazy-patta/localization';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react';

import { timeoutState, type AsyncViewState } from '../../lib/async-view-state';
import { useAuth } from '../../lib/auth/auth-context';
import { trackGrowthEvent } from '../../lib/growth/analytics';
import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import { fetchRoomServiceHealth } from '../../lib/rooms/health-client';
import { classifyRoomError } from '../../lib/rooms/room-error';
import { createRoom, joinRoomByCode, type OnlineGameKey } from '../../lib/rooms/rooms-client';
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client';
import { Button } from '../Button';
import { LoginPanel } from '../auth/LoginPanel';

/**
 * Signed-in landing for private rooms: create a fresh room or join one by code.
 * Both actions resolve to a room code and route into its lobby. Live realtime
 * play is a deferred follow-up; this slice covers auth + create/join lifecycle.
 */

function gameKeyFromSearch(value: string | null): OnlineGameKey {
  if (value === 'lal_satti') return 'lal_satti';
  if (value === 'jhabbu') return 'jhabbu';
  if (value === 'kachuful') return 'kachuful';
  return 'gadha_chor';
}

function gameKeyLabel(key: OnlineGameKey, t: ReturnType<typeof createTranslator>): string {
  if (key === 'lal_satti') return t.t('rooms.gameLalSatti');
  if (key === 'jhabbu') return t.t('rooms.gameJhabbu');
  if (key === 'kachuful') return t.t('rooms.gameKachuful');
  return t.t('rooms.gameGadhaChor');
}

function practiceHref(key: OnlineGameKey): string {
  if (key === 'lal_satti') return '/mobile/game/lal-satti/setup?mode=computer';
  if (key === 'jhabbu') return '/mobile/game/jhabbu/setup?mode=computer';
  if (key === 'kachuful') return '/mobile/game/kachuful/setup?mode=computer';
  return '/mobile/game/gadha-chor/setup?mode=computer';
}

export function OnlineHub(): ReactElement {
  const { state, configured } = useAuth();
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [gameKey, setGameKey] = useState<OnlineGameKey>(() =>
    gameKeyFromSearch(searchParams.get('game')),
  );
  const [busy, setBusy] = useState<'create' | 'join' | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [healthState, setHealthState] = useState<AsyncViewState<'ready'>>({
    status: 'loading',
    startedAt: Date.now(),
  });
  const [actionState, setActionState] = useState<AsyncViewState<'create' | 'join'>>({
    status: 'idle',
  });
  const [slowAction, setSlowAction] = useState(false);
  const actionRunId = useRef(0);
  const lobbyPath = (roomCode: string): string =>
    typeof window !== 'undefined' && window.location.pathname.startsWith('/mobile')
      ? `/mobile/rooms/${roomCode}/lobby`
      : `/play/online/${roomCode}`;

  useEffect(() => {
    const controller = new AbortController();
    setHealthState({ status: 'loading', startedAt: Date.now() });
    void fetchRoomServiceHealth(controller.signal)
      .then((health) => {
        if (controller.signal.aborted) return;
        if (!health.capabilities.createRoom || !health.capabilities.joinRoom) {
          setHealthState({
            status: 'unavailable',
            reasonKey: health.publicMessageKey ?? 'rooms.healthUnavailable',
          });
          return;
        }
        setHealthState({ status: 'success', data: 'ready' });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHealthState({ status: 'unavailable', reasonKey: 'rooms.healthUnavailable' });
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (actionState.status !== 'loading') return;
    setSlowAction(false);
    const slowId = window.setTimeout(() => setSlowAction(true), 8_000);
    const id = window.setTimeout(() => {
      setActionState(timeoutState());
      setBusy(undefined);
    }, 12_000);
    return () => {
      window.clearTimeout(slowId);
      window.clearTimeout(id);
    };
  }, [actionState]);

  const renderUnavailable = (reasonKey: MessageKey): ReactElement => (
    <div className="flex flex-col gap-3 rounded-lg bg-surface-primary p-6 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-text-primary">{t.t('rooms.unavailableTitle')}</h2>
      <p className="text-sm text-text-primary">{t.t(reasonKey)}</p>
      <Button variant="secondary" onClick={() => window.location.reload()}>
        {t.t('action.tryAgain')}
      </Button>
      <Button variant="ghost" onClick={() => router.push(practiceHref(gameKey))}>
        {t.t('action.playComputer')}
      </Button>
    </div>
  );

  if (!configured) {
    return renderUnavailable('rooms.healthUnavailable');
  }

  if (state.status !== 'signed-in') {
    return (
      <div className="flex flex-col items-center gap-4">
        <LoginPanel />
      </div>
    );
  }

  const displayName = state.session.user.displayName;

  const onCreate = async (): Promise<void> => {
    if (healthState.status === 'unavailable') return;
    const runId = (actionRunId.current += 1);
    setBusy('create');
    setError(undefined);
    setActionState({ status: 'loading', startedAt: Date.now() });
    try {
      trackGrowthEvent({ name: 'family_room_create_started', gameSlug: gameKeyToSlug(gameKey) });
      const room = await createRoom(getSupabaseBrowserClient(), { displayName, gameKey, locale });
      if (runId !== actionRunId.current) return;
      trackGrowthEvent({
        name: 'family_room_created',
        gameSlug: gameKeyToSlug(room.game_key),
        playerCapacity: room.max_seats,
      });
      setSlowAction(false);
      setActionState({ status: 'success', data: 'create' });
      router.push(lobbyPath(room.code));
    } catch (caught) {
      if (runId !== actionRunId.current) return;
      const classified = classifyRoomError(caught);
      setError(t.t(classified.bodyKey));
      setActionState({ status: 'error', code: classified.code, recoverable: classified.retryable });
      setBusy(undefined);
    }
  };

  const onJoin = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (healthState.status === 'unavailable') return;
    const runId = (actionRunId.current += 1);
    setBusy('join');
    setError(undefined);
    setActionState({ status: 'loading', startedAt: Date.now() });
    try {
      trackGrowthEvent({ name: 'room_join_started', gameSlug: gameKeyToSlug(gameKey) });
      const room = await joinRoomByCode(getSupabaseBrowserClient(), code, displayName);
      if (runId !== actionRunId.current) return;
      trackGrowthEvent({ name: 'room_joined', gameSlug: gameKeyToSlug(room.game_key) });
      setSlowAction(false);
      setActionState({ status: 'success', data: 'join' });
      router.push(lobbyPath(room.code));
    } catch (caught) {
      if (runId !== actionRunId.current) return;
      const classified = classifyRoomError(caught);
      setError(t.t(classified.bodyKey));
      setActionState({ status: 'error', code: classified.code, recoverable: classified.retryable });
      setBusy(undefined);
    }
  };

  const unavailable = healthState.status === 'unavailable';
  const actionTimedOut =
    actionState.status === 'error' && actionState.code === 'room_initialization_timeout';

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      {unavailable ? renderUnavailable(healthState.reasonKey as MessageKey) : null}

      <div className="flex flex-col gap-3 rounded-lg bg-surface-primary p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-text-primary">{t.t('rooms.createTitle')}</h2>
        <p className="text-sm text-text-primary">{t.t('rooms.createDescription')}</p>
        <div className="grid grid-cols-2 gap-2" aria-label={t.t('rooms.gameLabel')}>
          {(['gadha_chor', 'lal_satti', 'jhabbu', 'kachuful'] as const).map((candidate) => (
            <button
              key={candidate}
              type="button"
              disabled={busy !== undefined || unavailable}
              aria-pressed={gameKey === candidate}
              onClick={() => setGameKey(candidate)}
              className={[
                'rounded-md border px-3 py-2 text-sm font-semibold transition',
                gameKey === candidate
                  ? 'border-action-primary bg-action-primary text-text-onBrand'
                  : 'border-action-primary/30 bg-background-canvas text-text-primary',
              ].join(' ')}
            >
              {gameKeyLabel(candidate, t)}
            </button>
          ))}
        </div>
        <Button disabled={busy !== undefined || unavailable} onClick={onCreate}>
          {busy === 'create' ? t.t('rooms.creating') : t.t('action.createRoom')}
        </Button>
      </div>

      <form
        className="flex flex-col gap-3 rounded-lg bg-surface-primary p-6 shadow-sm"
        onSubmit={onJoin}
      >
        <h2 className="text-lg font-semibold text-text-primary">{t.t('rooms.joinTitle')}</h2>
        <label className="flex flex-col gap-1 text-sm text-text-primary">
          {t.t('rooms.codeLabel')}
          <input
            type="text"
            required
            autoCapitalize="characters"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
            placeholder={t.t('rooms.codePlaceholder')}
            className="rounded-md border border-action-primary/30 bg-background-canvas px-3 py-2 text-center text-lg font-semibold tracking-[0.3em] text-text-primary"
          />
        </label>
        <Button
          type="submit"
          variant="secondary"
          disabled={busy !== undefined || unavailable || code.trim().length < 6}
        >
          {busy === 'join' ? t.t('rooms.joining') : t.t('action.joinRoom')}
        </Button>
      </form>

      {actionState.status === 'loading' && slowAction ? (
        <p role="status" className="text-center text-sm text-text-primary">
          {t.t('rooms.takingLonger')}
        </p>
      ) : null}
      {actionTimedOut ? (
        <div className="flex flex-col gap-2 rounded-lg bg-surface-primary p-4 text-center shadow-sm">
          <p className="text-sm font-semibold text-status-error">{t.t('rooms.timeoutTitle')}</p>
          <Button
            size="sm"
            onClick={() => {
              setBusy(undefined);
              setActionState({ status: 'idle' });
            }}
          >
            {t.t('action.tryAgain')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCode('')}>
            {t.t('rooms.enterAnotherCode')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push('/mobile')}>
            {t.t('action.returnHome')}
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-center text-sm text-status-error">{error}</p> : null}
    </div>
  );
}

function gameKeyToSlug(key: OnlineGameKey): 'gadha-chor' | 'lal-satti' | 'jhabbu' | 'kachuful' {
  if (key === 'lal_satti') return 'lal-satti';
  if (key === 'jhabbu') return 'jhabbu';
  if (key === 'kachuful') return 'kachuful';
  return 'gadha-chor';
}
