'use client';

import { createSupabaseAuthProvider, type AuthProvider, type SessionState } from '@lazy-patta/auth';
import type { Card, Rank, Suit } from '@lazy-patta/game-contracts';
import { LOCALES, type Locale, type MessageKey } from '@lazy-patta/localization';
import type { FormEvent, ReactElement } from 'react';
import { useEffect, useReducer, useRef, useState } from 'react';

import { Button } from '../../../components/Button';
import { PlayingCard } from '../../../components/PlayingCard';
import { createTranslator } from '../../../lib/i18n';
import { getBrowserSupabaseClient } from '../../../lib/supabase';

import {
  createLalSattiController,
  selectLalSattiViewState,
  type LalSattiController,
} from './controller';
import { LAL_SATTI_HUMAN_ID } from './players';
import {
  listLalSattiScoreSessions,
  saveLalSattiScoreSession,
  type SavedLalSattiScoreSession,
} from './saved-scores';
import type { LalSattiControllerState, LalSattiIntent, LalSattiRoundScore } from './types';

const SUIT_GLYPH: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
};

const PLAYER_COUNTS = [3, 4, 5, 6] as const;
const SESSION_STORAGE_KEY = 'lazy-patta:lal-satti-session:v1';

interface StoredLalSattiSession {
  readonly humanName?: string;
  readonly roundScores?: readonly LalSattiRoundScore[];
}

function rankKey(rank: Rank): MessageKey {
  return `rank.${rank}` as MessageKey;
}

function suitKey(suit: Suit): MessageKey {
  return `suit.${suit}` as MessageKey;
}

function cardLabel(card: Card, locale: Locale): string {
  const translator = createTranslator(locale);
  return translator.format('card.accessibleFace', {
    rank: translator.t(rankKey(card.rank)),
    suit: translator.t(suitKey(card.suit)),
  });
}

function displayName(playerName: string, locale: Locale): string {
  if (playerName === LAL_SATTI_HUMAN_ID) return createTranslator(locale).t('computer.youName');
  return playerName;
}

function readStoredSession(): StoredLalSattiSession {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as StoredLalSattiSession;
    return {
      humanName: typeof parsed.humanName === 'string' ? parsed.humanName : undefined,
      roundScores: Array.isArray(parsed.roundScores) ? parsed.roundScores : undefined,
    };
  } catch {
    return {};
  }
}

