'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { useEffect, useReducer, useRef } from 'react';

import { Button } from '../../../components/Button';
import { PlayingCard } from '../../../components/PlayingCard';
import { LocaleSwitcher } from '../../../components/game/LocaleSwitcher';
import { createCryptoRng, createSeededRng } from '../../../lib/computer-game/rng';
import { createTranslator } from '../../../lib/i18n';
import { usePreferredLocale } from '../../../lib/locale/preferred-locale-context';

import { createJhabbuController, selectJhabbuViewState, type JhabbuController } from './controller';
import type { JhabbuControllerState, JhabbuIntent, JhabbuViewState } from './types';

const PLAYER_COUNTS = [3, 4, 5, 6] as const;

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

function cardLabel(card: { readonly rank: string; readonly suit: string }): string {
  return `${card.rank} of ${card.suit}`;
}

function SetupScreen({
  view,
  dispatch,
  onLocaleChange,
}: {
  readonly view: JhabbuViewState;
  readonly dispatch: (intent: JhabbuIntent) => void;
  readonly onLocaleChange: (locale: JhabbuViewState['locale']) => void;
}): ReactElement {
  const t = createTranslator(view.locale);

  return (
    <main className="min-h-screen bg-background-canvas px-4 py-6 text-text-primary">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-bold text-action-primary underline decoration-action-secondary decoration-2 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t.t('lobby.backToGames')}
          </Link>
          <LocaleSwitcher locale={view.locale} onLocaleChange={onLocaleChange} />
        </div>

        <div className="rounded-lg bg-game-table p-5 text-text-onBrand shadow-md">
          <p className="text-sm font-semibold uppercase tracking-[0.18em]">
            {t.t('jhabbu.modeLabel')}
          </p>
          <h1 className="mt-2 text-3xl font-black md:text-5xl">{t.t('jhabbu.setupTitle')}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7">{t.t('jhabbu.setupDescription')}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <section className="rounded-lg bg-surface-primary p-4 shadow-md">
            <h2 className="text-lg font-bold text-action-primary">
              {t.t('jhabbu.quickRulesTitle')}
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
              <li>{t.t('jhabbu.quickRuleOpening')}</li>
              <li>{t.t('jhabbu.quickRuleFollow')}</li>
              <li>{t.t('jhabbu.quickRuleThulla')}</li>
              <li>{t.t('jhabbu.quickRuleGoal')}</li>
            </ul>
          </section>

          <section className="rounded-lg bg-surface-primary p-4 shadow-md">
            <h2 className="text-lg font-bold text-action-primary">
              {t.t('jhabbu.quickGameTitle')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-primary">
              {t.format('jhabbu.quickGameSummary', {
                name: view.humanName.trim() || t.t('computer.youName'),
                count: view.playerCount,
              })}
            </p>
            <Button
              size="lg"
              className="mt-4 min-h-12 w-full"
              onClick={() => dispatch({ type: 'start' })}
            >
              {t.t('jhabbu.startQuickGame')}
            </Button>

            <details className="mt-4 rounded-md border border-action-primary/20 bg-background-canvas p-3">
              <summary className="cursor-pointer text-sm font-bold text-action-primary">
                {t.t('computer.customizeTable')}
              </summary>

              <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-text-primary">
                {t.t('jhabbu.nameLabel')}
                <input
                  className="min-h-12 rounded-md border border-brand-accent bg-surface-primary px-3 py-2"
                  value={view.humanName}
                  maxLength={32}
                  placeholder={t.t('computer.youName')}
                  onChange={(event) =>
                    dispatch({ type: 'setHumanName', humanName: event.target.value })
                  }
                />
                <span className="text-xs font-normal leading-5 text-text-primary">
                  {t.t('jhabbu.nameHelp')}
                </span>
              </label>

              <div className="mt-4">
                <h3 className="text-sm font-bold text-action-primary">{t.t('jhabbu.tableSize')}</h3>
                <div className="mt-3 flex flex-wrap gap-2" aria-label={t.t('jhabbu.tableSize')}>
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
              </div>
            </details>
          </section>
        </div>

        <Button
          variant="ghost"
          className="w-fit"
          onClick={() => dispatch({ type: 'toggleReducedMotion' })}
          aria-pressed={view.reducedMotion}
        >
          {t.t('settings.reducedMotion')}
        </Button>
      </section>
    </main>
  );
}

