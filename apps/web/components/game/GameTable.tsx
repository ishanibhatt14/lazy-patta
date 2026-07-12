import type { Card } from '@lazy-patta/game-contracts';
import type { Locale, MessageKey } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import type {
  ComputerGameSeat,
  ComputerGameViewState,
  DrawReveal,
  HiddenCardSlot,
} from '../../lib/computer-game/types';
import { createTranslator } from '../../lib/i18n';
import { Button } from '../Button';
import { PlayingCard } from '../PlayingCard';

interface GameTableProps {
  readonly view: ComputerGameViewState;
  readonly locale: Locale;
  readonly onChooseCard: (positionToken: string) => void;
  readonly onRematch: () => void;
  readonly onRecover: () => void;
}

const POSITION_KEY: Record<ComputerGameSeat['position'], MessageKey> = {
  top: 'seat.positionTop',
  left: 'seat.positionLeft',
  right: 'seat.positionRight',
  bottom: 'seat.positionBottom',
};

function translatorFor(locale: Locale) {
  return createTranslator(locale);
}

function cardLabel(locale: Locale, card: Card): string {
  const { t, format } = translatorFor(locale);
  const rank = t(`rank.${card.rank}` as MessageKey);
  const suit = t(`suit.${card.suit}` as MessageKey);
  return format('card.accessibleFace', { rank, suit });
}

function SeatBadge({
  locale,
  seat,
}: {
  readonly locale: Locale;
  readonly seat: ComputerGameSeat;
}): ReactElement {
  const { t, format } = translatorFor(locale);
  const displayName = seat.isSelf ? t('computer.youName') : seat.name;
  const backs = Math.min(seat.cardCount, 5);

  return (
    <div
      className={[
        'flex min-w-24 flex-col items-center gap-1 rounded-lg bg-surface-primary px-3 py-3 text-center shadow-sm',
        seat.isActive ? 'ring-2 ring-brand-accent' : 'ring-1 ring-transparent',
        seat.isFinished ? 'opacity-90' : '',
      ].join(' ')}
      data-seat-id={seat.id}
      data-active={seat.isActive ? 'true' : 'false'}
    >
      <span
        className={[
          'flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-text-onBrand',
          seat.isFinished ? 'bg-brand-accent' : seat.isSelf ? 'bg-action-primary' : 'bg-game-table',
        ].join(' ')}
        aria-hidden
      >
        {seat.avatarInitial}
      </span>
      <span className="max-w-28 truncate text-sm font-bold text-text-primary">{displayName}</span>

      {!seat.isSelf && !seat.isFinished ? (
        <span className="flex h-8 items-end" aria-hidden>
          {Array.from({ length: backs }).map((_, index) => (
            <span
              key={index}
              className="-ml-3 first:ml-0 inline-block h-8 w-6 rounded-sm border border-action-primary bg-card-back shadow-sm"
            />
          ))}
        </span>
      ) : null}

      <span className="text-xs font-semibold text-action-primary">
        {seat.isFinished
          ? t('label.finished')
          : format('game.cardsRemainingCount', { count: seat.cardCount })}
      </span>

      {seat.isActive ? (
        <span className="flex items-center gap-1 text-xs font-bold text-brand-accent">
          <span aria-hidden>●</span>
          {t('computer.activeTurnMarker')}
        </span>
      ) : null}
    </div>
  );
}

function TurnBanner({
  locale,
  view,
}: {
  readonly locale: Locale;
  readonly view: ComputerGameViewState;
}): ReactElement {
  const { t, format } = translatorFor(locale);
  const { currentTurn } = view;
  const activeSeat = view.seats.find((seat) => seat.id === currentTurn.seatId);
  const positionLabel = activeSeat ? t(POSITION_KEY[activeSeat.position]) : '';

  const text = currentTurn.isSelf
    ? t('turn.yours')
    : currentTurn.seatId
      ? format('turn.playingSeat', { name: currentTurn.name, position: positionLabel })
      : t('computer.tableReady');

  return (
    <div
      className="flex items-center justify-center gap-2 rounded-lg bg-background-canvas/95 px-4 py-2 text-center shadow-sm"
      role="status"
      aria-live="polite"
    >
      <span aria-hidden className="text-lg">
        {currentTurn.isSelf ? '🫵' : '⏳'}
      </span>
      <span className="text-base font-bold text-action-primary">{text}</span>
    </div>
  );
}

