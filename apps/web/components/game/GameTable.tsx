import type { Card } from '@lazy-patta/game-contracts';
import {
  DEFAULT_LOCALE,
  formatMessage,
  getMessages,
  type MessageKey,
} from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import type {
  ComputerGameSeat,
  ComputerGameViewState,
  HiddenCardSlot,
} from '../../lib/computer-game/types';
import { Button } from '../Button';
import { PlayingCard } from '../PlayingCard';

const t = getMessages(DEFAULT_LOCALE);

interface GameTableProps {
  readonly state: ComputerGameViewState;
  readonly onAdvance: () => void;
  readonly onChooseCard: (positionToken: string) => void;
  readonly onRematch: () => void;
}

function message(key: MessageKey, values?: Readonly<Record<string, string | number>>): string {
  return formatMessage(DEFAULT_LOCALE, key, values ?? {});
}

function cardLabel(card: Card): string {
  const rank = t[`rank.${card.rank}` as MessageKey];
  const suit = t[`suit.${card.suit}` as MessageKey];
  return formatMessage(DEFAULT_LOCALE, 'card.accessibleFace', { rank, suit });
}

function SeatBadge({ seat }: { readonly seat: ComputerGameSeat }): ReactElement {
  return (
    <div
      className={[
        'flex min-w-24 flex-col items-center gap-1 rounded-lg bg-surface-primary px-3 py-3 text-center shadow-sm',
        seat.isActive ? 'ring-2 ring-brand-accent' : 'ring-1 ring-transparent',
        seat.isFinished ? 'opacity-80' : '',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-text-onBrand',
          seat.isFinished
            ? 'bg-status-error'
            : seat.isSelf
              ? 'bg-brand-accent'
              : 'bg-action-primary',
        ].join(' ')}
        aria-hidden
      >
        {seat.avatarInitial}
      </span>
      <span className="max-w-28 truncate text-sm font-bold text-text-primary">{seat.name}</span>
      <span className="text-xs font-semibold text-action-primary">
        {seat.isFinished
          ? t['label.finished']
          : formatMessage(DEFAULT_LOCALE, 'game.cardsRemainingCount', { count: seat.cardCount })}
      </span>
      {seat.isActive ? (
        <span className="text-xs text-text-primary">{t['computer.activeTurnMarker']}</span>
      ) : null}
    </div>
  );
}

function HiddenCardButton({
  slot,
  onChooseCard,
}: {
  readonly slot: HiddenCardSlot;
  readonly onChooseCard: (positionToken: string) => void;
}): ReactElement {
  const label = formatMessage(DEFAULT_LOCALE, 'card.hiddenAccessible', {
    position: slot.displayIndex,
    name: slot.ownerName,
  });

  return (
    <button
      type="button"
      disabled={!slot.isSelectable}
      onClick={() => onChooseCard(slot.positionToken)}
      className={[
        'computer-hidden-card min-h-12 min-w-12 rounded-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent disabled:cursor-not-allowed disabled:opacity-80',
        slot.isSelectable ? 'computer-hidden-card--selectable' : '',
      ].join(' ')}
      aria-label={label}
    >
      <PlayingCard faceDown label={t['card.faceDown']} size="sm" />
      {slot.isSelectable ? (
        <span className="mt-1 block text-xs font-bold text-brand-accent">
          {t['computer.pickCue']}
        </span>
      ) : null}
    </button>
  );
}

function OwnHand({ cards }: { readonly cards: readonly Card[] }): ReactElement {
  return (
    <div
      className="flex min-h-32 w-full items-end justify-center overflow-x-auto px-2 pb-1"
      aria-label={t['computer.yourHand']}
    >
      <div className="flex items-end gap-2">
        {cards.map((card) => (
          <PlayingCard key={card.id} card={card} label={cardLabel(card)} size="md" />
        ))}
      </div>
    </div>
  );
}

