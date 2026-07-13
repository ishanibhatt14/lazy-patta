'use client';

import { createSupabaseAuthProvider, type AuthProvider, type SessionState } from '@lazy-patta/auth';
import type { Locale, MessageKey } from '@lazy-patta/localization';
import type { FormEvent, ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { Button } from '../../../components/Button';
import { getBrowserAuthRedirectUrl } from '../../../lib/auth/redirect-url';
import { createTranslator } from '../../../lib/i18n';
import { getBrowserSupabaseClient } from '../../../lib/supabase';

import {
  listLalSattiScoreSessions,
  saveLalSattiScoreSession,
  type SavedLalSattiScoreSession,
} from './saved-scores';
import type { LalSattiRoundScore } from './types';

export interface LalSattiAccountPanelProps {
  readonly className?: string;
  readonly locale: Locale;
  readonly humanName: string;
  readonly playerCount: number;
  readonly roundScores: readonly LalSattiRoundScore[];
}

type SaveState =
  | { readonly status: 'idle' }
  | { readonly status: 'saving' }
  | { readonly status: 'saved' }
  | { readonly status: 'error' };

type HistoryState = 'idle' | 'loading' | 'error';

function savedSessionDate(session: SavedLalSattiScoreSession, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(session.createdAt));
}

/**
 * Account + saved-scores surface. Handles passcode auth and score persistence
 * exactly as before — this component was extracted verbatim so it can live in a
 * secondary account sheet outside active gameplay while preserving all auth and
 * persistence behavior.
 */
