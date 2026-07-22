'use client';

import type { BotDifficulty, Card } from '@lazy-patta/game-contracts';
import type { MessageKey } from '@lazy-patta/localization';
import Link from 'next/link';
import type { ReactElement, ReactNode } from 'react';
import { useEffect, useReducer, useRef, useState } from 'react';

import { Button } from '../../../components/Button';
import { PlayingCard } from '../../../components/PlayingCard';
import { ComputerGameStarting } from '../../../components/game/ComputerGameStarting';
import { LocaleSwitcher } from '../../../components/game/LocaleSwitcher';
import { ImmersivePod } from '../../../components/game/immersive/ImmersivePod';
import { ImmersiveResultOverlay } from '../../../components/game/immersive/ImmersiveResultOverlay';
import { ImmersiveScene } from '../../../components/game/immersive/ImmersiveScene';
import { driveToResult, previewResultRequested } from '../../../lib/computer-game/preview-result';
import { createCryptoRng, createSeededRng } from '../../../lib/computer-game/rng';
import { trackGrowthEvent } from '../../../lib/growth/analytics';
import { buildShareableGameResult } from '../../../lib/growth/results';
import { shareGameResult } from '../../../lib/growth/share-result';
import { createTranslator } from '../../../lib/i18n';
import { usePreferredLocale } from '../../../lib/locale/preferred-locale-context';
import type { ComputerGameConfig } from '../../../lib/mobile/computer-session';
import { resolveCardTap } from '../../../lib/mobile/play-interaction';

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

/**
 * Auto-picks a legal move for the `?preview=result` screenshot seam: start the
 * deal, let bots step, place the lowest legal bid, play the first playable card,
 * and advance each scored round until the match ends.
 */
function pickPreviewIntent(view: KachufulViewState): KachufulIntent | null {
  switch (view.phase) {
    case 'setup':
      return { type: 'start' };
    case 'roundScored':
      return { type: 'nextRound' };
    case 'bidding': {
      if (!view.isHumanTurn) return { type: 'botStep' };
      const [bid] = view.legalBids;
      if (bid !== undefined) return { type: 'placeBid', bid };
      return null;
    }
    case 'playing': {
      if (!view.isHumanTurn) return { type: 'botStep' };
      const [cardId] = view.playableCardIds;
      if (cardId !== undefined) return { type: 'playCard', cardId };
      return null;
    }
    default:
      return null;
  }
}

function cardFaceLabel(view: KachufulViewState, card: Card): string {
  const { t, format } = createTranslator(view.locale);
  return format('card.accessibleFace', {
    rank: t(`rank.${card.rank}` as MessageKey),
    suit: t(`suit.${card.suit}` as MessageKey),
  });
}

function seatDisplayName(
  view: KachufulViewState,
  seat: KachufulViewState['seats'][number],
): string {
  return seat.isSelf ? createTranslator(view.locale).t('computer.youName') : seat.name;
}

function SetupScreen({
  view,
  dispatch,
  onLocaleChange,
}: {
  readonly view: KachufulViewState;
  readonly dispatch: (intent: KachufulIntent) => void;
  readonly onLocaleChange: (locale: KachufulViewState['locale']) => void;
}): ReactElement {
  const { t, format } = createTranslator(view.locale);

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
          <LocaleSwitcher locale={view.locale} onLocaleChange={onLocaleChange} />
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
                name: view.humanName.trim() || t('computer.youName'),
                count: view.playerCount,
              })}
            </p>
            <Button
              size="lg"
              className="mt-4 w-full min-h-12"
              onClick={() => dispatch({ type: 'start' })}
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
                  value={view.humanName}
                  maxLength={32}
                  placeholder={t('computer.youName')}
                  onChange={(event) =>
                    dispatch({ type: 'setHumanName', humanName: event.target.value })
                  }
                />
              </label>

              <div className="mt-4">
                <h3 className="text-sm font-bold text-action-primary">{t('kachuful.tableSize')}</h3>
                <div className="mt-3 flex flex-wrap gap-2" aria-label={t('kachuful.tableSize')}>
                  {PLAYER_COUNTS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      aria-pressed={view.playerCount === count}
                      className={[
                        'min-h-12 rounded-md border px-4 py-2 font-semibold transition',
                        view.playerCount === count
                          ? 'border-action-primary bg-action-primary text-text-onBrand'
                          : 'border-brand-accent bg-surface-primary text-text-primary',
                      ].join(' ')}
                      onClick={() => dispatch({ type: 'setPlayerCount', playerCount: count })}
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
                      aria-pressed={view.difficulty === level}
                      className={[
                        'min-h-12 rounded-md border px-4 py-2 font-semibold transition',
                        view.difficulty === level
                          ? 'border-action-primary bg-action-primary text-text-onBrand'
                          : 'border-brand-accent bg-surface-primary text-text-primary',
                      ].join(' ')}
                      onClick={() => dispatch({ type: 'setDifficulty', difficulty: level })}
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
            onClick={() => dispatch({ type: 'toggleReducedMotion' })}
            aria-pressed={view.reducedMotion}
          >
            {t('settings.reducedMotion')}
          </Button>
        </div>
      </section>
    </main>
  );
}

