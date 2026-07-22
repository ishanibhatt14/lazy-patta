'use client';

import type { BotDifficulty, Card } from '@lazy-patta/game-contracts';
import type { MessageKey } from '@lazy-patta/localization';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useEffect, useReducer, useRef } from 'react';

import { Button } from '../../../components/Button';
import { PlayingCard } from '../../../components/PlayingCard';
import { ComputerGameStarting } from '../../../components/game/ComputerGameStarting';
import { LocaleSwitcher } from '../../../components/game/LocaleSwitcher';
import { createCryptoRng, createSeededRng } from '../../../lib/computer-game/rng';
import { createTranslator } from '../../../lib/i18n';
import { usePreferredLocale } from '../../../lib/locale/preferred-locale-context';
import type { ComputerGameConfig } from '../../../lib/mobile/computer-session';

import {
  createKachufulController,
  selectKachufulViewState,
  type KachufulController,
} from './controller';
import type { KachufulControllerState, KachufulIntent, KachufulViewState } from './types';

const PLAYER_COUNTS = [3, 4, 5, 6, 7] as const;
const DIFFICULTIES: readonly BotDifficulty[] = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABEL_KEY: Record<
  BotDifficulty,
  'computer.difficultyEasy' | 'computer.difficultyMedium' | 'computer.difficultyHard'
> = {
  easy: 'computer.difficultyEasy',
  medium: 'computer.difficultyMedium',
  hard: 'computer.difficultyHard',
};
const SESSION_STORAGE_KEY = 'lazy-patta:kachuful-session:v1';

function readStoredName(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { humanName?: string };
    return typeof parsed.humanName === 'string' ? parsed.humanName : undefined;
  } catch {
    return undefined;
  }
}

function writeStoredName(state: KachufulControllerState): void {
  if (typeof window === 'undefined' || !state.hasHydratedSession) return;
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ humanName: state.humanName }));
}

/** A `?seed=` query param makes the deal reproducible for visual-regression runs. */
function seededRng(): ReturnType<typeof createCryptoRng> | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('seed');
  if (raw === null) return null;
  const seed = Number.parseInt(raw, 10);
  if (!Number.isFinite(seed)) return null;
  return createSeededRng(seed);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function cardFaceLabel(view: KachufulViewState, card: Card): string {
  const { t, format } = createTranslator(view.locale);
  return format('card.accessibleFace', {
    rank: t(`rank.${card.rank}` as MessageKey),
    suit: t(`suit.${card.suit}` as MessageKey),
  });
}