export function LalSattiAccountPanel({
  className = '',
  locale,
  humanName,
  playerCount,
  roundScores,
}: LalSattiAccountPanelProps): ReactElement {
  const t = createTranslator(locale);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [authProvider, setAuthProvider] = useState<AuthProvider | null>(null);
  const [authState, setAuthState] = useState<SessionState>({ status: 'loading' });
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [hasRequestedCode, setHasRequestedCode] = useState(false);
  const [authMessageKey, setAuthMessageKey] = useState<MessageKey | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });
  const [historyState, setHistoryState] = useState<HistoryState>('idle');
  const [savedSessions, setSavedSessions] = useState<readonly SavedLalSattiScoreSession[]>([]);

  useEffect(() => {
    const client = getBrowserSupabaseClient();
    setIsConfigured(Boolean(client));
    if (!client) {
      setAuthState({ status: 'signed-out' });
      return;
    }

    setAuthProvider(() =>
      createSupabaseAuthProvider(client, { getEmailRedirectTo: getBrowserAuthRedirectUrl }),
    );
  }, []);

  useEffect(() => {
    if (!authProvider) return undefined;
    return authProvider.onStateChange(setAuthState);
  }, [authProvider]);

  useEffect(() => {
    setSaveState({ status: 'idle' });
  }, [roundScores.length]);

  useEffect(() => {
    const client = getBrowserSupabaseClient();
    if (!client || authState.status !== 'signed-in') {
      setSavedSessions([]);
      setHistoryState('idle');
      return undefined;
    }

    let cancelled = false;
    setHistoryState('loading');
    void listLalSattiScoreSessions(client)
      .then((sessions) => {
        if (cancelled) return;
        setSavedSessions(sessions);
        setHistoryState('idle');
      })
      .catch(() => {
        if (cancelled) return;
        setHistoryState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [authState]);

  const handleRequestPasscode = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!authProvider) return;

    setAuthMessageKey(null);
    try {
      await authProvider.requestPasscode(email.trim());
      setHasRequestedCode(true);
      setAuthMessageKey('lalSatti.codeSent');
    } catch {
      setAuthMessageKey('lalSatti.authError');
    }
  };

  const handleVerifyPasscode = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!authProvider) return;

    setAuthMessageKey(null);
    try {
      await authProvider.verifyPasscode(email.trim(), passcode.trim());
      setPasscode('');
      setAuthMessageKey(null);
    } catch {
      setAuthMessageKey('lalSatti.authError');
    }
  };

  const handleSignOut = async (): Promise<void> => {
    if (!authProvider) return;
    await authProvider.signOut();
    setHasRequestedCode(false);
    setAuthMessageKey(null);
  };

  const handleSaveScores = async (): Promise<void> => {
    const client = getBrowserSupabaseClient();
    if (!client || roundScores.length === 0) return;

    setSaveState({ status: 'saving' });
    try {
      await saveLalSattiScoreSession(client, {
        humanName,
        playerCount,
        locale,
        roundScores,
      });
      setSavedSessions(await listLalSattiScoreSessions(client));
      setHistoryState('idle');
      setSaveState({ status: 'saved' });
    } catch {
      setSaveState({ status: 'error' });
    }
  };

  const signedInName =
    authState.status === 'signed-in' ? authState.session.user.displayName : undefined;

  return (
    <section className={['rounded-lg bg-surface-primary p-4 shadow-md', className].join(' ')}>
      <h2 className="text-lg font-bold text-action-primary">{t.t('lalSatti.accountTitle')}</h2>
      <p className="mt-1 text-sm leading-6">
        {isConfigured === false ? t.t('lalSatti.accountUnavailable') : t.t('lalSatti.accountHelp')}
      </p>

      {isConfigured === null ? (
        <p className="mt-3 text-sm font-semibold text-brand-accent">
          {t.t('lalSatti.accountChecking')}
        </p>
      ) : null}

      {isConfigured && authState.status === 'signed-in' ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-brand-accent">
            {t.format('lalSatti.signedInAs', { name: signedInName ?? 'Player' })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={roundScores.length === 0 || saveState.status === 'saving'}
              onClick={() => void handleSaveScores()}
            >
              {t.t('lalSatti.saveScores')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void handleSignOut()}>
              {t.t('lalSatti.signOut')}
            </Button>
          </div>
          {roundScores.length === 0 ? (
            <p className="text-xs leading-5 text-text-primary">{t.t('lalSatti.saveScoresEmpty')}</p>
          ) : (
            <p className="text-xs leading-5 text-text-primary">{t.t('lalSatti.saveScoresHelp')}</p>
          )}
          {saveState.status === 'saved' ? (
            <p className="text-sm font-semibold text-brand-accent">
              {t.t('lalSatti.saveScoresSuccess')}
            </p>
          ) : null}
          {saveState.status === 'error' ? (
            <p className="text-sm font-semibold text-action-primary">
              {t.t('lalSatti.saveScoresError')}
            </p>
          ) : null}

          <div className="pt-2">
            <h3 className="text-sm font-bold text-action-primary">
              {t.t('lalSatti.savedHistoryTitle')}
            </h3>
            {historyState === 'loading' ? (
              <p className="mt-2 text-sm text-text-primary">
                {t.t('lalSatti.savedHistoryLoading')}
              </p>
            ) : null}
            {historyState === 'error' ? (
              <p className="mt-2 text-sm font-semibold text-action-primary">
                {t.t('lalSatti.savedHistoryError')}
              </p>
            ) : null}
            {historyState !== 'loading' && savedSessions.length === 0 ? (
              <p className="mt-2 text-sm text-text-primary">{t.t('lalSatti.savedHistoryEmpty')}</p>
            ) : null}
            {savedSessions.length > 0 ? (
              <ol className="mt-3 space-y-2 text-sm">
                {savedSessions.map((session) => {
                  const latestSavedRound = session.rounds.at(-1);
                  return (
                    <li key={session.id} className="rounded-md bg-background-canvas p-3">
                      <p className="font-bold text-action-primary">
                        {t.format('lalSatti.savedHistorySummary', {
                          name: session.displayName,
                          count: session.rounds.length,
                        })}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-text-primary">
                        {savedSessionDate(session, locale)} -{' '}
                        {t.format('lobby.playerCount', { count: session.playerCount })}
                      </p>
                      {latestSavedRound ? (
                        <p className="mt-1 text-xs leading-5 text-text-primary">
                          {t.format('lalSatti.roundWinnerLine', {
                            name: latestSavedRound.winnerNames.join(', '),
                          })}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            ) : null}
          </div>
        </div>
      ) : null}

      {isConfigured && authState.status !== 'signed-in' ? (
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) =>
            hasRequestedCode ? void handleVerifyPasscode(event) : void handleRequestPasscode(event)
          }
        >
          <label className="flex flex-col gap-2 text-sm font-semibold text-text-primary">
            {t.t('lalSatti.emailLabel')}
            <input
              className="min-h-11 rounded-md border border-brand-accent bg-surface-primary px-3 py-2"
              type="email"
              autoComplete="email"
              value={email}
              placeholder={t.t('lalSatti.emailPlaceholder')}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          {hasRequestedCode ? (
            <label className="flex flex-col gap-2 text-sm font-semibold text-text-primary">
              {t.t('lalSatti.codeLabel')}
              <input
                className="min-h-11 rounded-md border border-brand-accent bg-surface-primary px-3 py-2"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={passcode}
                placeholder={t.t('lalSatti.codePlaceholder')}
                onChange={(event) => setPasscode(event.target.value)}
              />
            </label>
          ) : null}

          <Button
            type="submit"
            size="sm"
            disabled={authState.status === 'loading' || email.trim().length === 0}
          >
            {hasRequestedCode ? t.t('lalSatti.verifyCode') : t.t('lalSatti.sendCode')}
          </Button>

          {authMessageKey ? (
            <p className="text-sm font-semibold text-brand-accent">{t.t(authMessageKey)}</p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