/** Lightweight bottom-sheet scaffold shared by the settings and log drawers. */
function TableSheet({
  view,
  titleId,
  title,
  onClose,
  children,
}: {
  readonly view: KachufulViewState;
  readonly titleId: string;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}): ReactElement {
  const { t } = createTranslator(view.locale);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label={t('action.close')}
        onClick={onClose}
      />
      <section
        className="relative z-10 max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-surface-primary p-5 shadow-md sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-black text-action-primary">
            {title}
          </h2>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-background-canvas text-lg font-bold text-action-primary"
            onClick={onClose}
            aria-label={t('action.close')}
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </section>
    </div>
  );
}

function SettingsSheet({
  open,
  view,
  largeCards,
  highContrast,
  confirmBeforePlay,
  leftHanded,
  onClose,
  onLocaleChange,
  onToggleReducedMotion,
  onToggleLargeCards,
  onToggleHighContrast,
  onToggleConfirmBeforePlay,
  onToggleLeftHanded,
  onOpenLog,
}: {
  readonly open: boolean;
  readonly view: KachufulViewState;
  readonly largeCards: boolean;
  readonly highContrast: boolean;
  readonly confirmBeforePlay: boolean;
  readonly leftHanded: boolean;
  readonly onClose: () => void;
  readonly onLocaleChange: (locale: KachufulViewState['locale']) => void;
  readonly onToggleReducedMotion: () => void;
  readonly onToggleLargeCards: () => void;
  readonly onToggleHighContrast: () => void;
  readonly onToggleConfirmBeforePlay: () => void;
  readonly onToggleLeftHanded: () => void;
  readonly onOpenLog: () => void;
}): ReactElement | null {
  const { t } = createTranslator(view.locale);
  if (!open) return null;

  const rowClass =
    'flex min-h-12 items-center justify-between rounded-md border border-action-secondary/25 bg-background-canvas px-3 py-2 text-sm font-semibold text-text-primary';

  return (
    <TableSheet
      view={view}
      titleId="kachuful-settings-title"
      title={t('action.settings')}
      onClose={onClose}
    >
      <div className="mb-4">
        <LocaleSwitcher locale={view.locale} onLocaleChange={onLocaleChange} />
      </div>
      <div className="grid gap-2">
        <button
          type="button"
          className={rowClass}
          onClick={onToggleReducedMotion}
          aria-pressed={view.reducedMotion}
        >
          <span>{t('settings.reducedMotion')}</span>
          <span>{view.reducedMotion ? t('settings.on') : t('settings.off')}</span>
        </button>
        <button
          type="button"
          className={rowClass}
          onClick={onToggleLargeCards}
          aria-pressed={largeCards}
        >
          <span>{t('settings.largeCards')}</span>
          <span>{largeCards ? t('settings.on') : t('settings.off')}</span>
        </button>
        <button
          type="button"
          className={rowClass}
          onClick={onToggleHighContrast}
          aria-pressed={highContrast}
        >
          <span>{t('settings.highContrastCards')}</span>
          <span>{highContrast ? t('settings.on') : t('settings.off')}</span>
        </button>
        <button
          type="button"
          className={rowClass}
          onClick={onToggleConfirmBeforePlay}
          aria-pressed={confirmBeforePlay}
        >
          <span>{t('settings.confirmBeforePlay')}</span>
          <span>{confirmBeforePlay ? t('settings.on') : t('settings.off')}</span>
        </button>
        <button
          type="button"
          className={rowClass}
          onClick={onToggleLeftHanded}
          aria-pressed={leftHanded}
        >
          <span>{t('settings.leftHanded')}</span>
          <span>{leftHanded ? t('settings.on') : t('settings.off')}</span>
        </button>
      </div>
      <div className="mt-4">
        <Button variant="secondary" className="w-full" onClick={onOpenLog}>
          {t('kachuful.logHeading')}
        </Button>
      </div>
    </TableSheet>
  );
}

