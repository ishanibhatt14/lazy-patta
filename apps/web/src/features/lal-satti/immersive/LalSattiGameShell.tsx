'use client';

import type { Card } from '@lazy-patta/game-contracts';
import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { CourtyardBackdropPlaceholder, type ReactionKind } from '../../../../components/game/art';
import { createTranslator } from '../../../../lib/i18n';
import { LAL_SATTI_HUMAN_ID } from '../players';
import type { LalSattiViewState } from '../types';

import { GameHistoryDrawer } from './GameHistoryDrawer';
import { LalSattiAccountSheet } from './LalSattiAccountSheet';
import { LalSattiTopBar } from './LalSattiTopBar';
import { PassPrompt } from './PassPrompt';
import { PlayerHandFan } from './PlayerHandFan';
import { PlayerPod } from './PlayerPod';
import { RoundResultOverlay } from './RoundResultOverlay';
import { ScoreDrawer } from './ScoreDrawer';
import { SettingsSheet } from './SettingsSheet';
import { StrategyCoachPopover } from './StrategyCoachPopover';
import { SuitRail } from './SuitRail';
import { positionSeats, type PositionedSeat } from './shared';

interface LalSattiGameShellProps {
  readonly view: LalSattiViewState;
  readonly locale: Locale;
  readonly onPlayCard: (cardId: string) => void;
  readonly onPass: () => void;
  readonly onRematch: () => void;
  readonly onToggleReducedMotion: () => void;
  readonly onLocaleChange: (locale: Locale) => void;
}

function displayName(name: string, locale: Locale): string {
  if (name === LAL_SATTI_HUMAN_ID) return createTranslator(locale).t('computer.youName');
  return name;
}

/** Lowest total penalty points leads the session; controller already tie-breaks standings. */
function computeLeader(view: LalSattiViewState, locale: Locale): string | null {
  if (view.roundScores.length === 0) return null;
  const top = view.runningScores[0];
  return top ? displayName(top.playerName, locale) : null;
}

/** A stable signature of what sits in the lanes, to detect card placements. */
function lanesSignature(view: LalSattiViewState): string {
  return view.lanes
    .map((lane) => `${lane.suit}:${lane.cards.map((c) => c.id).join(',')}`)
    .join('|');
}

/**
 * The one continuous Lal Satti table. Player pods wrap the rim, four suit rails
 * build on the mat, and the human hand fans along the bottom. Scores, history,
 * settings, and account each live in their own on-demand sheet — there is no
 * permanent sidebar. This shell is presentation only: every action is delegated
 * to the controller, and animation never gates correctness.
 */