function HiddenCardButton({
  locale,
  slot,
  onChooseCard,
}: {
  readonly locale: Locale;
  readonly slot: HiddenCardSlot;
  readonly onChooseCard: (positionToken: string) => void;
}): ReactElement {
  const { t, format } = translatorFor(locale);
  const label = format('card.hiddenAccessible', {
    position: slot.displayIndex,
    name: slot.ownerName,
  });

  return (
    <button
      type="button"
      disabled={!slot.isSelectable}
      onClick={() => onChooseCard(slot.positionToken)}
      className={[
        'computer-hidden-card flex flex-col items-center gap-1 rounded-lg p-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent disabled:cursor-not-allowed disabled:opacity-80',
        slot.isSelectable ? 'computer-hidden-card--selectable' : '',
      ].join(' ')}
      aria-label={label}
      data-position-token={slot.positionToken}
    >
      <span aria-hidden className="text-sm font-bold text-brand-accent">
        {slot.displayIndex}
      </span>
      <PlayingCard faceDown label={t('card.faceDown')} size="sm" />
      <span className="flex items-center gap-1 text-xs font-bold text-brand-accent">
        <span aria-hidden>▲</span>
        {t('computer.pickCue')}
      </span>
    </button>
  );
}

function OwnHand({
  locale,
  cards,
}: {
  readonly locale: Locale;
  readonly cards: readonly Card[];
}): ReactElement {
  const { t } = translatorFor(locale);
  return (
    <div
      className="flex min-h-32 w-full items-end justify-center overflow-x-auto px-2 pb-1"
      aria-label={t('computer.yourHand')}
    >
      <div className="flex items-end gap-2">
        {cards.length === 0 ? (
          <span className="text-sm font-semibold text-action-primary">
            {t('computer.handEmpty')}
          </span>
        ) : (
          cards.map((card) => (
            <PlayingCard key={card.id} card={card} label={cardLabel(locale, card)} size="md" />
          ))
        )}
      </div>
    </div>
  );
}

function DrawRevealPanel({
  locale,
  draw,
  reducedMotion,
}: {
  readonly locale: Locale;
  readonly draw: DrawReveal;
  readonly reducedMotion: boolean;
}): ReactElement | null {
  const { t } = translatorFor(locale);
  // Only the human's own drawn card is ever shown (their card). Bot draws carry
  // no identities, so there is nothing to render for them here.
  if (!draw.actorIsSelf || !draw.drawnCard) return null;

  return (
    <div className={reducedMotion ? 'computer-pair-reduced' : 'computer-pair-animation'}>
      {draw.pairRemoved && draw.matchedCard ? (
        <PlayingCard
          card={draw.matchedCard}
          label={cardLabel(locale, draw.matchedCard)}
          size="sm"
        />
      ) : null}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
          {t('computer.drawnCardLabel')}
        </span>
        <PlayingCard card={draw.drawnCard} label={cardLabel(locale, draw.drawnCard)} size="sm" />
      </div>
      {draw.pairRemoved ? (
        <>
          <span className="text-sm font-bold text-brand-accent">{t('game.jodiMaliGai')}</span>
          <span className="computer-bandhani-dot computer-bandhani-dot--one" aria-hidden />
          <span className="computer-bandhani-dot computer-bandhani-dot--two" aria-hidden />
          <span className="computer-bandhani-dot computer-bandhani-dot--three" aria-hidden />
        </>
      ) : null}
    </div>
  );
}

function CenterAction({
  locale,
  view,
}: {
  readonly locale: Locale;
  readonly view: ComputerGameViewState;
}): ReactElement {
  const { t, format } = translatorFor(locale);

  return (
    <div className="computer-center-action flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg bg-surface-primary p-4 text-center shadow-md">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent">
        {format(view.statusKey, view.statusValues)}
      </p>
      <p className="max-w-md text-lg font-bold leading-7 text-action-primary" aria-live="polite">
        {format(view.instructionKey, view.instructionValues)}
      </p>

      {view.draw ? (
        <DrawRevealPanel
          locale={locale}
          draw={view.draw}
          reducedMotion={view.settings.reducedMotion}
        />
      ) : null}

      {view.recoverableError ? (
        <p className="rounded-md bg-background-canvas px-3 py-2 text-sm text-status-error">
          {t('error.recoverable')}
        </p>
      ) : null}
    </div>
  );
}

