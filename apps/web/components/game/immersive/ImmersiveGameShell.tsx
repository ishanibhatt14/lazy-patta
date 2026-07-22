'use client';

import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import type { ComputerGameSeat, ComputerGameViewState } from '../../../lib/computer-game/types';
import { createTranslator } from '../../../lib/i18n';
import { resolveCardTap } from '../../../lib/mobile/play-interaction';
import { Button } from '../../Button';
import { CourtyardBackdropPlaceholder, type ReactionKind } from '../art';

import { ActionStage } from './ActionStage';
import { GadhaReveal } from './GadhaReveal';
import { GameSettingsSheet } from './GameSettingsSheet';
import { GameTopBar } from './GameTopBar';
import { PlayerHandFan } from './PlayerHandFan';
import { PlayerPod } from './PlayerPod';

interface ImmersiveGameShellProps {
  readonly view: ComputerGameViewState;
  readonly locale: Locale;
  readonly onChooseCard: (positionToken: string) => void;
  readonly onRematch: () => void;
  readonly onRecover: () => void;
  readonly onToggleSound: () => void;
  readonly onToggleReducedMotion: () => void;
  readonly onLocaleChange: (locale: Locale) => void;
  readonly onHowToPlay: () => void;
  readonly initialConfirmBeforePlay?: boolean;
  readonly initialLeftHanded?: boolean;
}

interface Reaction {
  readonly seatId: string;
  readonly kind: ReactionKind;
  readonly text: string;
}

/** The one active reaction, derived from the current draw (no extra timers). */
function currentReaction(view: ComputerGameViewState, pairText: string): Reaction | null {
  const draw = view.draw;
  if (!draw || !draw.pairRemoved) return null;
  const seat = view.seats.find((candidate) =>
    draw.actorIsSelf ? candidate.isSelf : candidate.name === draw.actorName,
  );
  if (!seat) return null;
  return { seatId: seat.id, kind: 'pair', text: pairText };
}