export function KachufulComputerGame({
  initialConfig,
  autoStart = false,
}: {
  readonly initialConfig?: ComputerGameConfig;
  readonly autoStart?: boolean;
} = {}): ReactElement {
  const { locale: preferredLocale, setLocale: setPreferredLocale } = usePreferredLocale();
  const controllerRef = useRef<KachufulController | null>(null);
  const autoStartedRef = useRef(false);

  if (controllerRef.current === null) {
    const rng = seededRng();
    controllerRef.current = createKachufulController(
      rng ?? createCryptoRng(),
      preferredLocale,
      initialConfig?.difficulty ?? (rng ? 'hard' : 'medium'),
    );
  }

  const controller = controllerRef.current;
  const [state, dispatch] = useReducer(
    (current: KachufulControllerState, intent: KachufulIntent) =>
      controller.dispatch(current, intent),
    {
      ...controller.initialState,
      playerCount: initialConfig?.playerCount ?? controller.initialState.playerCount,
      humanName: initialConfig?.humanName ?? controller.initialState.humanName,
      difficulty: initialConfig?.difficulty ?? controller.initialState.difficulty,
      reducedMotion: initialConfig?.reducedMotion ?? prefersReducedMotion(),
      hasHydratedSession: initialConfig ? true : controller.initialState.hasHydratedSession,
    },
  );
  const view = selectKachufulViewState(state);
  const { t, format } = createTranslator(view.locale);

  useEffect(() => {
    if (initialConfig) return;
    dispatch({ type: 'hydrateSession', humanName: readStoredName() });
  }, [initialConfig]);

  useEffect(() => {
    writeStoredName(state);
  }, [state]);

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || state.phase !== 'setup') return;
    autoStartedRef.current = true;
    dispatch({ type: 'start' });
  }, [autoStart, state.phase]);

  useEffect(() => {
    const acting = view.phase === 'bidding' || view.phase === 'playing';
    if (!acting || view.isHumanTurn) return;
    const delay = view.reducedMotion ? 220 : 620;
    const timer = window.setTimeout(() => dispatch({ type: 'botStep' }), delay);
    return () => window.clearTimeout(timer);
  }, [view.phase, view.isHumanTurn, view.currentPlayerName, view.reducedMotion]);

  if (view.phase === 'setup') {
    // Launched from the shared mobile setup shell, we auto-start into play; show
    // the same neutral placeholder as every game rather than this legacy setup.
    if (autoStart) return <ComputerGameStarting locale={view.locale} />;
    return renderSetup(view, dispatch, setPreferredLocale);
  }

  return renderTable(view, dispatch, setPreferredLocale);

  function renderSetup(
    v: KachufulViewState,
    send: typeof dispatch,
    setLocale: typeof setPreferredLocale,
  ): ReactElement {
    return (
      <main className="min-h-screen bg-background-canvas px-4 py-6 text-text-primary">
        <section className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="text-sm font-bold text-action-primary underline decoration-action-secondary decoration-2 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              ← {t('lobby.backToGames')}
            </Link>
            <LocaleSwitcher
              locale={v.locale}
              onLocaleChange={(next) => {
                setLocale(next);
                send({ type: 'setLocale', locale: next });
              }}
            />
          </div>

          <div className="rounded-lg bg-game-table p-5 text-text-onBrand shadow-md">
            <p className="text-sm font-semibold uppercase">{t('kachuful.modeLabel')}</p>
            <h1 className="mt-2 text-3xl font-bold">{t('kachuful.setupTitle')}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7">{t('kachuful.setupDescription')}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <section className="rounded-lg bg-surface-primary p-4 shadow-md">
              <h2 className="text-lg font-bold text-action-primary">
                {t('kachuful.quickRulesTitle')}
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
                <li>{t('kachuful.quickRuleTrump')}</li>
                <li>{t('kachuful.quickRuleBid')}</li>
                <li>{t('kachuful.quickRuleHook')}</li>
                <li>{t('kachuful.quickRuleScoring')}</li>
              </ul>
            </section>

            <section className="rounded-lg bg-surface-primary p-4 shadow-md">
              <h2 className="text-lg font-bold text-action-primary">
                {t('kachuful.quickGameTitle')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-text-primary">
                {format('kachuful.quickGameSummary', {
                  name: v.humanName.trim() || t('computer.youName'),
                  count: v.playerCount,
                })}
              </p>
              <Button
                size="lg"
                className="mt-4 w-full min-h-12"
                onClick={() => send({ type: 'start' })}
              >
                {t('kachuful.startQuickGame')}
              </Button>

              <details className="mt-4 rounded-md border border-action-primary/20 bg-background-canvas p-3">
                <summary className="cursor-pointer text-sm font-bold text-action-primary">
                  {t('computer.customizeTable')}
                </summary>

                <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-text-primary">
                  {t('kachuful.nameLabel')}
                  <input
                    className="min-h-12 rounded-md border border-brand-accent bg-surface-primary px-3 py-2"
                    value={v.humanName}
                    maxLength={32}
                    placeholder={t('computer.youName')}
                    onChange={(event) =>
                      send({ type: 'setHumanName', humanName: event.target.value })
                    }
                  />
                </label>

                <div className="mt-4">
                  <h3 className="text-sm font-bold text-action-primary">
                    {t('kachuful.tableSize')}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2" aria-label={t('kachuful.tableSize')}>
                    {PLAYER_COUNTS.map((count) => (
                      <button
                        key={count}
                        type="button"
                        aria-pressed={v.playerCount === count}
                        className={[
                          'min-h-12 rounded-md border px-4 py-2 font-semibold transition',
                          v.playerCount === count
                            ? 'border-action-primary bg-action-primary text-text-onBrand'
                            : 'border-brand-accent bg-surface-primary text-text-primary',
                        ].join(' ')}
                        onClick={() => send({ type: 'setPlayerCount', playerCount: count })}
                      >
                        {format('lobby.playerCount', { count })}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-bold text-action-primary">
                    {t('computer.difficultyLabel')}
                  </h3>
                  <div
                    className="mt-3 flex flex-wrap gap-2"
                    role="group"
                    aria-label={t('computer.difficultyLabel')}
                  >
                    {DIFFICULTIES.map((level) => (
                      <button
                        key={level}
                        type="button"
                        aria-pressed={v.difficulty === level}
                        className={[
                          'min-h-12 rounded-md border px-4 py-2 font-semibold transition',
                          v.difficulty === level
                            ? 'border-action-primary bg-action-primary text-text-onBrand'
                            : 'border-brand-accent bg-surface-primary text-text-primary',
                        ].join(' ')}
                        onClick={() => send({ type: 'setDifficulty', difficulty: level })}
                      >
                        {t(DIFFICULTY_LABEL_KEY[level])}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-text-primary">
                    {t('computer.difficultyHelp')}
                  </p>
                </div>
              </details>
            </section>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="ghost"
              onClick={() => send({ type: 'toggleReducedMotion' })}
              aria-pressed={v.reducedMotion}
            >
              {t('settings.reducedMotion')}
            </Button>
          </div>
        </section>
      </main>
    );
  }

  function renderTable(
    v: KachufulViewState,
    send: typeof dispatch,
    setLocale: typeof setPreferredLocale,
  ): ReactElement {
    const trumpLabel = t(v.trumpLabelKey);
    return (
      <main className="min-h-screen bg-background-canvas px-3 py-4 text-text-primary sm:px-4 sm:py-6">
        <section className="mx-auto flex max-w-5xl flex-col gap-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="text-sm font-bold text-action-primary underline decoration-action-secondary decoration-2 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              ← {t('lobby.backToGames')}
            </Link>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-surface-primary px-3 py-1 text-xs font-bold text-action-primary shadow-sm">
                {format('kachuful.roundLabel', { round: v.roundNumber, total: v.totalRounds })}
              </span>
              <span className="rounded-full bg-game-table px-3 py-1 text-xs font-bold text-text-onBrand shadow-sm">
                {format('kachuful.trumpLabel', { trump: trumpLabel })}
              </span>
              <LocaleSwitcher
                locale={v.locale}
                onLocaleChange={(next) => {
                  setLocale(next);
                  send({ type: 'setLocale', locale: next });
                }}
              />
            </div>
          </header>

          <p role="status" aria-live="polite" className="text-base font-semibold text-text-primary">
            {v.instructionValues
              ? format(v.instructionKey, v.instructionValues)
              : t(v.instructionKey)}
          </p>

          <section
            aria-label={t('kachuful.scoreboardHeading')}
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
          >
            {v.seats.map((seat) => (
              <div
                key={seat.id}
                data-seat-id={seat.id}
                data-active={seat.isActive}
                className={[
                  'rounded-lg border p-3 shadow-sm transition',
                  seat.isActive
                    ? 'border-action-primary bg-action-primary/10'
                    : 'border-brand-accent/40 bg-surface-primary',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-game-table text-sm font-bold text-text-onBrand"
                  >
                    {seat.avatarInitial}
                  </span>
                  <span className="truncate text-sm font-bold">
                    {seat.isSelf ? t('computer.youName') : seat.name}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1 text-xs">
                  {seat.isDealer && (
                    <span className="rounded bg-brand-accent/30 px-1.5 py-0.5 font-semibold">
                      {t('kachuful.dealerBadge')}
                    </span>
                  )}
                  <span className="rounded bg-background-canvas px-1.5 py-0.5 font-semibold">
                    {format('kachuful.bidTricksSeat', {
                      bid: seat.bid ?? '—',
                      won: seat.tricksWon,
                    })}
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-action-primary">
                  {format('kachuful.totalScore', { count: seat.totalScore })}
                </p>
              </div>
            ))}
          </section>

          {v.currentTrick.length > 0 && (
            <section
              aria-label={t('kachuful.trickHeading')}
              className="rounded-lg bg-game-table/90 p-3 shadow-md"
            >
              <p className="mb-2 text-xs font-semibold uppercase text-text-onBrand">
                {t('kachuful.trickHeading')}
              </p>
              <div className="flex flex-wrap items-end gap-3">
                {v.currentTrick.map((entry) => (
                  <div key={entry.playerId} className="flex flex-col items-center gap-1">
                    <PlayingCard card={entry.card} size="sm" label={cardFaceLabel(v, entry.card)} />
                    <span className="text-xs font-semibold text-text-onBrand">
                      {entry.playerId === 'you' ? t('computer.youName') : entry.playerName}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {v.phase === 'bidding' && v.isHumanTurn && (
            <section
              aria-label={t('kachuful.bidPrompt')}
              className="rounded-lg border border-action-primary/30 bg-surface-primary p-4 shadow-md"
            >
              <p className="text-sm font-bold text-action-primary">{t('kachuful.bidPrompt')}</p>
              <div
                className="mt-3 flex flex-wrap gap-2"
                role="group"
                aria-label={t('kachuful.bidPrompt')}
              >
                {Array.from({ length: v.handSize + 1 }, (_, bid) => bid).map((bid) => {
                  const disabled = !v.legalBids.includes(bid);
                  return (
                    <button
                      key={bid}
                      type="button"
                      disabled={disabled}
                      aria-label={format('kachuful.placeBid', { count: bid })}
                      className={[
                        'min-h-12 min-w-12 rounded-md border px-3 py-2 text-base font-bold transition',
                        disabled
                          ? 'cursor-not-allowed border-brand-accent/30 bg-background-canvas text-text-primary/40'
                          : 'border-action-primary bg-surface-primary text-action-primary hover:bg-action-primary hover:text-text-onBrand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                      ].join(' ')}
                      onClick={() => send({ type: 'placeBid', bid })}
                    >
                      {bid}
                    </button>
                  );
                })}
              </div>
              {v.forbiddenBid !== null && (
                <p className="mt-2 text-xs leading-5 text-text-primary">
                  {format('kachuful.hookHint', { count: v.forbiddenBid })}
                </p>
              )}
            </section>
          )}

          <section
            aria-label={t('kachuful.yourHand')}
            className="rounded-lg bg-surface-primary p-3 shadow-md"
          >
            <p className="mb-2 text-xs font-semibold uppercase text-action-primary">
              {t('kachuful.yourHand')}
            </p>
            <div className="flex flex-wrap gap-2">
              {v.ownHand.map((card) => {
                const playable =
                  v.phase === 'playing' && v.isHumanTurn && v.playableCardIds.includes(card.id);
                const label = cardFaceLabel(v, card);
                if (playable) {
                  return (
                    <button
                      key={card.id}
                      type="button"
                      aria-label={format('kachuful.playCardLabel', { card: label })}
                      className="rounded-lg ring-2 ring-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                      onClick={() => send({ type: 'playCard', cardId: card.id })}
                    >
                      <PlayingCard card={card} size="md" label={label} />
                    </button>
                  );
                }
                return (
                  <div
                    key={card.id}
                    className={v.phase === 'playing' && v.isHumanTurn ? 'opacity-45' : undefined}
                  >
                    <PlayingCard card={card} size="md" label={label} />
                  </div>
                );
              })}
              {v.ownHand.length === 0 && (
                <p className="text-sm text-text-primary">{t('kachuful.handEmpty')}</p>
              )}
            </div>
          </section>

          {v.phase === 'roundScored' && (
            <section className="rounded-lg border border-action-primary/40 bg-surface-primary p-4 shadow-md">
              <h2 className="text-lg font-bold text-action-primary">
                {t('kachuful.roundComplete')}
              </h2>
              {renderScoreboard(v)}
              <Button className="mt-4 w-full min-h-12" onClick={() => send({ type: 'nextRound' })}>
                {t('kachuful.nextRound')}
              </Button>
            </section>
          )}

          {v.phase === 'result' && v.result && (
            <section className="rounded-lg border border-action-primary bg-surface-primary p-5 text-center shadow-lg">
              <p className="text-sm font-semibold uppercase text-action-primary">
                {t('kachuful.matchComplete')}
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {v.result.isSelfWinner
                  ? t('kachuful.youWin')
                  : v.result.winnerNames.length > 1
                    ? format('kachuful.winnersAnnounce', { names: v.result.winnerNames.join(', ') })
                    : format('kachuful.winnerAnnounce', { name: v.result.winnerNames[0] ?? '' })}
              </h2>
              {renderScoreboard(v)}
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Button onClick={() => send({ type: 'rematch' })}>{t('kachuful.playAgain')}</Button>
                <Link
                  href="/"
                  className="inline-flex min-h-12 items-center rounded-md border border-action-primary px-4 py-2 font-semibold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                >
                  {t('kachuful.returnHome')}
                </Link>
              </div>
            </section>
          )}

          {v.events.length > 0 && (
            <section
              aria-label={t('kachuful.logHeading')}
              className="rounded-lg bg-surface-primary/70 p-3"
            >
              <ul className="space-y-1 text-xs leading-5 text-text-primary">
                {v.events.map((event) => (
                  <li key={event.id}>
                    {event.values ? format(event.messageKey, event.values) : t(event.messageKey)}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </section>
      </main>
    );
  }

  function renderScoreboard(v: KachufulViewState): ReactElement {
    return (
      <ol className="mt-3 space-y-1">
        {v.scoreboard.map((row, index) => (
          <li
            key={row.playerId}
            className={[
              'flex items-center justify-between rounded-md px-3 py-2 text-sm',
              row.isSelf ? 'bg-action-primary/10 font-bold' : 'bg-background-canvas',
            ].join(' ')}
          >
            <span>
              {index + 1}. {row.isSelf ? t('computer.youName') : row.playerName}
            </span>
            <span className="font-bold text-action-primary">
              {format('kachuful.totalScore', { count: row.totalScore })}
            </span>
          </li>
        ))}
      </ol>
    );
  }
}