function CenterAction({
  state,
  onAdvance,
}: {
  readonly state: ComputerGameViewState;
  readonly onAdvance: () => void;
}): ReactElement {
  const canAdvance =
    state.phase === 'dealing' ||
    state.phase === 'initialPairs' ||
    state.phase === 'pairFound' ||
    state.phase === 'botTurn' ||
    state.phase === 'playerFinished';

  return (
    <div className="computer-center-action flex min-h-44 flex-col items-center justify-center gap-4 rounded-lg bg-surface-primary p-4 text-center shadow-md">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent">
        {message(state.statusKey, state.statusValues)}
      </p>
      <p className="max-w-md text-xl font-bold leading-8 text-action-primary" aria-live="polite">
        {message(state.instructionKey, state.instructionValues)}
      </p>

      {state.pairAnimation ? (
        <div
          className={
            state.settings.reducedMotion ? 'computer-pair-reduced' : 'computer-pair-animation'
          }
        >
          <PlayingCard
            card={state.pairAnimation.matchedCard}
            label={cardLabel(state.pairAnimation.matchedCard)}
            size="sm"
          />
          <span className="text-sm font-bold text-brand-accent">
            {t[state.pairAnimation.captionKey]}
          </span>
          <PlayingCard
            card={state.pairAnimation.drawnCard}
            label={cardLabel(state.pairAnimation.drawnCard)}
            size="sm"
          />
          <span className="computer-bandhani-dot computer-bandhani-dot--one" aria-hidden />
          <span className="computer-bandhani-dot computer-bandhani-dot--two" aria-hidden />
          <span className="computer-bandhani-dot computer-bandhani-dot--three" aria-hidden />
        </div>
      ) : null}

      {state.recoverableErrorKey ? (
        <p className="rounded-md bg-background-canvas px-3 py-2 text-sm text-status-error">
          {t[state.recoverableErrorKey]}
        </p>
      ) : null}

      {canAdvance ? (
        <Button variant="secondary" className="min-h-12" onClick={onAdvance}>
          {state.phase === 'botTurn' ? t['computer.watchBotAction'] : t['computer.continue']}
        </Button>
      ) : null}
    </div>
  );
}

function ResultOverlay({
  state,
  onRematch,
}: {
  readonly state: ComputerGameViewState;
  readonly onRematch: () => void;
}): ReactElement | null {
  if (state.phase !== 'result' || !state.winnerName || !state.gadhaChorName) {
    return null;
  }

  return (
    <div className="absolute inset-4 z-10 flex items-center justify-center rounded-lg bg-background-canvas/95 p-4">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-lg bg-surface-primary p-6 text-center shadow-md">
        <p className="text-sm font-bold uppercase tracking-widest text-brand-accent">
          {t['computer.resultEyebrow']}
        </p>
        <h2 className="text-3xl font-bold text-action-primary">
          {formatMessage(DEFAULT_LOCALE, 'result.winner', { name: state.winnerName })}
        </h2>
        <p className="rounded-md bg-background-canvas px-4 py-3 text-base font-semibold text-text-primary">
          {formatMessage(DEFAULT_LOCALE, 'result.gadhaChor', { name: state.gadhaChorName })}
        </p>
        <p className="text-sm leading-6 text-text-primary">{t['computer.gadhaChorReveal']}</p>
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <Button className="min-h-12" onClick={onRematch}>
            {t['action.playAgain']}
          </Button>
          <a
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-action-primary px-5 py-2.5 text-base font-semibold text-action-primary transition hover:bg-action-primary hover:text-text-onBrand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t['action.returnHome']}
          </a>
        </div>
      </div>
    </div>
  );
}

export function GameTable({
  state,
  onAdvance,
  onChooseCard,
  onRematch,
}: GameTableProps): ReactElement {
  const topSeats = state.seats.filter((seat) => seat.position === 'top');
  const sideSeats = state.seats.filter(
    (seat) => seat.position === 'left' || seat.position === 'right',
  );
  const selfSeat = state.seats.find((seat) => seat.isSelf);

  return (
    <section className="relative mx-auto flex aspect-auto min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col gap-4 overflow-hidden rounded-lg bg-game-table p-3 shadow-md lg:aspect-[16/10] lg:min-h-0 lg:p-5">
      <div className="computer-table-pattern" aria-hidden />
      <div className="relative z-0 flex items-center justify-center gap-3">
        {topSeats.map((seat) => (
          <SeatBadge key={seat.id} seat={seat} />
        ))}
      </div>

      <div className="relative z-0 grid flex-1 grid-cols-1 items-center gap-3 sm:grid-cols-[auto_1fr_auto]">
        <div className="flex flex-row justify-center gap-3 sm:flex-col">
          {sideSeats
            .filter((seat) => seat.position === 'left')
            .map((seat) => (
              <SeatBadge key={seat.id} seat={seat} />
            ))}
        </div>

        <div className="flex min-w-0 flex-col items-center gap-4">
          <div className="flex max-w-full flex-wrap justify-center gap-2">
            {state.hiddenCards.map((slot) => (
              <HiddenCardButton key={slot.positionToken} slot={slot} onChooseCard={onChooseCard} />
            ))}
          </div>
          <CenterAction state={state} onAdvance={onAdvance} />
        </div>

        <div className="flex flex-row justify-center gap-3 sm:flex-col">
          {sideSeats
            .filter((seat) => seat.position === 'right')
            .map((seat) => (
              <SeatBadge key={seat.id} seat={seat} />
            ))}
        </div>
      </div>

      <div className="relative z-0 flex flex-col items-center gap-2 rounded-lg bg-background-canvas/95 p-3 shadow-md">
        {selfSeat ? <SeatBadge seat={selfSeat} /> : null}
        <OwnHand cards={state.ownHand} />
      </div>

      <ResultOverlay state={state} onRematch={onRematch} />
    </section>
  );
}