function LogDrawer({
  open,
  view,
  onClose,
}: {
  readonly open: boolean;
  readonly view: KachufulViewState;
  readonly onClose: () => void;
}): ReactElement | null {
  const { t, format } = createTranslator(view.locale);
  if (!open) return null;

  return (
    <TableSheet
      view={view}
      titleId="kachuful-log-title"
      title={t('kachuful.logHeading')}
      onClose={onClose}
    >
      {view.events.length === 0 ? (
        <p className="rounded-md bg-background-canvas p-3 text-sm font-semibold text-text-primary">
          {t('kachuful.trickWaiting')}
        </p>
      ) : (
        <ul className="space-y-1 text-sm leading-6 text-text-primary">
          {view.events.map((event) => (
            <li key={event.id} className="rounded-md bg-background-canvas px-3 py-2">
              {event.values ? format(event.messageKey, event.values) : t(event.messageKey)}
            </li>
          ))}
        </ul>
      )}
    </TableSheet>
  );
}

/** The centre of the felt: round / trump chips and the current trick. */
function TrickFelt({ view }: { readonly view: KachufulViewState }): ReactElement {
  const { t, format } = createTranslator(view.locale);
  const trumpLabel = t(view.trumpLabelKey);

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="imm-pod-badge">
          {format('kachuful.roundLabel', { round: view.roundNumber, total: view.totalRounds })}
        </span>
        <span className="imm-pod-badge" data-tone="accent">
          {format('kachuful.trumpLabel', { trump: trumpLabel })}
        </span>
      </div>

      {view.currentTrick.length > 0 ? (
        <div className="imm-play-zone" aria-label={t('kachuful.trickHeading')}>
          {view.currentTrick.map((entry) => (
            <figure key={entry.playerId} className="imm-trick-card">
              <PlayingCard card={entry.card} size="sm" label={cardFaceLabel(view, entry.card)} />
              <figcaption>
                {entry.playerId === 'you' ? t('computer.youName') : entry.playerName}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="imm-zone-hint">
          {format('kachuful.trickWaiting', { name: view.currentPlayerName })}
        </p>
      )}
    </div>
  );
}

function BidPanel({
  view,
  onPlaceBid,
}: {
  readonly view: KachufulViewState;
  readonly onPlaceBid: (bid: number) => void;
}): ReactElement {
  const { t, format } = createTranslator(view.locale);

  return (
    <section
      aria-label={t('kachuful.bidPrompt')}
      className="w-full max-w-md rounded-xl border border-action-secondary/25 bg-surface-primary/95 p-3 text-center shadow-md"
    >
      <p className="text-sm font-bold text-action-primary">{t('kachuful.bidPrompt')}</p>
      <div
        className="mt-3 flex flex-wrap justify-center gap-2"
        role="group"
        aria-label={t('kachuful.bidPrompt')}
      >
        {Array.from({ length: view.handSize + 1 }, (_, bid) => bid).map((bid) => {
          const disabled = !view.legalBids.includes(bid);
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
              onClick={() => onPlaceBid(bid)}
            >
              {bid}
            </button>
          );
        })}
      </div>
      {view.forbiddenBid !== null ? (
        <p className="mt-2 text-xs leading-5 text-text-primary">
          {format('kachuful.hookHint', { count: view.forbiddenBid })}
        </p>
      ) : null}
    </section>
  );
}

function PlayerHand({
  view,
  largeCards,
  canPlay,
  armedCardId,
  invalidCardId,
  onSelectCard,
}: {
  readonly view: KachufulViewState;
  readonly largeCards: boolean;
  readonly canPlay: boolean;
  readonly armedCardId: string | null;
  readonly invalidCardId: string | null;
  readonly onSelectCard: (cardId: string) => void;
}): ReactElement {
  const { t, format } = createTranslator(view.locale);
  const playable = new Set(view.playableCardIds);
  const cardSize = largeCards ? 'lg' : 'md';

  const hintKey = invalidCardId
    ? ('kachuful.invalidCardHint' as const)
    : armedCardId
      ? ('settings.confirmTapAgain' as const)
      : null;

  return (
    <section className="w-full" aria-label={t('kachuful.yourHand')}>
      <div className="imm-hand-rail">
        <div className="flex items-end justify-center gap-2">
          {view.ownHand.map((card) => {
            const isPlayable = canPlay && playable.has(card.id);
            const label = cardFaceLabel(view, card);
            return (
              <button
                key={card.id}
                type="button"
                className="imm-hand-card rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                data-playable={isPlayable ? 'true' : 'false'}
                data-disabled={canPlay ? 'false' : 'true'}
                data-armed={card.id === armedCardId ? 'true' : 'false'}
                data-invalid={card.id === invalidCardId ? 'true' : 'false'}
                disabled={!canPlay}
                aria-label={format('kachuful.playCardLabel', { card: label })}
                onClick={() => onSelectCard(card.id)}
              >
                <PlayingCard card={card} size={cardSize} label={label} />
              </button>
            );
          })}
          {view.ownHand.length === 0 ? (
            <p className="text-sm text-text-onBrand">{t('kachuful.handEmpty')}</p>
          ) : null}
        </div>
      </div>
      {hintKey ? (
        <p
          className="mt-1 text-center text-xs font-semibold text-text-onBrand"
          aria-live="polite"
        >
          {t(hintKey)}
        </p>
      ) : null}
    </section>
  );
}

function Scoreboard({ view }: { readonly view: KachufulViewState }): ReactElement {
  const { t, format } = createTranslator(view.locale);
  return (
    <ol className="w-full space-y-1">
      {view.scoreboard.map((row, index) => (
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

/** Between-rounds tally shown over the felt until the player advances. */
function RoundOverlay({
  view,
  onNextRound,
}: {
  readonly view: KachufulViewState;
  readonly onNextRound: () => void;
}): ReactElement | null {
  const { t } = createTranslator(view.locale);
  if (view.phase !== 'roundScored') return null;

  return (
    <div className="imm-result-backdrop absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        // On-surface text: without this the panel inherits `.imm-scene`'s
        // `text-onBrand` colour and the standings names read faint.
        className="flex max-h-[90dvh] w-full max-w-md flex-col items-center gap-4 overflow-y-auto rounded-2xl bg-surface-primary p-6 text-center text-text-primary shadow-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kachuful-round-title"
      >
        <p className="text-sm font-black uppercase tracking-widest text-brand-accent">
          {t('kachuful.trickHeading')}
        </p>
        <h2 id="kachuful-round-title" className="text-2xl font-black text-action-primary">
          {t('kachuful.roundComplete')}
        </h2>
        <Scoreboard view={view} />
        <Button className="w-full" onClick={onNextRound}>
          {t('kachuful.nextRound')}
        </Button>
      </div>
    </div>
  );
}

function KachufulResult({
  view,
  onRematch,
}: {
  readonly view: KachufulViewState;
  readonly onRematch: () => void;
}): ReactElement | null {
  const translator = createTranslator(view.locale);
  const { t, format } = translator;
  const [shareNote, setShareNote] = useState<string | null>(null);
  const isResult = view.phase === 'result' && view.result !== null;

  useEffect(() => {
    if (!isResult) return;
    trackGrowthEvent({
      name: 'round_completed',
      gameSlug: 'kachuful',
      playerCount: view.playerCount,
      roundNumber: view.roundNumber,
    });
  }, [isResult, view.playerCount, view.roundNumber]);

  if (!isResult || !view.result) return null;

  const result = view.result;
  const heroSeat = view.seats.find((seat) => seat.id === result.winnerIds[0]) ?? null;
  const title = result.isSelfWinner
    ? t('kachuful.youWin')
    : result.winnerNames.length > 1
      ? format('kachuful.winnersAnnounce', { names: result.winnerNames.join(', ') })
      : format('kachuful.winnerAnnounce', { name: result.winnerNames[0] ?? '' });

  const seriesLeader = view.scoreboard.reduce<(typeof view.scoreboard)[number] | null>(
    (leader, row) => (!leader || row.totalScore > leader.totalScore ? row : leader),
    null,
  );
  const onShare = async (): Promise<void> => {
    const shareable = buildShareableGameResult({
      gameSlug: 'kachuful',
      gameName: t('games.kachuful.name'),
      winnerDisplayName: result.winnerNames[0],
      playerCount: view.playerCount,
      roundNumber: view.roundNumber,
      seriesLeaderDisplayName: seriesLeader?.playerName,
      t: translator,
    });
    const outcome = await shareGameResult(shareable, translator);
    if (outcome === 'copied') setShareNote(t('computer.shareCopied'));
  };

  return (
    <ImmersiveResultOverlay
      open
      titleId="kachuful-result-title"
      eyebrow={t('kachuful.matchComplete')}
      title={title}
      hero={
        heroSeat
          ? { seatId: heroSeat.id, initial: heroSeat.avatarInitial, isSelf: heroSeat.isSelf }
          : null
      }
      playAgainLabel={t('kachuful.playAgain')}
      onRematch={onRematch}
      shareLabel={t('action.shareResult')}
      onShare={() => void onShare()}
      returnHomeLabel={t('kachuful.returnHome')}
      returnHomeHref="/mobile"
    >
      {/* Scoreboard rows carry their own canvas fill, so they sit directly on
          the surface panel — a canvas wrapper here would flatten them into the
          rows (canvas-on-canvas) and lose all row separation. */}
      <div className="w-full">
        <Scoreboard view={view} />
      </div>
      {shareNote ? (
        <p aria-live="polite" className="text-sm font-semibold text-brand-accent">
          {shareNote}
        </p>
      ) : null}
    </ImmersiveResultOverlay>
  );
}

function PlayingScreen({
  view,
  dispatch,
  onLocaleChange,
  initialConfirmBeforePlay = false,
}: {
  readonly view: KachufulViewState;
  readonly dispatch: (intent: KachufulIntent) => void;
  readonly onLocaleChange: (locale: KachufulViewState['locale']) => void;
  readonly initialConfirmBeforePlay?: boolean;
}): ReactElement {
  const { t, format } = createTranslator(view.locale);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [largeCards, setLargeCards] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [confirmBeforePlay, setConfirmBeforePlay] = useState(initialConfirmBeforePlay);
  const [leftHanded, setLeftHanded] = useState(false);
  const [armedCardId, setArmedCardId] = useState<string | null>(null);
  const [invalidCardId, setInvalidCardId] = useState<string | null>(null);

  const canPlay = view.phase === 'playing' && view.isHumanTurn;

  // A stale arming or shake must never outlive the human's play turn.
  useEffect(() => {
    if (!canPlay) {
      setArmedCardId(null);
      setInvalidCardId(null);
    }
  }, [canPlay]);

  useEffect(() => {
    if (!invalidCardId) return;
    const timer = window.setTimeout(() => setInvalidCardId(null), 700);
    return () => window.clearTimeout(timer);
  }, [invalidCardId]);

  const onSelectCard = (cardId: string): void => {
    const outcome = resolveCardTap({
      cardId,
      isHumanTurn: canPlay,
      playableCardIds: view.playableCardIds,
      confirmBeforePlay,
      armedCardId,
    });
    switch (outcome.kind) {
      case 'ignore':
        return;
      case 'commit':
        setArmedCardId(null);
        setInvalidCardId(null);
        dispatch({ type: 'playCard', cardId: outcome.cardId });
        return;
      case 'arm':
        setInvalidCardId(null);
        setArmedCardId(outcome.cardId);
        return;
      case 'invalid':
        setArmedCardId(null);
        setInvalidCardId(null);
        window.requestAnimationFrame(() => setInvalidCardId(cardId));
        return;
    }
  };

  const opponents = view.seats.filter((seat) => !seat.isSelf);
  const selfSeat = view.seats.find((seat) => seat.isSelf);

  const renderPod = (seat: KachufulViewState['seats'][number]): ReactElement => (
    <ImmersivePod
      key={seat.id}
      seatId={seat.id}
      initial={seat.avatarInitial}
      name={seatDisplayName(view, seat)}
      isSelf={seat.isSelf}
      isActive={seat.isActive}
      badge={format('kachuful.bidTricksSeat', {
        bid: seat.bid ?? '—',
        won: seat.tricksWon,
      })}
      badgeTone={seat.isActive ? 'accent' : 'default'}
      tag={seat.isDealer ? t('kachuful.dealerBadge') : undefined}
      activeMarker={t('computer.activeTurnMarker')}
    />
  );

  const toolbar = (
    <button
      type="button"
      className="imm-toolbar-button"
      onClick={() => setSettingsOpen(true)}
      aria-label={t('action.settings')}
    >
      <span aria-hidden>⚙️</span>
    </button>
  );

  const showBidPanel = view.phase === 'bidding' && view.isHumanTurn;

  return (
    <>
      <ImmersiveScene
        ariaLabel={t('kachuful.modeLabel')}
        modeLabel={t('kachuful.modeLabel')}
        statusText={
          view.statusValues ? format(view.statusKey, view.statusValues) : t(view.statusKey)
        }
        statusIsSelf={view.isHumanTurn}
        reducedMotion={view.reducedMotion}
        highContrast={highContrast}
        leftHanded={leftHanded}
        toolbar={toolbar}
        top={opponents.map(renderPod)}
        middle={<TrickFelt view={view} />}
        bottom={
          <>
            {showBidPanel ? (
              <BidPanel view={view} onPlaceBid={(bid) => dispatch({ type: 'placeBid', bid })} />
            ) : null}
            {selfSeat ? renderPod(selfSeat) : null}
            <PlayerHand
              view={view}
              largeCards={largeCards}
              canPlay={canPlay}
              armedCardId={armedCardId}
              invalidCardId={invalidCardId}
              onSelectCard={onSelectCard}
            />
          </>
        }
        overlay={
          <>
            <RoundOverlay view={view} onNextRound={() => dispatch({ type: 'nextRound' })} />
            <KachufulResult view={view} onRematch={() => dispatch({ type: 'rematch' })} />
          </>
        }
      />

      <SettingsSheet
        open={settingsOpen}
        view={view}
        largeCards={largeCards}
        highContrast={highContrast}
        confirmBeforePlay={confirmBeforePlay}
        leftHanded={leftHanded}
        onClose={() => setSettingsOpen(false)}
        onLocaleChange={onLocaleChange}
        onToggleReducedMotion={() => dispatch({ type: 'toggleReducedMotion' })}
        onToggleLargeCards={() => setLargeCards((value) => !value)}
        onToggleHighContrast={() => setHighContrast((value) => !value)}
        onToggleConfirmBeforePlay={() => {
          setArmedCardId(null);
          setConfirmBeforePlay((value) => !value);
        }}
        onToggleLeftHanded={() => setLeftHanded((value) => !value)}
        onOpenLog={() => {
          setSettingsOpen(false);
          setLogOpen(true);
        }}
      />
      <LogDrawer open={logOpen} view={view} onClose={() => setLogOpen(false)} />
    </>
  );
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
    (base) =>
      previewResultRequested()
        ? driveToResult({
            initialState: base,
            dispatch: controller.dispatch,
            selectView: selectKachufulViewState,
            pickIntent: pickPreviewIntent,
            isResult: (view) => view.phase === 'result',
          })
        : base,
  );
  const view = selectKachufulViewState(state);

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
    // Keyed on `state.game` (a fresh object every engine step), not the actor's
    // name: when a bot wins a trick and leads the next one, the name is unchanged
    // and a name-keyed effect would never re-fire, freezing the table.
  }, [view.phase, view.isHumanTurn, state.game, view.reducedMotion]);

  const onLocaleChange = (next: KachufulViewState['locale']): void => {
    setPreferredLocale(next);
    dispatch({ type: 'setLocale', locale: next });
  };

  if (view.phase === 'setup') {
    // Launched from the shared mobile setup shell, we auto-start into play; show
    // the same neutral placeholder as every game rather than this legacy setup.
    if (autoStart) return <ComputerGameStarting locale={view.locale} />;
    return <SetupScreen view={view} dispatch={dispatch} onLocaleChange={onLocaleChange} />;
  }

  return (
    <PlayingScreen
      view={view}
      dispatch={dispatch}
      onLocaleChange={onLocaleChange}
      initialConfirmBeforePlay={initialConfig?.confirmBeforePlay ?? false}
    />
  );
}
