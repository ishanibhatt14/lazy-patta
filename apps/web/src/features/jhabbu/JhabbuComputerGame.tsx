'use client';

import type { BotDifficulty, Card } from '@lazy-patta/game-contracts';
import type { Locale } from '@lazy-patta/localization';
import Link from 'next/link';
import type { ReactElement } from 'react';
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
import { fanCardStyle, useHandLayout } from '../../../lib/hand-layout';
import { createTranslator } from '../../../lib/i18n';
import { usePreferredLocale } from '../../../lib/locale/preferred-locale-context';
import type { ComputerGameConfig } from '../../../lib/mobile/computer-session';
import { resolveCardTap } from '../../../lib/mobile/play-interaction';

import { JhabbuAccountSheet } from './JhabbuAccountSheet';
import { JhabbuScoreDrawer } from './JhabbuScoreDrawer';
import { createJhabbuController, selectJhabbuViewState, type JhabbuController } from './controller';
import type {
  JhabbuControllerState,
  JhabbuIntent,
  JhabbuRoundScore,
  JhabbuViewState,
} from './types';

const PLAYER_COUNTS = [3, 4, 5, 6] as const;
const SESSION_STORAGE_KEY = 'lazy-patta:jhabbu-session:v1';

interface StoredJhabbuSession {
  readonly humanName?: string;
  readonly roundScores?: readonly JhabbuRoundScore[];
}

function readStoredSession(): StoredJhabbuSession {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as StoredJhabbuSession;
    return {
      humanName: typeof parsed.humanName === 'string' ? parsed.humanName : undefined,
      roundScores: Array.isArray(parsed.roundScores) ? parsed.roundScores : undefined,
    };
  } catch {
    return {};
  }
}

function writeStoredSession(state: JhabbuControllerState): void {
  if (typeof window === 'undefined' || !state.hasHydratedSession) return;
  window.localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      humanName: state.humanName,
      roundScores: state.roundScores,
    }),
  );
}
const DIFFICULTIES: readonly BotDifficulty[] = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABEL_KEY: Record<
  BotDifficulty,
  'computer.difficultyEasy' | 'computer.difficultyMedium' | 'computer.difficultyHard'
> = {
  easy: 'computer.difficultyEasy',
  medium: 'computer.difficultyMedium',
  hard: 'computer.difficultyHard',
};

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
 * deal, let bots step on their turns, and always play the first playable card
 * (or draw the waste) on the human's turn until the match ends.
 */
function pickPreviewIntent(view: JhabbuViewState): JhabbuIntent | null {
  if (view.phase === 'setup') return { type: 'start' };
  if (view.phase === 'playing') {
    if (!view.isHumanTurn) return { type: 'botStep' };
    const [cardId] = view.playableCardIds;
    if (cardId !== undefined) return { type: 'playCard', cardId };
    if (view.canDrawFromWaste) return { type: 'drawFromWaste' };
  }
  return null;
}

function rankKey(rank: Card['rank']) {
  return `rank.${rank}` as const;
}

function suitKey(suit: Card['suit']) {
  return `suit.${suit}` as const;
}

function cardLabel(card: Card, locale: Locale): string {
  const { t, format } = createTranslator(locale);
  return format('card.accessibleFace', {
    rank: t(rankKey(card.rank)),
    suit: t(suitKey(card.suit)),
  });
}

