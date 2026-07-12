import type { Card, Rank, Suit } from '@lazy-patta/game-contracts';
import type { ReactElement } from 'react';

export type PlayingCardSize = 'sm' | 'md' | 'lg';

interface PlayingCardProps {
  readonly card?: Card;
  readonly faceDown?: boolean;
  readonly size?: PlayingCardSize;
  /** Localized accessible name, e.g. "Jack of hearts". Composed by the caller. */
  readonly label?: string;
}

const SUIT_GLYPH: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
};

const RANK_LABEL: Record<Rank, string> = {
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

const SIZE: Record<PlayingCardSize, { box: string; corner: string; pip: string }> = {
  sm: { box: 'h-16 w-12', corner: 'text-xs', pip: 'text-2xl' },
  md: { box: 'h-24 w-16', corner: 'text-sm', pip: 'text-4xl' },
  lg: { box: 'h-36 w-24', corner: 'text-lg', pip: 'text-6xl' },
};

function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

/** A single playing card, face-up or face-down. Suit inks are semantic tokens. */
export function PlayingCard({
  card,
  faceDown = false,
  size = 'md',
  label,
}: PlayingCardProps): ReactElement {
  const dims = SIZE[size];
  const base = `relative flex ${dims.box} shrink-0 flex-col rounded-lg shadow-md`;

  if (faceDown || !card) {
    return (
      <div
        role="img"
        aria-label={label ?? 'Face-down card'}
        className={`${base} items-center justify-center border border-action-primary bg-card-back`}
      >
        <div className="flex h-[70%] w-[70%] items-center justify-center rounded-md border-2 border-action-secondary">
          <span className="font-semibold tracking-widest text-text-onBrand">LP</span>
        </div>
      </div>
    );
  }

  const ink = isRedSuit(card.suit) ? 'text-card-suitRed' : 'text-card-suitBlack';
  const rank = RANK_LABEL[card.rank];
  const glyph = SUIT_GLYPH[card.suit];

  return (
    <div
      role="img"
      aria-label={label ?? `${card.rank} of ${card.suit}`}
      className={`${base} justify-between bg-card-face p-1.5 ${ink}`}
    >
      <div className={`flex flex-col items-start leading-none ${dims.corner}`}>
        <span className="font-bold">{rank}</span>
        <span aria-hidden>{glyph}</span>
      </div>

      <span aria-hidden className={`text-center ${dims.pip} leading-none`}>
        {glyph}
      </span>

      <div className={`flex rotate-180 flex-col items-start leading-none ${dims.corner}`}>
        <span className="font-bold">{rank}</span>
        <span aria-hidden>{glyph}</span>
      </div>
    </div>
  );
}