function PlayingScreen({
  view,
  dispatch,
  onLocaleChange,
}: {
  readonly view: JhabbuViewState;
  readonly dispatch: (intent: JhabbuIntent) => void;
  readonly onLocaleChange: (locale: JhabbuViewState['locale']) => void;
}): ReactElement {
  const t = createTranslator(view.locale);
  const playable = new Set(view.playableCardIds);

  return (
    <main className="jh-shell min-h-screen text-text-primary">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-3 py-4 md:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-primary/95 p-3 shadow-md">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-accent">
              {t.t('jhabbu.modeLabel')}
            </p>
            <h1 className="text-xl font-black text-action-primary md:text-3xl">
              {t.format(view.statusKey, view.statusValues)}
            </h1>
            <p className="mt-1 text-sm leading-6 text-text-primary">
              {t.format(view.instructionKey, view.instructionValues)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LocaleSwitcher locale={view.locale} onLocaleChange={onLocaleChange} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: 'toggleReducedMotion' })}
              aria-pressed={view.reducedMotion}
            >
              {t.t('settings.reducedMotion')}
            </Button>
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-action-primary px-3 text-sm font-bold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              {t.t('action.backToGames')}
            </Link>
          </div>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[18rem_1fr_18rem]">
          <aside className="rounded-lg bg-surface-primary/95 p-3 shadow-md">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-action-primary">
              {t.t('jhabbu.players')}
            </h2>
            <div className="mt-3 space-y-2">
              {view.seats.map((seat) => (
                <div
                  key={seat.id}
                  className={[
                    'rounded-md border p-3',
                    seat.isActive
                      ? 'border-brand-accent bg-brand-accent/10'
                      : 'border-action-primary/15 bg-background-canvas',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-action-primary font-black text-text-onBrand">
                        {seat.avatarInitial}
                      </span>
                      <div>
                        <p className="font-bold text-action-primary">{seat.name}</p>
                        <p className="text-xs text-text-primary">
                          {t.format('game.cardsRemainingCount', { count: seat.cardCount })}
                        </p>
                      </div>
                    </div>
                    {seat.isPower ? (
                      <span className="rounded-full bg-brand-accent px-2 py-1 text-xs font-black text-text-onBrand">
                        {t.t('jhabbu.powerBadge')}
                      </span>
                    ) : null}
                  </div>
                  {seat.isFinished ? (
                    <p className="mt-2 text-xs font-bold text-brand-accent">
                      {t.t('jhabbu.gotAway')}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </aside>

          <section className="jh-table rounded-lg bg-game-table p-3 text-text-onBrand shadow-lg md:p-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md bg-black/15 p-3">
                <p className="text-xs font-black uppercase tracking-[0.16em]">
                  {t.t('jhabbu.powerPlayer')}
                </p>
                <p className="mt-1 text-lg font-black">{view.powerPlayerName}</p>
              </div>
              <div className="rounded-md bg-black/15 p-3">
                <p className="text-xs font-black uppercase tracking-[0.16em]">
                  {t.t('jhabbu.ledSuit')}
                </p>
                <p className="mt-1 text-lg font-black">{view.ledSuit ?? t.t('jhabbu.noLedSuit')}</p>
              </div>
              <div className="rounded-md bg-black/15 p-3">
                <p className="text-xs font-black uppercase tracking-[0.16em]">
                  {t.t('jhabbu.wastePile')}
                </p>
                <p className="mt-1 text-lg font-black">{view.wasteCount}</p>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-white/20 bg-white/10 p-4">
              <h2 className="text-sm font-black uppercase tracking-[0.16em]">
                {t.t('jhabbu.currentTrick')}
              </h2>
              <div className="mt-4 flex min-h-32 flex-wrap items-center justify-center gap-3">
                {view.currentTrick.length > 0 ? (
                  view.currentTrick.map((entry) => (
                    <div
                      key={`${entry.playerId}-${entry.card.id}-${entry.sequence}`}
                      className="text-center"
                    >
                      <PlayingCard card={entry.card} size="md" label={cardLabel(entry.card)} />
                      <p className="mt-2 text-xs font-bold">
                        {entry.isThulla ? t.t('jhabbu.thullaCard') : entry.playerId}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-semibold opacity-90">{t.t('jhabbu.emptyTrick')}</p>
                )}
              </div>
            </div>

            {view.canDrawFromWaste ? (
              <Button
                size="lg"
                className="mt-4 min-h-12 w-full bg-brand-accent"
                onClick={() => dispatch({ type: 'drawFromWaste' })}
              >
                {t.t('jhabbu.drawFromWaste')}
              </Button>
            ) : null}
          </section>

          <aside className="rounded-lg bg-surface-primary/95 p-3 shadow-md">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-action-primary">
              {t.t('computer.eventLog')}
            </h2>
            <ol className="mt-3 space-y-2">
              {view.events.map((event) => (
                <li
                  key={event.id}
                  className="rounded-md bg-background-canvas p-2 text-sm leading-5"
                >
                  {t.format(event.messageKey, event.values)}
                </li>
              ))}
            </ol>
          </aside>
        </div>

        <section className="rounded-lg bg-surface-primary p-3 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-action-primary">
              {t.t('jhabbu.yourCards')}
            </h2>
            <p className="text-sm font-bold text-text-primary">
              {view.playableCardIds.length > 0
                ? t.format('jhabbu.playableCount', { count: view.playableCardIds.length })
                : t.t('jhabbu.noPlayableCards')}
            </p>
          </div>
          <div className="jh-hand mt-3">
            {view.ownHand.map((card) => {
              const isPlayable = view.isHumanTurn && playable.has(card.id);
              return (
                <button
                  key={card.id}
                  type="button"
                  className={[
                    'jh-card-button rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                    isPlayable ? 'jh-card-playable' : 'jh-card-muted',
                  ].join(' ')}
                  onClick={() => dispatch({ type: 'playCard', cardId: card.id })}
                  disabled={!isPlayable}
                  aria-label={
                    isPlayable
                      ? t.format('jhabbu.playCardLabel', { card: cardShortName(card) })
                      : t.format('jhabbu.cardNotPlayable', { card: cardShortName(card) })
                  }
                >
                  <PlayingCard card={card} size="md" label={cardLabel(card)} />
                </button>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

function ResultScreen({
  view,
  dispatch,
}: {
  readonly view: JhabbuViewState;
  readonly dispatch: (intent: JhabbuIntent) => void;
}): ReactElement {
  const t = createTranslator(view.locale);

  return (
    <main className="jh-shell min-h-screen px-4 py-6 text-text-primary">
      <section className="mx-auto max-w-4xl rounded-lg bg-surface-primary p-5 shadow-lg">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-accent">
          {t.t('jhabbu.roundComplete')}
        </p>
        <h1 className="mt-2 text-3xl font-black text-action-primary">
          {t.t('jhabbu.resultTitle')}
        </h1>
        <p className="mt-3 text-lg font-bold text-text-primary">
          {t.format('jhabbu.resultLoser', { name: view.loserName })}
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <section className="rounded-md bg-background-canvas p-4">
            <h2 className="font-black text-action-primary">{t.t('jhabbu.finishOrder')}</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              {view.finishOrderNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ol>
          </section>
          <section className="rounded-md bg-background-canvas p-4">
            <h2 className="font-black text-action-primary">{t.t('jhabbu.penalties')}</h2>
            <dl className="mt-3 space-y-2">
              {view.seats.map((seat) => (
                <div key={seat.id} className="flex justify-between gap-3">
                  <dt>{seat.name}</dt>
                  <dd className="font-black">{seat.penaltyPoints}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => dispatch({ type: 'rematch' })}>
            {t.t('jhabbu.playAgain')}
          </Button>
          <Link
            href="/"
            className="inline-flex min-h-14 items-center justify-center rounded-md border border-action-primary px-7 text-lg font-semibold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t.t('action.backToGames')}
          </Link>
        </div>
      </section>
    </main>
  );
}

function cardShortName(card: { readonly rank: string; readonly suit: string }): string {
  const rank =
    card.rank === 'jack'
      ? 'J'
      : card.rank === 'queen'
        ? 'Q'
        : card.rank === 'king'
          ? 'K'
          : card.rank === 'ace'
            ? 'A'
            : card.rank;
  const suit =
    card.suit === 'hearts'
      ? '♥'
      : card.suit === 'diamonds'
        ? '♦'
        : card.suit === 'clubs'
          ? '♣'
          : '♠';
  return `${rank}${suit}`;
}

export function JhabbuComputerGame(): ReactElement {
  const { locale: preferredLocale, setLocale: setPreferredLocale } = usePreferredLocale();
  const controllerRef = useRef<JhabbuController | null>(null);

  if (controllerRef.current === null) {
    const rng = seededRng();
    controllerRef.current = createJhabbuController(rng ?? createCryptoRng(), preferredLocale);
  }

  const controller = controllerRef.current;
  const [state, dispatch] = useReducer(
    (current: JhabbuControllerState, intent: JhabbuIntent) => controller.dispatch(current, intent),
    {
      ...controller.initialState,
      reducedMotion: prefersReducedMotion(),
    },
  );
  const view = selectJhabbuViewState(state);

  useEffect(() => {
    if (view.phase !== 'playing' || view.isHumanTurn) return;
    const delay = view.reducedMotion ? 220 : 650;
    const timer = window.setTimeout(() => dispatch({ type: 'botStep' }), delay);
    return () => window.clearTimeout(timer);
  }, [view.phase, view.isHumanTurn, view.currentPlayerName, view.reducedMotion]);

  const onLocaleChange = (next: JhabbuViewState['locale']): void => {
    setPreferredLocale(next);
    dispatch({ type: 'setLocale', locale: next });
  };

  if (view.phase === 'setup') {
    return <SetupScreen view={view} dispatch={dispatch} onLocaleChange={onLocaleChange} />;
  }

  if (view.phase === 'result') {
    return <ResultScreen view={view} dispatch={dispatch} />;
  }

  return <PlayingScreen view={view} dispatch={dispatch} onLocaleChange={onLocaleChange} />;
}
