import type { Rank, Suit } from '@lazy-patta/game-contracts';
import { LAL_SATTI_RANKS } from '@lazy-patta/lal-satti-engine';
import type { LalSattiTableauLane } from '@lazy-patta/lal-satti-engine';
import type { Locale, MessageKey } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import { PlayingCard } from '../../../../components/PlayingCard';
import { createTranslator } from '../../../../lib/i18n';

import { cardLabel, suitKey } from './shared';

const SUIT_GLYPH: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
};

const RANK_SHORT: Record<Rank, string> = {
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  jack: 'J',
  queen: 'Q',
  king: 'K',
  ace: 'A',
};

function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

interface LegalSlotIndicatorProps {
  readonly suit: Suit;
  readonly rank: Rank;
  readonly isAnchor?: boolean;
  readonly label: string;
}

/**
 * A dashed destination marker for the next legal rank at a lane boundary (or the
 * seven anchor for an unopened suit). Purely a visual hint — legality is decided
 * by the engine, never by this indicator.
 */
export function LegalSlotIndicator({
  suit,
  rank,
  isAnchor = false,
  label,
}: LegalSlotIndicatorProps): ReactElement {
  return (
    <span
      className={[
        'ls-slot flex h-16 w-12 shrink-0 flex-col items-center justify-center rounded-lg text-center',
        isRedSuit(suit) ? 'text-card-suitRed' : 'text-action-primary',
      ].join(' ')}
      data-anchor={isAnchor ? 'true' : 'false'}
      role="img"
      aria-label={label}
    >
      <span className="text-sm font-bold" aria-hidden>
        {RANK_SHORT[rank]}
      </span>
      <span className="text-lg leading-none" aria-hidden>
        {SUIT_GLYPH[suit]}
      </span>
    </span>
  );
}

interface SuitAnchorSevenProps {
  readonly suit: Suit;
  readonly locale: Locale;
}

/** The faint seven-of-suit destination shown while a suit is still unopened. */
export function SuitAnchorSeven({ suit, locale }: SuitAnchorSevenProps): ReactElement {
  const { t, format } = createTranslator(locale);
  return (
    <div className="ls-rail-seven flex items-center gap-2" data-open="false">
      <LegalSlotIndicator
        suit={suit}
        rank="7"
        isAnchor
        label={format('lalSatti.unopenedSuit', { suit: t(suitKey(suit)) })}
      />
    </div>
  );
}

interface SuitRailProps {
  readonly locale: Locale;
  readonly lane: LalSattiTableauLane;
  /** Id of a card just placed anywhere, so this rail can animate its arrival. */
  readonly justPlacedCardId?: string | null;
  /** True while this suit is opening (its seven was just laid down). */
  readonly opening?: boolean;
  /** True for the signature 7♥ opening flourish. */
  readonly heartsOpening?: boolean;
  /** Highlighted because the focused hand card targets this suit. */
  readonly highlighted?: boolean;
}

/**
 * One suit's sequence, laid directly on the mat. The seven anchors the row;
 * lower ranks extend left and higher ranks extend right. Dashed slots mark the
 * next legal rank at each open boundary, and unopened suits show a faint seven
 * destination. Boundary hints are derived from the lane's own ranks — the engine
 * remains the sole authority on what is actually playable.
 */
export function SuitRail({
  locale,
  lane,
  justPlacedCardId = null,
  opening = false,
  heartsOpening = false,
  highlighted = false,
}: SuitRailProps): ReactElement {
  const { t, format } = createTranslator(locale);
  const suitName = t(suitKey(lane.suit));
  const isOpen = lane.cards.length > 0;

  const lowIndex = isOpen ? LAL_SATTI_RANKS.indexOf(lane.lowRank) : -1;
  const highIndex = isOpen ? LAL_SATTI_RANKS.indexOf(lane.highRank) : -1;
  const nextLow = lowIndex > 0 ? LAL_SATTI_RANKS[lowIndex - 1] : null;
  const nextHigh =
    highIndex >= 0 && highIndex < LAL_SATTI_RANKS.length - 1
      ? LAL_SATTI_RANKS[highIndex + 1]
      : null;

  const boundaryLabel = (rank: Rank): string =>
    format('lalSatti.legalSlot', { rank: t(`rank.${rank}` as MessageKey), suit: suitName });

  return (
    <div
      className={[
        'ls-rail grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 rounded-xl px-1.5 py-1',
        highlighted ? 'bg-[color-mix(in_srgb,var(--lp-action-secondary)_25%,transparent)]' : 'bg-black/10',
      ].join(' ')}
      data-opening={opening ? 'true' : 'false'}
      data-hearts-open={heartsOpening ? 'true' : 'false'}
      aria-label={format('lalSatti.suitRailLabel', { suit: suitName })}
    >
      <span
        className={[
          'text-2xl leading-none',
          isRedSuit(lane.suit) ? 'text-card-suitRed' : 'text-text-onBrand',
        ].join(' ')}
        role="img"
        aria-label={suitName}
      >
        {SUIT_GLYPH[lane.suit]}
      </span>

      <div className="flex min-h-[4.5rem] items-center overflow-x-auto py-0.5">
        {!isOpen ? (
          <SuitAnchorSeven suit={lane.suit} locale={locale} />
        ) : (
          <div className="flex items-center">
            {nextLow ? (
              <span className="mr-1 shrink-0">
                <LegalSlotIndicator suit={lane.suit} rank={nextLow} label={boundaryLabel(nextLow)} />
              </span>
            ) : null}

            {lane.cards.map((card) => (
              <span
                key={card.id}
                className="ls-rail-card -ml-3 first:ml-0 md:ml-0 md:mr-1 inline-block"
                data-just-placed={card.id === justPlacedCardId ? 'true' : 'false'}
                data-seven={card.rank === '7' ? 'true' : 'false'}
              >
                <PlayingCard card={card} size="sm" label={cardLabel(card, locale)} />
              </span>
            ))}

            {nextHigh ? (
              <span className="ml-1 shrink-0">
                <LegalSlotIndicator
                  suit={lane.suit}
                  rank={nextHigh}
                  label={boundaryLabel(nextHigh)}
                />
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
