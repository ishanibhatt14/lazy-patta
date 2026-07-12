import {
  type Card,
  cardId,
  type Rank,
  RANKS,
  type Rng,
  SUITS,
  type Suit,
} from '@lazy-patta/game-contracts';

export const LAL_SATTI_RANKS = [
  'ace',
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
] as const satisfies readonly Rank[];
export const LAL_SATTI_SUITS = SUITS;

const SUIT_ORDER = new Map<Suit, number>(SUITS.map((suit, index) => [suit, index]));

/** Build a standard, ordered 52-card deck. */
export function buildLalSattiDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: cardId(suit, rank), suit, rank });
    }
  }
  return deck;
}

/** Fisher-Yates shuffle using an injected RNG. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export function rankIndex(rank: Card['rank']): number {
  return LAL_SATTI_RANKS.indexOf(rank);
}

export function compareCards(a: Card, b: Card): number {
  const suitDelta = (SUIT_ORDER.get(a.suit) ?? 0) - (SUIT_ORDER.get(b.suit) ?? 0);
  if (suitDelta !== 0) return suitDelta;
  return rankIndex(a.rank) - rankIndex(b.rank);
}

export function sortCards(cards: readonly Card[]): Card[] {
  return cards.slice().sort(compareCards);
}