function cardShortName(card: Pick<Card, 'rank' | 'suit'>): string {
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

function playerName(view: JhabbuViewState, playerId: string): string {
  return view.seats.find((seat) => seat.id === playerId)?.name ?? playerId;
}

function seatDisplayName(seat: JhabbuViewState['seats'][number], locale: Locale): string {
  return seat.isSelf ? createTranslator(locale).t('computer.youName') : seat.name;
}

function setupHint(view: JhabbuViewState): string {
  const { t, format } = createTranslator(view.locale);
  return format('jhabbu.quickGameSummary', {
    name: view.humanName.trim() || t('computer.youName'),
    count: view.playerCount,
  });
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
  const { t, format } = createTranslator(view.locale);

  return (
    <main className="jh-shell min-h-screen px-4 py-5 text-text-primary">
      <section className="mx-auto flex max-w-3xl flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-bold text-action-primary underline decoration-action-secondary decoration-2 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t('lobby.backToGames')}
          </Link>
          <LocaleSwitcher locale={view.locale} onLocaleChange={onLocaleChange} />
        </div>

        <section className="jh-setup-card rounded-lg bg-surface-primary p-5 shadow-md">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-accent">
            {t('games.jhabbu.name')}
          </p>
          <h1 className="mt-2 text-4xl font-black leading-tight text-action-primary md:text-5xl">
            {t('jhabbu.setupHeadline')}
          </h1>
          <p className="mt-3 max-w-xl text-lg leading-8 text-text-primary">
            {t('jhabbu.setupSubheadline')}
          </p>

          <Button
            size="lg"
            className="mt-6 min-h-14 w-full sm:w-auto"
            onClick={() => dispatch({ type: 'start' })}
          >
            {t('jhabbu.startFourPlayerGame')}
          </Button>
          <p className="mt-3 text-sm font-semibold text-text-primary">{setupHint(view)}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <details className="rounded-md border border-action-primary/20 bg-background-canvas p-3">
              <summary className="cursor-pointer text-sm font-bold text-action-primary">
                {t('computer.customizeTable')}
              </summary>

              <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-text-primary">
                {t('jhabbu.nameLabel')}
                <input
                  className="min-h-12 rounded-md border border-brand-accent bg-surface-primary px-3 py-2"
                  value={view.humanName}
                  maxLength={32}
                  placeholder={t('computer.youName')}
                  onChange={(event) =>
                    dispatch({ type: 'setHumanName', humanName: event.target.value })
                  }
                />
                <span className="text-xs font-normal leading-5 text-text-primary">
                  {t('jhabbu.nameHelp')}
                </span>
              </label>

              <div className="mt-4">
                <h2 className="text-sm font-bold text-action-primary">{t('jhabbu.tableSize')}</h2>
                <div className="mt-3 flex flex-wrap gap-2" aria-label={t('jhabbu.tableSize')}>
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
                      {format('lobby.playerCount', { count })}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <h2 className="text-sm font-bold text-action-primary">
                  {t('computer.difficultyLabel')}
                </h2>
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

            <details className="rounded-md border border-action-primary/20 bg-background-canvas p-3">
              <summary className="cursor-pointer text-sm font-bold text-action-primary">
                {t('jhabbu.howToPlay')}
              </summary>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
                <li>{t('jhabbu.quickRuleOpening')}</li>
                <li>{t('jhabbu.quickRuleFollow')}</li>
                <li>{t('jhabbu.quickRuleThulla')}</li>
                <li>{t('jhabbu.quickRuleGoal')}</li>
              </ul>
            </details>
          </div>
        </section>
      </section>
    </main>
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
  onOpenHistory,
  onOpenAccount,
}: {
  readonly open: boolean;
  readonly view: JhabbuViewState;
  readonly largeCards: boolean;
  readonly highContrast: boolean;
  readonly confirmBeforePlay: boolean;
  readonly leftHanded: boolean;
  readonly onClose: () => void;
  readonly onLocaleChange: (locale: JhabbuViewState['locale']) => void;
  readonly onToggleReducedMotion: () => void;
  readonly onToggleLargeCards: () => void;
  readonly onToggleHighContrast: () => void;
  readonly onToggleConfirmBeforePlay: () => void;
  readonly onToggleLeftHanded: () => void;
  readonly onOpenHistory: () => void;
  readonly onOpenAccount: () => void;
}): ReactElement | null {
  const { t } = createTranslator(view.locale);
  if (!open) return null;

  return (
    <div className="jh-sheet-wrap">
      <button
        type="button"
        className="jh-sheet-scrim"
        aria-label={t('action.close')}
        onClick={onClose}
      />
      <section
        className="jh-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jh-settings-title"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="jh-settings-title" className="text-lg font-black text-action-primary">
            {t('jhabbu.settingsTitle')}
          </h2>
          <button
            type="button"
            className="jh-icon-button"
            onClick={onClose}
            aria-label={t('action.close')}
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        <div className="mt-4">
          <LocaleSwitcher locale={view.locale} onLocaleChange={onLocaleChange} />
        </div>
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            className="jh-setting-row"
            onClick={onToggleReducedMotion}
            aria-pressed={view.reducedMotion}
          >
            <span>{t('settings.reducedMotion')}</span>
            <span>{view.reducedMotion ? t('settings.on') : t('settings.off')}</span>
          </button>
          <button
            type="button"
            className="jh-setting-row"
            onClick={onToggleLargeCards}
            aria-pressed={largeCards}
          >
            <span>{t('settings.largeCards')}</span>
            <span>{largeCards ? t('settings.on') : t('settings.off')}</span>
          </button>
          <button
            type="button"
            className="jh-setting-row"
            onClick={onToggleHighContrast}
            aria-pressed={highContrast}
          >
            <span>{t('settings.highContrastCards')}</span>
            <span>{highContrast ? t('settings.on') : t('settings.off')}</span>
          </button>
          <button
            type="button"
            className="jh-setting-row"
            onClick={onToggleConfirmBeforePlay}
            aria-pressed={confirmBeforePlay}
          >
            <span>{t('settings.confirmBeforePlay')}</span>
            <span>{confirmBeforePlay ? t('settings.on') : t('settings.off')}</span>
          </button>
          <button
            type="button"
            className="jh-setting-row"
            onClick={onToggleLeftHanded}
            aria-pressed={leftHanded}
          >
            <span>{t('settings.leftHanded')}</span>
            <span>{leftHanded ? t('settings.on') : t('settings.off')}</span>
          </button>
        </div>
        <div className="mt-4 grid gap-2">
          <Button variant="secondary" className="w-full" onClick={onOpenHistory}>
            {t('jhabbu.historyButton')}
          </Button>
          <Button variant="ghost" className="w-full" onClick={onOpenAccount}>
            {t('jhabbu.accountButton')}
          </Button>
        </div>
      </section>
    </div>
  );
}

function HistoryDrawer({
  open,
  view,
  onClose,
}: {
  readonly open: boolean;
  readonly view: JhabbuViewState;
  readonly onClose: () => void;
}): ReactElement | null {
  const { t, format } = createTranslator(view.locale);
  if (!open) return null;

  return (
    <div className="jh-sheet-wrap">
      <button
        type="button"
        className="jh-sheet-scrim"
        aria-label={t('action.close')}
        onClick={onClose}
      />
      <section
        className="jh-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jh-history-title"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="jh-history-title" className="text-lg font-black text-action-primary">
            {t('jhabbu.historyTitle')}
          </h2>
          <button
            type="button"
            className="jh-icon-button"
            onClick={onClose}
            aria-label={t('action.close')}
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        {view.events.length === 0 ? (
          <p className="mt-4 rounded-md bg-background-canvas p-3 text-sm font-semibold text-text-primary">
            {t('jhabbu.noHistoryYet')}
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {view.events.map((event) => (
              <li key={event.id} className="rounded-md bg-background-canvas p-3 text-sm leading-6">
                {format(event.messageKey, event.values)}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

/** The centre of the felt: led-suit / power / waste chips and the current trick. */
function TrickFelt({ view }: { readonly view: JhabbuViewState }): ReactElement {
  const { t } = createTranslator(view.locale);
  const latestThulla = view.currentTrick.find((entry) => entry.isThulla);

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="imm-pod-badge">{view.ledSuit ?? t('jhabbu.noLedSuit')}</span>
        <span className="imm-pod-badge">
          {t('jhabbu.powerBadge')}: {view.powerPlayerName}
        </span>
        <span className="imm-pod-badge">
          {t('jhabbu.wastePile')} {view.wasteCount}
        </span>
      </div>

      {latestThulla ? (
        <p className="imm-zone-hint font-bold text-brand-accent">{t('jhabbu.thullaCallout')}</p>
      ) : null}

      {view.currentTrick.length > 0 ? (
        <div className="imm-play-zone" aria-label={t('jhabbu.currentTrick')}>
          {view.currentTrick.map((entry) => (
            <figure
              key={`${entry.playerId}-${entry.card.id}-${entry.sequence}`}
              className="imm-trick-card"
              data-thulla={entry.isThulla ? 'true' : 'false'}
            >
              <PlayingCard card={entry.card} size="sm" label={cardLabel(entry.card, view.locale)} />
              <figcaption>{playerName(view, entry.playerId)}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="imm-zone-hint">{t('jhabbu.emptyTrick')}</p>
      )}
    </div>
  );
}

function PlayerHandFan({
  view,
  largeCards,
  armedCardId,
  invalidCardId,
  onSelectCard,
  onDrawFromWaste,
}: {
  readonly view: JhabbuViewState;
  readonly largeCards: boolean;
  readonly armedCardId: string | null;
  readonly invalidCardId: string | null;
  readonly onSelectCard: (cardId: string) => void;
  readonly onDrawFromWaste: () => void;
}): ReactElement {
  const { t, format } = createTranslator(view.locale);
  const playable = new Set(view.playableCardIds);
  const { ref, layout } = useHandLayout(view.ownHand.length, largeCards);

  const hintKey = invalidCardId
    ? ('jhabbu.invalidCardHint' as const)
    : armedCardId
      ? ('settings.confirmTapAgain' as const)
      : null;

  return (
    <section className="w-full" aria-label={t('jhabbu.yourCards')}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-text-onBrand">
              {view.isHumanTurn
                ? view.ledSuit
                  ? format('jhabbu.turnFollowSuit', { suit: view.ledSuit })
                  : t('jhabbu.turnLeadCard')
                : format('jhabbu.botThinking', {
                    name: view.currentPlayerName || view.powerPlayerName,
                  })}
            </h2>
            <p className="text-xs font-semibold text-text-onBrand/85" aria-live="polite">
              {hintKey
                ? t(hintKey)
                : view.playableCardIds.length > 0
                  ? format('jhabbu.playableCount', { count: view.playableCardIds.length })
                  : t('jhabbu.noPlayableCards')}
            </p>
          </div>
          {view.canDrawFromWaste ? (
            <Button size="sm" className="min-h-10 bg-brand-accent" onClick={onDrawFromWaste}>
              {t('jhabbu.drawFromWaste')}
            </Button>
          ) : null}
        </div>

        <div ref={ref} className="jh-hand-rail">
          <div
            className="flex items-end justify-center"
            style={{ width: `${layout.totalWidth}px`, maxWidth: '100%' }}
          >
            {view.ownHand.map((card, index) => {
              const isPlayable = view.isHumanTurn && playable.has(card.id);
              return (
                <button
                  key={card.id}
                  type="button"
                  className="jh-card-button rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                  style={fanCardStyle(index, view.ownHand.length, layout)}
                  data-playable={isPlayable ? 'true' : 'false'}
                  data-disabled={view.isHumanTurn ? 'false' : 'true'}
                  data-armed={card.id === armedCardId ? 'true' : 'false'}
                  data-invalid={card.id === invalidCardId ? 'true' : 'false'}
                  onClick={() => onSelectCard(card.id)}
                  disabled={!view.isHumanTurn}
                  aria-label={
                    isPlayable
                      ? format('jhabbu.playCardLabel', { card: cardShortName(card) })
                      : format('jhabbu.cardNotPlayable', { card: cardShortName(card) })
                  }
                >
                  <PlayingCard
                    card={card}
                    size={layout.size}
                    label={cardLabel(card, view.locale)}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function JhabbuResult({
  view,
  onRematch,
  onViewScores,
}: {
  readonly view: JhabbuViewState;
  readonly onRematch: () => void;
  readonly onViewScores: () => void;
}): ReactElement | null {
  const translator = createTranslator(view.locale);
  const { t, format } = translator;
  const [shareNote, setShareNote] = useState<string | null>(null);
  const isResult = view.phase === 'result';
  const roundNumber = view.roundScores.length;

  useEffect(() => {
    if (!isResult) return;
    trackGrowthEvent({
      name: 'round_completed',
      gameSlug: 'jhabbu',
      playerCount: view.playerCount,
      roundNumber,
    });
  }, [isResult, view.playerCount, roundNumber]);

  if (!isResult) return null;

  const self = view.seats.find((seat) => seat.isSelf);
  const selfPosition = self?.isFinished ? self.finishPosition : null;
  const loser = view.seats.find((seat) => seat.id === view.result?.loserId);
  const loserCards = loser ? (view.result?.remainingCards[loser.id] ?? loser.cardCount) : 0;

  const firstAway = view.finishOrderNames[0];
  const heroSeat =
    view.seats.find((seat) => seatDisplayName(seat, view.locale) === firstAway) ??
    view.seats.find((seat) => seat.name === firstAway) ??
    view.seats.find((seat) => seat.isFinished) ??
    null;

  const onShare = async (): Promise<void> => {
    const shareable = buildShareableGameResult({
      gameSlug: 'jhabbu',
      gameName: t('games.jhabbu.name'),
      winnerDisplayName: firstAway,
      playerCount: view.playerCount,
      roundNumber,
      seriesLeaderDisplayName: view.runningScores[0]?.playerName,
      t: translator,
    });
    const outcome = await shareGameResult(shareable, translator);
    if (outcome === 'copied') setShareNote(t('computer.shareCopied'));
  };

  return (
    <ImmersiveResultOverlay
      open
      titleId="jh-result-title"
      eyebrow={t('jhabbu.roundComplete')}
      title={
        selfPosition
          ? format('jhabbu.resultYouGotAway', { position: selfPosition })
          : t('jhabbu.resultFamilyLine')
      }
      hero={
        heroSeat
          ? { seatId: heroSeat.id, initial: heroSeat.avatarInitial, isSelf: heroSeat.isSelf }
          : null
      }
      highlight={format('jhabbu.resultLoserWithCards', {
        name: view.loserName,
        count: loserCards,
      })}
      playAgainLabel={t('jhabbu.playAgain')}
      onRematch={onRematch}
      secondaryLabel={t('jhabbu.scoresButton')}
      onSecondary={onViewScores}
      shareLabel={t('action.shareResult')}
      onShare={() => void onShare()}
      returnHomeLabel={t('action.returnHome')}
      returnHomeHref="/mobile"
    >
      <ol className="w-full space-y-1 rounded-md bg-background-canvas p-4 text-left">
        {view.finishOrderNames.map((name) => (
          <li key={name} className="font-semibold text-text-primary">
            {name}
          </li>
        ))}
        {view.loserName ? (
          <li className="font-black text-action-primary">{view.loserName}</li>
        ) : null}
      </ol>
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
  readonly view: JhabbuViewState;
  readonly dispatch: (intent: JhabbuIntent) => void;
  readonly onLocaleChange: (locale: JhabbuViewState['locale']) => void;
  readonly initialConfirmBeforePlay?: boolean;
}): ReactElement {
  const { t, format } = createTranslator(view.locale);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [largeCards, setLargeCards] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [confirmBeforePlay, setConfirmBeforePlay] = useState(initialConfirmBeforePlay);
  const [leftHanded, setLeftHanded] = useState(false);
  const [armedCardId, setArmedCardId] = useState<string | null>(null);
  const [invalidCardId, setInvalidCardId] = useState<string | null>(null);
  const leaderName =
    view.roundScores.length > 0 ? (view.runningScores[0]?.playerName ?? null) : null;

  // A stale arming or shake must never outlive the human's turn.
  useEffect(() => {
    if (!view.isHumanTurn) {
      setArmedCardId(null);
      setInvalidCardId(null);
    }
  }, [view.isHumanTurn]);

  useEffect(() => {
    if (!invalidCardId) return;
    const timer = window.setTimeout(() => setInvalidCardId(null), 700);
    return () => window.clearTimeout(timer);
  }, [invalidCardId]);

  const onSelectCard = (cardId: string): void => {
    const outcome = resolveCardTap({
      cardId,
      isHumanTurn: view.isHumanTurn,
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

  const renderPod = (seat: JhabbuViewState['seats'][number]): ReactElement => (
    <ImmersivePod
      key={seat.id}
      seatId={seat.id}
      initial={seat.avatarInitial}
      name={seatDisplayName(seat, view.locale)}
      isSelf={seat.isSelf}
      isActive={seat.isActive}
      isFinished={seat.isFinished}
      badge={
        seat.isFinished
          ? t('jhabbu.gotAway')
          : format('jhabbu.podCardCount', { count: seat.cardCount })
      }
      badgeTone={seat.isFinished ? 'accent' : 'default'}
      tag={seat.isPower ? t('jhabbu.powerBadge') : undefined}
      activeMarker={t('computer.activeTurnMarker')}
    />
  );

  const toolbar = (
    <>
      <button type="button" className="imm-toolbar-button" onClick={() => setScoreOpen(true)}>
        {t('jhabbu.scoresButton')}
      </button>
      <button
        type="button"
        className="imm-toolbar-button"
        onClick={() => setSettingsOpen(true)}
        aria-label={t('action.settings')}
      >
        <span aria-hidden>⚙️</span>
      </button>
    </>
  );

  return (
    <>
      <ImmersiveScene
        ariaLabel={t('jhabbu.modeLabel')}
        modeLabel={t('jhabbu.modeLabel')}
        statusText={format(view.statusKey, view.statusValues)}
        statusIsSelf={view.isHumanTurn}
        reducedMotion={view.reducedMotion}
        highContrast={highContrast}
        leftHanded={leftHanded}
        toolbar={toolbar}
        top={opponents.map(renderPod)}
        middle={<TrickFelt view={view} />}
        bottom={
          <>
            {selfSeat ? renderPod(selfSeat) : null}
            <PlayerHandFan
              view={view}
              largeCards={largeCards}
              armedCardId={armedCardId}
              invalidCardId={invalidCardId}
              onSelectCard={onSelectCard}
              onDrawFromWaste={() => dispatch({ type: 'drawFromWaste' })}
            />
          </>
        }
        overlay={
          <JhabbuResult
            view={view}
            onRematch={() => dispatch({ type: 'rematch' })}
            onViewScores={() => setScoreOpen(true)}
          />
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
        onOpenHistory={() => {
          setSettingsOpen(false);
          setHistoryOpen(true);
        }}
        onOpenAccount={() => {
          setSettingsOpen(false);
          setAccountOpen(true);
        }}
      />
      <HistoryDrawer open={historyOpen} view={view} onClose={() => setHistoryOpen(false)} />
      <JhabbuScoreDrawer
        open={scoreOpen}
        view={view}
        locale={view.locale}
        leaderName={leaderName}
        onClose={() => setScoreOpen(false)}
      />
      <JhabbuAccountSheet
        open={accountOpen}
        locale={view.locale}
        humanName={view.humanName}
        playerCount={view.playerCount}
        roundScores={view.roundScores}
        onClose={() => setAccountOpen(false)}
      />
    </>
  );
}

export function JhabbuComputerGame({
  initialConfig,
  autoStart = false,
}: {
  readonly initialConfig?: ComputerGameConfig;
  readonly autoStart?: boolean;
} = {}): ReactElement {
  const { locale: preferredLocale, setLocale: setPreferredLocale } = usePreferredLocale();
  const controllerRef = useRef<JhabbuController | null>(null);
  const autoStartedRef = useRef(false);

  if (controllerRef.current === null) {
    const rng = seededRng();
    // Seeded runs pin `hard` so bot play stays deterministic; real players
    // default to `medium` and can change it on the setup screen.
    controllerRef.current = createJhabbuController(
      rng ?? createCryptoRng(),
      preferredLocale,
      initialConfig?.difficulty ?? (rng ? 'hard' : 'medium'),
    );
  }

  const controller = controllerRef.current;
  const [state, dispatch] = useReducer(
    (current: JhabbuControllerState, intent: JhabbuIntent) => controller.dispatch(current, intent),
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
            selectView: selectJhabbuViewState,
            pickIntent: pickPreviewIntent,
            isResult: (view) => view.phase === 'result',
          })
        : base,
  );
  const view = selectJhabbuViewState(state);

  useEffect(() => {
    if (initialConfig) return;
    dispatch({ type: 'hydrateSession', ...readStoredSession() });
  }, [initialConfig]);

  useEffect(() => {
    writeStoredSession(state);
  }, [state]);

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || state.phase !== 'setup') return;
    autoStartedRef.current = true;
    dispatch({ type: 'start' });
  }, [autoStart, state.phase]);

  useEffect(() => {
    if (view.phase !== 'playing' || view.isHumanTurn) return;
    const delay = view.reducedMotion ? 220 : 650;
    const timer = window.setTimeout(() => dispatch({ type: 'botStep' }), delay);
    return () => window.clearTimeout(timer);
    // Keyed on `state.game` (a fresh object every engine step), not the actor's
    // name: when the same bot acts on consecutive turns (e.g. picks up a trick
    // and leads again) a name-keyed effect would never re-fire and freeze play.
  }, [view.phase, view.isHumanTurn, state.game, view.reducedMotion]);

  const onLocaleChange = (next: JhabbuViewState['locale']): void => {
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
