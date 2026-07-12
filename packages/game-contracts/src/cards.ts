/** The four French-deck suits. */
export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

/** Card ranks, 2..10 then face cards and ace. */
export const RANKS = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'jack',
  'queen',
  'king',
  'ace',
] as const;
export type Rank = (typeof RANKS)[number];

/**
 * A single card. `id` is stable and unique within a deck (e.g. "hearts-jack")
 * so the engine can assert card conservation and detect duplicates.
 */
export interface Card {
  readonly id: string;
  readonly suit: Suit;
  readonly rank: Rank;
}

export function cardId(suit: Suit, rank: Rank): string {
  return `${suit}-${rank}`;
}