export function ImmersiveGameShell({
  view,
  locale,
  onChooseCard,
  onRematch,
  onRecover,
  onToggleSound,
  onToggleReducedMotion,
  onLocaleChange,
  onHowToPlay,
  initialConfirmBeforePlay = false,
  initialLeftHanded = false,
}: ImmersiveGameShellProps): ReactElement {
  const { t } = createTranslator(locale);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [largeCards, setLargeCards] = useState(false);
  const [confirmBeforePlay, setConfirmBeforePlay] = useState(initialConfirmBeforePlay);
  const [leftHanded, setLeftHanded] = useState(initialLeftHanded);
  // The slot armed by a first tap, awaiting a confirming second tap.
  const [armedToken, setArmedToken] = useState<string | null>(null);
  // First-turn coaching: shown until the human completes one draw (or dismisses).
  const [hasDrawnOnce, setHasDrawnOnce] = useState(false);
  const [coachDismissed, setCoachDismissed] = useState(false);

  const reaction = currentReaction(view, t('game.jodiMaliGai'));
  const reactionFor = (seat: ComputerGameSeat): Reaction | null =>
    reaction && reaction.seatId === seat.id ? reaction : null;

  const topSeats = view.seats.filter((seat) => seat.position === 'top');
  const leftSeats = view.seats.filter((seat) => seat.position === 'left');
  const rightSeats = view.seats.filter((seat) => seat.position === 'right');
  const selfSeat = view.seats.find((seat) => seat.isSelf);

  const drawnCardId = view.draw?.actorIsSelf ? (view.draw.drawnCard?.id ?? null) : null;

  // The single opponent the human draws from this turn (all selectable slots
  // share one owner). Drives pod emphasis/dim and coach-mark visibility.
  const drawSourceOwnerId = view.hiddenCards.find((slot) => slot.isSelectable)?.ownerId ?? null;
  const isHumanDrawTurn = view.currentTurn.isSelf && drawSourceOwnerId !== null;
  const showCoachMark = isHumanDrawTurn && !hasDrawnOnce && !coachDismissed && armedToken === null;

  const selectableTokens = view.hiddenCards
    .filter((slot) => slot.isSelectable)
    .map((slot) => slot.positionToken);

  // A pending arm never survives the opponent's turn or a fresh deal.
  useEffect(() => {
    if (!isHumanDrawTurn) setArmedToken(null);
  }, [isHumanDrawTurn]);

  const handleChooseCard = (positionToken: string): void => {
    const outcome = resolveCardTap({
      cardId: positionToken,
      isHumanTurn: isHumanDrawTurn,
      playableCardIds: selectableTokens,
      confirmBeforePlay,
      armedCardId: armedToken,
    });
    if (outcome.kind === 'arm') {
      setArmedToken(outcome.cardId);
      return;
    }
    if (outcome.kind === 'commit') {
      setArmedToken(null);
      setHasDrawnOnce(true);
      onChooseCard(positionToken);
    }
  };

  const podEmphasis = (seat: ComputerGameSeat): { drawSource: boolean; dimmed: boolean } => {
    if (!isHumanDrawTurn || seat.isSelf) return { drawSource: false, dimmed: false };
    const isSource = seat.id === drawSourceOwnerId;
    return { drawSource: isSource, dimmed: !isSource };
  };

  return (
    <main
      className="gc-shell"
      data-reduced-motion={view.settings.reducedMotion ? 'true' : 'false'}
      data-left-handed={leftHanded ? 'true' : 'false'}
    >
      <CourtyardBackdropPlaceholder />

      <div className="relative z-10 px-3 pt-2">
        <GameTopBar locale={locale} view={view} onOpenSettings={() => setSettingsOpen(true)} />
      </div>

      <section className="gc-scene" aria-label={t('computer.modeLabel')}>
        <div className="gc-felt">
          <div className="gc-felt-pattern" aria-hidden />
          <div className="gc-felt-border" aria-hidden />
        </div>

        <div className="gc-regions">
          <div className="flex items-start justify-center gap-4">
            {topSeats.map((seat) => (
              <PlayerPod
                key={seat.id}
                locale={locale}
                seat={seat}
                reaction={reactionFor(seat)}
                {...podEmphasis(seat)}
              />
            ))}
          </div>

          <div className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
            <div className="flex flex-col justify-center gap-4">
              {leftSeats.map((seat) => (
                <PlayerPod
                  key={seat.id}
                  locale={locale}
                  seat={seat}
                  reaction={reactionFor(seat)}
                  {...podEmphasis(seat)}
                />
              ))}
            </div>

            <ActionStage
              locale={locale}
              view={view}
              onChooseCard={handleChooseCard}
              armedToken={armedToken}
              showCoachMark={showCoachMark}
              onDismissCoachMark={() => setCoachDismissed(true)}
            />

            <div className="flex flex-col justify-center gap-4">
              {rightSeats.map((seat) => (
                <PlayerPod
                  key={seat.id}
                  locale={locale}
                  seat={seat}
                  reaction={reactionFor(seat)}
                  {...podEmphasis(seat)}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            {selfSeat ? (
              <PlayerPod locale={locale} seat={selfSeat} reaction={reactionFor(selfSeat)} />
            ) : null}
            <PlayerHandFan
              locale={locale}
              cards={view.ownHand}
              drawnCardId={drawnCardId}
              largeCards={largeCards}
            />
          </div>
        </div>

        <GadhaReveal locale={locale} view={view} onRematch={onRematch} />

        {view.phase === 'error' ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="flex max-w-md flex-col items-center gap-4 rounded-lg bg-surface-primary p-6 text-center shadow-md">
              <p className="text-base font-semibold text-status-error">{t('error.recoverable')}</p>
              <Button className="min-h-12" onClick={onRecover}>
                {t('action.returnToSetup')}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <GameSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        view={view}
        locale={locale}
        onToggleSound={onToggleSound}
        onToggleReducedMotion={onToggleReducedMotion}
        onLocaleChange={onLocaleChange}
        onHowToPlay={onHowToPlay}
        largeCards={largeCards}
        onToggleLargeCards={() => setLargeCards((value) => !value)}
        confirmBeforePlay={confirmBeforePlay}
        onToggleConfirmBeforePlay={() => {
          setConfirmBeforePlay((value) => !value);
          setArmedToken(null);
        }}
        leftHanded={leftHanded}
        onToggleLeftHanded={() => setLeftHanded((value) => !value)}
      />
    </main>
  );
}