function writeStoredSession(state: LalSattiControllerState): void {
  if (typeof window === 'undefined' || !state.hasHydratedSession) return;
  window.localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      humanName: state.humanName,
      roundScores: state.roundScores,
    }),
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function LalSattiComputerGame(): ReactElement {
  const controllerRef = useRef<LalSattiController | null>(null);

  if (controllerRef.current === null) {
    controllerRef.current = createLalSattiController();
  }

  const controller = controllerRef.current;
  const [state, dispatch] = useReducer(
    (current: LalSattiControllerState, intent: LalSattiIntent) =>
      controller.dispatch(current, intent),
    {
      ...controller.initialState,
      reducedMotion: prefersReducedMotion(),
    },
  );
  const view = selectLalSattiViewState(state);
  const t = createTranslator(view.locale);
  const latestRound = view.roundScores.at(-1);

  useEffect(() => {
    dispatch({ type: 'hydrateSession', ...readStoredSession() });
  }, []);

  useEffect(() => {
    writeStoredSession(state);
  }, [state]);

  useEffect(() => {
    if (view.phase !== 'playing' || view.isHumanTurn) return;
    const delay = view.reducedMotion ? 250 : 700;
    const timer = window.setTimeout(() => dispatch({ type: 'botStep' }), delay);
    return () => window.clearTimeout(timer);
  }, [view.phase, view.isHumanTurn, view.currentPlayerName, view.reducedMotion]);

  if (view.phase === 'setup') {
    return (
      <main className="min-h-screen bg-background-canvas px-4 py-6 text-text-primary">
        <section className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="rounded-lg bg-game-table p-5 text-text-onBrand shadow-md">
            <p className="text-sm font-semibold uppercase">{t.t('lalSatti.modeLabel')}</p>
            <h1 className="mt-2 text-3xl font-bold">{t.t('lalSatti.setupTitle')}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7">{t.t('lalSatti.setupDescription')}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <section className="rounded-lg bg-surface-primary p-4 shadow-md">
              <h2 className="text-lg font-bold text-action-primary">{t.t('lalSatti.tableSize')}</h2>
              <div className="mt-4 flex flex-wrap gap-2" aria-label={t.t('lalSatti.tableSize')}>
                {PLAYER_COUNTS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={[
                      'min-h-12 rounded-md border px-4 py-2 font-semibold transition',
                      view.playerCount === count
                        ? 'border-action-primary bg-action-primary text-text-onBrand'
                        : 'border-brand-accent bg-surface-primary text-text-primary',
                    ].join(' ')}
                    onClick={() => dispatch({ type: 'setPlayerCount', playerCount: count })}
                  >
                    {t.format('lobby.playerCount', { count })}
                  </button>
                ))}
              </div>

              <label className="mt-5 flex flex-col gap-2 text-sm font-semibold text-text-primary">
                {t.t('lalSatti.nameLabel')}
                <input
                  className="min-h-12 rounded-md border border-brand-accent bg-surface-primary px-3 py-2"
                  value={view.humanName}
                  maxLength={32}
                  placeholder={t.t('lalSatti.namePlaceholder')}
                  onChange={(event) =>
                    dispatch({ type: 'setHumanName', humanName: event.target.value })
                  }
                />
                <span className="text-xs font-normal leading-5 text-text-primary">
                  {t.t('lalSatti.nameHelp')}
                </span>
              </label>

              <label className="mt-5 flex flex-col gap-2 text-sm font-semibold text-text-primary">
                {t.t('settings.language')}
                <select
                  className="min-h-12 rounded-md border border-brand-accent bg-surface-primary px-3 py-2"
                  value={view.locale}
                  onChange={(event) =>
                    dispatch({ type: 'setLocale', locale: event.target.value as Locale })
                  }
                >
                  {LOCALES.map((locale) => (
                    <option key={locale} value={locale}>
                      {locale.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section className="rounded-lg bg-surface-primary p-4 shadow-md">
              <h2 className="text-lg font-bold text-action-primary">
                {t.t('lalSatti.quickRulesTitle')}
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
                <li>{t.t('lalSatti.quickRuleSevens')}</li>
                <li>{t.t('lalSatti.quickRuleBuild')}</li>
                <li>{t.t('lalSatti.quickRulePass')}</li>
              </ul>
            </section>

            <LalSattiAccountPanel
              className="md:col-span-2"
              locale={view.locale}
              humanName={view.humanName}
              playerCount={view.playerCount}
              roundScores={view.roundScores}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" disabled={!view.canStart} onClick={() => dispatch({ type: 'start' })}>
              {t.t('lalSatti.startGame')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => dispatch({ type: 'toggleReducedMotion' })}
              aria-pressed={view.reducedMotion}
            >
              {t.t('settings.reducedMotion')}
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-background-canvas px-3 py-4 text-text-primary lg:px-6"
      data-reduced-motion={view.reducedMotion ? 'true' : 'false'}
    >
      <section className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-4">
          <header className="rounded-lg bg-surface-primary p-4 shadow-md">
            <p className="text-sm font-semibold text-brand-accent">
              {t.format(view.statusKey, view.statusValues)}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-action-primary">
              {t.format(view.instructionKey, view.instructionValues)}
            </h1>
          </header>

          <section
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
            aria-label={t.t('lalSatti.players')}
          >
            {view.seats.map((seat) => (
              <div
                key={seat.id}
                className={[
                  'rounded-lg bg-surface-primary p-3 shadow-md',
                  seat.isActive ? 'outline outline-2 outline-brand-accent' : '',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-action-primary font-bold text-text-onBrand">
                    {seat.avatarInitial}
                  </div>
                  <div>
                    <p className="font-bold">{seat.name}</p>
                    <p className="text-sm">
                      {seat.isFinished
                        ? t.t('label.finished')
                        : t.format('game.cardsRemainingCount', { count: seat.cardCount })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section
            className="rounded-lg bg-game-table p-4 text-text-onBrand shadow-md"
            aria-label={t.t('lalSatti.tableau')}
          >
            <div className="grid gap-3">
              {view.lanes.map((lane) => (
                <div
                  key={lane.suit}
                  className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2"
                >
                  <div className="text-3xl" aria-label={t.t(suitKey(lane.suit))}>
                    {SUIT_GLYPH[lane.suit]}
                  </div>
                  <div className="flex min-h-24 items-center gap-2 overflow-x-auto rounded-md bg-surface-primary p-2 text-text-primary">
                    {lane.cards.map((card) => (
                      <PlayingCard
                        key={card.id}
                        card={card}
                        size="sm"
                        label={cardLabel(card, view.locale)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg bg-surface-primary p-4 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-action-primary">{t.t('lalSatti.yourCards')}</h2>
              {view.canPass ? (
                <Button variant="secondary" onClick={() => dispatch({ type: 'pass' })}>
                  {t.t('lalSatti.passTurn')}
                </Button>
              ) : (
                <span className="text-sm font-semibold text-brand-accent">
                  {t.t('lalSatti.playableNow')}
                </span>
              )}
            </div>

            <div className="mt-4 flex min-h-32 flex-wrap items-end gap-2">
              {view.ownHand.map((card) => {
                const playable = view.playableCardIds.includes(card.id);
                return (
                  <button
                    key={card.id}
                    type="button"
                    className={[
                      'rounded-md p-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                      playable
                        ? '-translate-y-2 bg-action-secondary shadow-md'
                        : 'bg-transparent opacity-70',
                    ].join(' ')}
                    disabled={!playable || !view.isHumanTurn}
                    aria-label={t.format('lalSatti.playCardLabel', {
                      card: cardLabel(card, view.locale),
                    })}
                    onClick={() => dispatch({ type: 'playCard', cardId: card.id })}
                  >
                    <PlayingCard card={card} size="md" label={cardLabel(card, view.locale)} />
                  </button>
                );
              })}
            </div>
          </section>

          {view.phase === 'result' ? (
            <section className="rounded-lg bg-action-primary p-5 text-text-onBrand shadow-md">
              <p className="text-sm font-semibold uppercase">{t.t('lalSatti.roundComplete')}</p>
              <h2 className="mt-2 text-2xl font-bold">
                {t.format('lalSatti.winnerLine', {
                  name: view.winnerNames.map((name) => displayName(name, view.locale)).join(', '),
                })}
              </h2>
              <p className="mt-2">{t.t('lalSatti.resultInstruction')}</p>
              {latestRound && latestRound.leftovers.length > 0 ? (
                <div className="mt-4 rounded-md bg-surface-primary p-3 text-text-primary">
                  <h3 className="font-bold text-action-primary">
                    {t.t('lalSatti.leftoversTitle')}
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {latestRound.leftovers.map((leftover) => (
                      <li key={leftover.playerId}>
                        {t.format('lalSatti.leftoverLine', {
                          name: leftover.playerName,
                          count: leftover.cardCount,
                        })}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Button
                className="mt-4"
                variant="secondary"
                onClick={() => dispatch({ type: 'rematch' })}
              >
                {t.t('action.rematch')}
              </Button>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4 lg:self-start">
          <section className="rounded-lg bg-surface-primary p-4 shadow-md">
            <h2 className="text-lg font-bold text-action-primary">
              {t.t('lalSatti.scoreboardTitle')}
            </h2>
            <p className="mt-1 text-sm leading-6">{t.t('lalSatti.scoreboardHelp')}</p>

            {view.roundScores.length === 0 ? (
              <p className="mt-3 text-sm font-semibold text-brand-accent">
                {t.t('lalSatti.scoreboardEmpty')}
              </p>
            ) : (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-action-primary">
                      <tr>
                        <th className="py-2 pr-3">{t.t('lalSatti.scoreboardPlayer')}</th>
                        <th className="py-2 pr-3">{t.t('lalSatti.scoreboardTotalLeft')}</th>
                        <th className="py-2">{t.t('lalSatti.scoreboardRoundsNotWon')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.runningScores.map((score) => (
                        <tr key={score.playerId} className="border-t border-brand-accent">
                          <td className="py-2 pr-3 font-semibold">{score.playerName}</td>
                          <td className="py-2 pr-3">{score.totalLeftoverCards}</td>
                          <td className="py-2">{score.roundsNotWon}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ol className="mt-4 space-y-3 text-sm leading-6">
                  {view.roundScores.map((round) => (
                    <li key={round.id} className="rounded-md bg-background-canvas p-3">
                      <p className="font-bold text-action-primary">
                        {t.format('lalSatti.roundScoreLabel', { round: round.roundNumber })}
                      </p>
                      <p>
                        {t.format('lalSatti.roundWinnerLine', {
                          name: round.winnerNames
                            .map((name) => displayName(name, view.locale))
                            .join(', '),
                        })}
                      </p>
                      <ul className="mt-1 space-y-1">
                        {round.leftovers.map((leftover) => (
                          <li key={leftover.playerId}>
                            {t.format('lalSatti.leftoverLine', {
                              name: leftover.playerName,
                              count: leftover.cardCount,
                            })}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>

          <LalSattiAccountPanel
            locale={view.locale}
            humanName={view.humanName}
            playerCount={view.playerCount}
            roundScores={view.roundScores}
          />

          <section className="rounded-lg bg-surface-primary p-4 shadow-md">
            <h2 className="text-lg font-bold text-action-primary">{t.t('computer.eventLog')}</h2>
            <ol className="mt-3 space-y-2 text-sm leading-6">
              {view.events.length === 0 ? (
                <li>{t.t('computer.eventReady')}</li>
              ) : (
                view.events.map((event) => (
                  <li key={event.id}>{t.format(event.messageKey, event.values)}</li>
                ))
              )}
            </ol>
          </section>
        </aside>
      </section>
    </main>
  );
}

interface LalSattiAccountPanelProps {
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

function LalSattiAccountPanel({
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

    setAuthProvider(() => createSupabaseAuthProvider(client));
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
