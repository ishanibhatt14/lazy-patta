import {
  cardId,
  type Card,
  type Rank,
  RANKS,
  type Rng,
  SUITS,
  type Suit,
} from '@lazy-patta/game-contracts';

export const JHABBU_RANKS = [
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
] as const satisfies readonly Rank[];

const SUIT_ORDER = new Map<Suit, number>(SUITS.map((suit, index) => [suit, index]));

export function buildJhabbuDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: cardId(suit, rank), suit, rank });
    }
  }
  return deck;
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng.next() * (index + 1));
    const current = out[index]!;
    out[index] = out[swapIndex]!;
    out[swapIndex] = current;
  }
  return out;
}

export function rankValue(rank: Rank): number {
  return JHABBU_RANKS.indexOf(rank);
}

export function compareCards(a: Card, b: Card): number {
  const suitDelta = (SUIT_ORDER.get(a.suit) ?? 0) - (SUIT_ORDER.get(b.suit) ?? 0);
  if (suitDelta !== 0) return suitDelta;
  return rankValue(a.rank) - rankValue(b.rank);
}

export function sortCards(cards: readonly Card[]): Card[] {
  return cards.slice().sort(compareCards);
}

export function highestLedSuitCard(
  trick: readonly { readonly playerId: string; readonly card: Card }[],
  ledSuit: Suit,
): { readonly playerId: string; readonly card: Card } {
  const candidates = trick.filter((entry) => entry.card.suit === ledSuit);
  const winner = candidates.reduce((best, entry) =>
    rankValue(entry.card.rank) > rankValue(best.card.rank) ? entry : best,
  );
  return winner;
}
