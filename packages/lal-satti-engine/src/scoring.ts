import type { Card, Rank } from '@lazy-patta/game-contracts';

const RANK_POINTS = {
  ace: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  jack: 11,
  queen: 12,
  king: 13,
} as const satisfies Readonly<Record<Rank, number>>;

export function lalSattiCardPoints(card: Card): number {
  return RANK_POINTS[card.rank];
}

export function lalSattiHandPoints(cards: readonly Card[]): number {
  return cards.reduce((total, card) => total + lalSattiCardPoints(card), 0);
}