export function LalSattiGameShell({
  view,
  locale,
  onPlayCard,
  onPass,
  onRematch,
  onToggleReducedMotion,
  onLocaleChange,
}: LalSattiGameShellProps): ReactElement {
  const { t } = createTranslator(locale);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scoresOpen, setScoresOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [largeCards, setLargeCards] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  const [focusedCard, setFocusedCard] = useState<Card | null>(null);
  const [invalidCardId, setInvalidCardId] = useState<string | null>(null);
  const [justPlacedCardId, setJustPlacedCardId] = useState<string | null>(null);
  const [openingSuit, setOpeningSuit] = useState<Card['suit'] | null>(null);

  const seats = useMemo(() => positionSeats(view.seats), [view.seats]);
  const topSeats = seats.filter((seat) => seat.position === 'top');
  const leftSeats = seats.filter((seat) => seat.position === 'left');
  const rightSeats = seats.filter((seat) => seat.position === 'right');
  const selfSeat = seats.find((seat) => seat.position === 'bottom');

  const leaderName = computeLeader(view, locale);
  const signature = lanesSignature(view);
  const prevSignatureRef = useRef<string | null>(null);
  const prevLanesRef = useRef(view.lanes);

  // Detect newly placed cards and freshly opened suits for the arrival flourish
  // (including the signature 7♥ opening). Timing is cosmetic and collapses under
  // reduced motion; the lanes themselves come straight from the engine.
  useEffect(() => {
    const previous = prevLanesRef.current;
    prevLanesRef.current = view.lanes;
    if (prevSignatureRef.current === null) {
      prevSignatureRef.current = signature;
      return;
    }
    if (prevSignatureRef.current === signature) return;
    prevSignatureRef.current = signature;

    let placedId: string | null = null;
    let opened: Card['suit'] | null = null;
    for (const lane of view.lanes) {
      const before = previous.find((candidate) => candidate.suit === lane.suit);
      const beforeIds = new Set((before?.cards ?? []).map((card) => card.id));
      const added = lane.cards.filter((card) => !beforeIds.has(card.id));
      if (added.length > 0) placedId = added[added.length - 1]!.id;
      if ((before?.cards.length ?? 0) === 0 && lane.cards.length > 0) opened = lane.suit;
    }

    setJustPlacedCardId(placedId);
    setOpeningSuit(opened);

    if (view.reducedMotion) return;
    const hold = opened === 'hearts' ? 600 : 400;
    const timer = window.setTimeout(() => setOpeningSuit(null), hold);
    return () => window.clearTimeout(timer);
  }, [signature, view.lanes, view.reducedMotion]);

  // A brief invalid-card shake plus a friendly coach hint, cleared shortly after.
  useEffect(() => {
    if (!invalidCardId) return;
    const timer = window.setTimeout(() => setInvalidCardId(null), 700);
    return () => window.clearTimeout(timer);
  }, [invalidCardId]);

  const coachMessageKey = invalidCardId ? ('lalSatti.invalidCardHint' as const) : null;

  const onSelectCard = (card: Card): void => {
    if (!view.isHumanTurn) return;
    if (view.playableCardIds.includes(card.id)) {
      setInvalidCardId(null);
      onPlayCard(card.id);
      return;
    }
    setInvalidCardId(null);
    // Re-arm on the next frame so a repeated tap re-triggers the shake.
    window.requestAnimationFrame(() => setInvalidCardId(card.id));
  };

  const reactionFor = (
    seat: PositionedSeat,
  ): { readonly kind: ReactionKind; readonly text: string } | null => {
    if (seat.isFinished && seat.cardCount === 0) {
      return { kind: 'finish', text: t('lalSatti.reactionFinished') };
    }
    return null;
  };

  const renderPod = (seat: PositionedSeat, compact = false): ReactElement => (
    <PlayerPod
      key={seat.id}
      locale={locale}
      seat={seat}
      compact={compact}
      reaction={reactionFor(seat)}
    />
  );

  return (
    <main
      className="ls-shell"
      data-reduced-motion={view.reducedMotion ? 'true' : 'false'}
      data-high-contrast={highContrast ? 'true' : 'false'}
    >
      <CourtyardBackdropPlaceholder />

      <div className="relative z-10 px-3 pt-2">
        <LalSattiTopBar
          locale={locale}
          view={view}
          leaderName={leaderName}
          onOpenScores={() => setScoresOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      <section className="ls-scene" aria-label={t('lalSatti.modeLabel')}>
        <div className="ls-felt">
          <div className="ls-felt-pattern" aria-hidden />
          <div className="ls-felt-border" aria-hidden />
        </div>

        <div className="ls-regions">
          <div className="flex items-start justify-center gap-4">
            {topSeats.map((seat) => renderPod(seat, true))}
          </div>

          <div className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
            <div className="flex flex-col justify-center gap-4">
              {leftSeats.map((seat) => renderPod(seat, true))}
            </div>

            <div
              className="flex flex-col justify-center gap-1.5"
              aria-label={t('lalSatti.tableau')}
            >
              {view.lanes.map((lane) => (
                <SuitRail
                  key={lane.suit}
                  locale={locale}
                  lane={lane}
                  justPlacedCardId={justPlacedCardId}
                  opening={openingSuit === lane.suit && lane.suit !== 'hearts'}
                  heartsOpening={openingSuit === 'hearts' && lane.suit === 'hearts'}
                  highlighted={focusedCard?.suit === lane.suit}
                />
              ))}
            </div>

            <div className="flex flex-col justify-center gap-4">
              {rightSeats.map((seat) => renderPod(seat, true))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            {selfSeat ? renderPod(selfSeat) : null}
            <PassPrompt
              locale={locale}
              isHumanTurn={view.isHumanTurn}
              canPass={view.canPass}
              playableCount={view.playableCardIds.length}
              onPass={onPass}
            />
            <StrategyCoachPopover locale={locale} messageKey={coachMessageKey} />
            <PlayerHandFan
              locale={locale}
              cards={view.ownHand}
              playableCardIds={view.playableCardIds}
              isHumanTurn={view.isHumanTurn}
              focusedCardId={focusedCard?.id ?? null}
              invalidCardId={invalidCardId}
              largeCards={largeCards}
              onSelect={onSelectCard}
              onFocusCard={setFocusedCard}
            />
          </div>
        </div>

        <RoundResultOverlay
          locale={locale}
          view={view}
          leaderName={leaderName}
          onRematch={onRematch}
          onViewScores={() => setScoresOpen(true)}
        />
      </section>

      <ScoreDrawer
        open={scoresOpen}
        onClose={() => setScoresOpen(false)}
        locale={locale}
        view={view}
        leaderName={leaderName}
      />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        locale={locale}
        reducedMotion={view.reducedMotion}
        largeCards={largeCards}
        highContrast={highContrast}
        onToggleReducedMotion={onToggleReducedMotion}
        onToggleLargeCards={() => setLargeCards((value) => !value)}
        onToggleHighContrast={() => setHighContrast((value) => !value)}
        onLocaleChange={onLocaleChange}
        onOpenHistory={() => {
          setSettingsOpen(false);
          setHistoryOpen(true);
        }}
        onOpenAccount={() => {
          setSettingsOpen(false);
          setAccountOpen(true);
        }}
      />
      <GameHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        locale={locale}
        events={view.events}
      />
      <LalSattiAccountSheet
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        locale={locale}
        humanName={view.humanName}
        playerCount={view.playerCount}
        roundScores={view.roundScores}
      />
    </main>
  );
}
