'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent, type ReactElement } from 'react';

import { useAuth } from '../../lib/auth/auth-context';
import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import { createRoom, joinRoomByCode, type OnlineGameKey } from '../../lib/rooms/rooms-client';
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client';
import { Button } from '../Button';
import { LoginPanel } from '../auth/LoginPanel';

/**
 * Signed-in landing for private rooms: create a fresh room or join one by code.
 * Both actions resolve to a room code and route into its lobby. Live realtime
 * play is a deferred follow-up; this slice covers auth + create/join lifecycle.
 */

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

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

export function OnlineHub(): ReactElement {
  const { state } = useAuth();
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

  if (state.status !== 'signed-in') {
    return (
      <div className="flex flex-col items-center gap-4">
        <LoginPanel />
      </div>
    );
  }

  const displayName = state.session.user.displayName;

  const onCreate = async (): Promise<void> => {
    setBusy('create');
    setError(undefined);
    try {
      const room = await createRoom(getSupabaseBrowserClient(), { displayName, gameKey, locale });
      router.push(`/play/online/${room.code}`);
    } catch (caught) {
      setError(messageFor(caught, t.t('rooms.errorGeneric')));
      setBusy(undefined);
    }
  };

  const onJoin = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy('join');
    setError(undefined);
    try {
      const room = await joinRoomByCode(getSupabaseBrowserClient(), code, displayName);
      router.push(`/play/online/${room.code}`);
    } catch (caught) {
      setError(messageFor(caught, t.t('rooms.errorGeneric')));
      setBusy(undefined);
    }
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg bg-surface-primary p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-text-primary">{t.t('rooms.createTitle')}</h2>
        <p className="text-sm text-text-primary">{t.t('rooms.createDescription')}</p>
        <div className="grid grid-cols-2 gap-2" aria-label={t.t('rooms.gameLabel')}>
          {(['gadha_chor', 'lal_satti', 'jhabbu', 'kachuful'] as const).map((candidate) => (
            <button
              key={candidate}
              type="button"
              disabled={busy !== undefined}
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
        <Button disabled={busy !== undefined} onClick={onCreate}>
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
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t.t('rooms.codePlaceholder')}
            className="rounded-md border border-action-primary/30 bg-background-canvas px-3 py-2 text-center text-lg font-semibold tracking-[0.3em] text-text-primary"
          />
        </label>
        <Button
          type="submit"
          variant="secondary"
          disabled={busy !== undefined || code.trim().length < 6}
        >
          {busy === 'join' ? t.t('rooms.joining') : t.t('action.joinRoom')}
        </Button>
      </form>

      {error ? <p className="text-center text-sm text-status-error">{error}</p> : null}
    </div>
  );
}
