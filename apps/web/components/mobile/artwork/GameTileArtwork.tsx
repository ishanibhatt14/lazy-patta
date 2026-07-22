import type { ReactElement } from 'react';

import { CardFanArtwork, type CardFanSize, type FanCard } from './CardFanArtwork';

/**
 * Per-game card artwork. Each game shows a small fan that nods to its signature
 * so tiles read as real games, not letters: Lal Satti's red seven, Jhabbu's
 * spades, Kachuful's trump mix, and so on. Falls back to a neutral fan for any
 * id we do not have a bespoke hand for. Decorative only (see CardFanArtwork).
 */

const HANDS: Record<string, readonly FanCard[]> = {
  // Gadha Chor: play in pairs, one player is left holding the odd card.
  'gadha-chor': [
    { rank: 'Q', suit: 'spades' },
    { rank: 'Q', suit: 'hearts' },
    { rank: 'J', suit: 'clubs' },
  ],
  // Lal Satti: the "red seven" of hearts anchors a heart run.
  'lal-satti': [
    { rank: '6', suit: 'hearts' },
    { rank: '7', suit: 'hearts' },
    { rank: '8', suit: 'hearts' },
  ],
  // Jhabbu: spades and the Thulla.
  jhabbu: [
    { rank: 'A', suit: 'spades' },
    { rank: 'K', suit: 'spades' },
    { rank: 'Q', suit: 'spades' },
  ],
  // Kachuful: bid tricks with a trump mix.
  kachuful: [
    { rank: 'A', suit: 'diamonds' },
    { rank: 'K', suit: 'spades' },
    { rank: 'Q', suit: 'hearts' },
  ],
  // Mendicot: capturing the tens.
  mendicot: [
    { rank: '10', suit: 'diamonds' },
    { rank: '10', suit: 'hearts' },
  ],
  // 3-2-5: a wink at the name.
  'three-two-five': [
    { rank: '3', suit: 'clubs' },
    { rank: '2', suit: 'diamonds' },
    { rank: '5', suit: 'spades' },
  ],
};

const FALLBACK: readonly FanCard[] = [
  { rank: 'A', suit: 'spades' },
  { rank: 'K', suit: 'hearts' },
];

export function GameTileArtwork({
  gameId,
  size = 'sm',
  className,
}: {
  readonly gameId: string;
  readonly size?: CardFanSize;
  readonly className?: string;
}): ReactElement {
  return <CardFanArtwork cards={HANDS[gameId] ?? FALLBACK} size={size} className={className} />;
}
