import type { ReactElement } from 'react';

/**
 * A small, self-contained fan of playing cards drawn with divs (no images, no
 * remote assets). Suit inks and the card face use semantic tokens, so the fan
 * re-themes with the rest of the app. Purely decorative: the whole thing is
 * `aria-hidden`, and callers give the surrounding control its accessible name.
 */

export type FanSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export interface FanCard {
  readonly rank: string;
  readonly suit: FanSuit;
}

export type CardFanSize = 'sm' | 'md' | 'lg';

const SUIT_GLYPH: Record<FanSuit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

function isRed(suit: FanSuit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

const SIZE: Record<CardFanSize, { card: string; rank: string; pip: string; overlap: number }> = {
  sm: { card: 'h-14 w-10', rank: 'text-[0.6rem]', pip: 'text-lg', overlap: 18 },
  md: { card: 'h-20 w-14', rank: 'text-xs', pip: 'text-2xl', overlap: 24 },
  lg: { card: 'h-28 w-20', rank: 'text-sm', pip: 'text-4xl', overlap: 32 },
};

/** Symmetric fan angles for up to five cards, in degrees. */
function angleFor(index: number, count: number): number {
  if (count <= 1) return 0;
  const spread = Math.min(16, 40 / count);
  return (index - (count - 1) / 2) * spread;
}

export function CardFanArtwork({
  cards,
  size = 'sm',
  className,
}: {
  readonly cards: readonly FanCard[];
  readonly size?: CardFanSize;
  readonly className?: string;
}): ReactElement {
  const dims = SIZE[size];

  return (
    <div
      aria-hidden
      className={`relative flex items-end justify-center ${className ?? ''}`}
      style={{ perspective: '600px' }}
    >
      {cards.map((card, index) => {
        const angle = angleFor(index, cards.length);
        const lift = Math.abs(angle) * 0.4;
        return (
          <div
            key={`${card.rank}-${card.suit}-${index}`}
            className={`${dims.card} flex flex-col justify-between rounded-md border border-black/10 bg-card-face p-1 shadow-md ${
              isRed(card.suit) ? 'text-card-suitRed' : 'text-card-suitBlack'
            }`}
            style={{
              marginLeft: index === 0 ? 0 : `-${dims.overlap}px`,
              transform: `rotate(${angle}deg) translateY(${lift}px)`,
              transformOrigin: 'bottom center',
              zIndex: index,
            }}
          >
            <span className={`font-black leading-none ${dims.rank}`}>
              {card.rank}
              <span className="ml-px">{SUIT_GLYPH[card.suit]}</span>
            </span>
            <span className={`text-center leading-none ${dims.pip}`}>{SUIT_GLYPH[card.suit]}</span>
            <span className={`rotate-180 self-end font-black leading-none ${dims.rank}`}>
              {card.rank}
              <span className="ml-px">{SUIT_GLYPH[card.suit]}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