function ResultOverlay({
  locale,
  view,
  onRematch,
}: {
  readonly locale: Locale;
  readonly view: ComputerGameViewState;
  readonly onRematch: () => void;
}): ReactElement | null {
  const { t, format } = translatorFor(locale);
  if (view.phase !== 'result' || !view.result) return null;

  const { gadhaChorIsSelf, gadhaChorName } = view.result;

  return (
    <div className="absolute inset-2 z-10 flex items-center justify-center rounded-lg bg-background-canvas/95 p-4">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-lg bg-surface-primary p-6 text-center shadow-md">
        <span aria-hidden className="text-4xl">
          🪔
        </span>
        <p className="text-sm font-bold uppercase tracking-widest text-brand-accent">
          {t('computer.resultEyebrow')}
        </p>
        <h2 className="text-2xl font-bold text-action-primary">
          {gadhaChorIsSelf
            ? t('computer.youAreGadhaChor')
            : format('result.gadhaChor', { name: gadhaChorName })}
        </h2>
        <p className="text-sm leading-6 text-text-primary">{t('computer.gadhaChorReveal')}</p>
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <Button className="min-h-12" onClick={onRematch}>
            {t('action.playAgain')}
          </Button>
          <a
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-action-primary px-5 py-2.5 text-base font-semibold text-action-primary transition hover:bg-action-primary hover:text-text-onBrand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t('action.returnHome')}
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorOverlay({
  locale,
  view,
  onRecover,
}: {
  readonly locale: Locale;
  readonly view: ComputerGameViewState;
  readonly onRecover: () => void;
}): ReactElement | null {
  const { t } = translatorFor(locale);
  if (view.phase !== 'error') return null;

  return (
    <div className="absolute inset-2 z-10 flex items-center justify-center rounded-lg bg-background-canvas/95 p-4">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-lg bg-surface-primary p-6 text-center shadow-md">
        <p className="text-base font-semibold text-status-error">{t('error.recoverable')}</p>
        <Button className="min-h-12" onClick={onRecover}>
          {t('action.returnToSetup')}
        </Button>
      </div>
    </div>
  );
}

export function GameTable({
  view,
  locale,
  onChooseCard,
  onRematch,
  onRecover,
}: GameTableProps): ReactElement {
  const topSeats = view.seats.filter((seat) => seat.position === 'top');
  const leftSeats = view.seats.filter((seat) => seat.position === 'left');
  const rightSeats = view.seats.filter((seat) => seat.position === 'right');
  const selfSeat = view.seats.find((seat) => seat.isSelf);

  return (
    <section className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col gap-3 overflow-hidden rounded-lg bg-game-table p-3 shadow-md lg:min-h-0 lg:aspect-[16/10] lg:p-5">
      <div className="computer-table-pattern" aria-hidden />

      <div className="relative z-0">
        <TurnBanner locale={locale} view={view} />
      </div>

      <div className="relative z-0 flex items-center justify-center gap-3">
        {topSeats.map((seat) => (
          <SeatBadge key={seat.id} locale={locale} seat={seat} />
        ))}
      </div>

      <div className="relative z-0 grid flex-1 grid-cols-1 items-center gap-3 sm:grid-cols-[auto_1fr_auto]">
        <div className="flex flex-row justify-center gap-3 sm:flex-col">
          {leftSeats.map((seat) => (
            <SeatBadge key={seat.id} locale={locale} seat={seat} />
          ))}
        </div>

        <div className="flex min-w-0 flex-col items-center gap-4">
          {view.hiddenCards.length > 0 ? (
            <div
              className="flex max-w-full flex-wrap justify-center gap-2"
              role="group"
              aria-label={createTranslator(locale).t('computer.eligibleCards')}
            >
              {view.hiddenCards.map((slot) => (
                <HiddenCardButton
                  key={slot.positionToken}
                  locale={locale}
                  slot={slot}
                  onChooseCard={onChooseCard}
                />
              ))}
            </div>
          ) : null}
          <CenterAction locale={locale} view={view} />
        </div>

        <div className="flex flex-row justify-center gap-3 sm:flex-col">
          {rightSeats.map((seat) => (
            <SeatBadge key={seat.id} locale={locale} seat={seat} />
          ))}
        </div>
      </div>

      <div className="relative z-0 flex flex-col items-center gap-2 rounded-lg bg-background-canvas/95 p-3 shadow-md">
        {selfSeat ? <SeatBadge locale={locale} seat={selfSeat} /> : null}
        <OwnHand locale={locale} cards={view.ownHand} />
      </div>

      <ResultOverlay locale={locale} view={view} onRematch={onRematch} />
      <ErrorOverlay locale={locale} view={view} onRecover={onRecover} />
    </section>
  );
}
