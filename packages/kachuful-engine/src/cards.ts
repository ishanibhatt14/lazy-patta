import {
  cardId,
  type Card,
  type Rank,
  RANKS,
  type Rng,
  SUITS,
  type Suit,
} from '@lazy-patta/game-contracts';

import type { KachufulTrump, KachufulTrickCard } from './types';

const RANK_ORDER = new Map<Rank, number>(RANKS.map((rank, index) => [rank, index]));
const SUIT_ORDER = new Map<Suit, number>(SUITS.map((suit, index) => [suit, index]));

export function buildKachufulDeck(): Card[] {
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

/** Ace-high rank strength (2 lowest, ace highest). */
export function rankValue(rank: Rank): number {
  return RANK_ORDER.get(rank) ?? 0;
}

export function compareCards(a: Card, b: Card): number {
  const suitDelta = (SUIT_ORDER.get(a.suit) ?? 0) - (SUIT_ORDER.get(b.suit) ?? 0);
  if (suitDelta !== 0) return suitDelta;
  return rankValue(a.rank) - rankValue(b.rank);
}

export function sortCards(cards: readonly Card[]): Card[] {
  return cards.slice().sort(compareCards);
}

/**
 * Deal `perRound[i]` cards to each of `playerCount` players for every round,
 * drawing from a fresh shuffled deck each round. Returns `deals[round][seat]`.
 */
export function dealRounds(perRound: readonly number[], playerCount: number, rng: Rng): Card[][][] {
  return perRound.map((handSize) => {
    const shuffled = shuffle(buildKachufulDeck(), rng);
    const hands: Card[][] = Array.from({ length: playerCount }, () => []);
    for (let seat = 0; seat < playerCount; seat += 1) {
      for (let n = 0; n < handSize; n += 1) {
        hands[seat]!.push(shuffled[seat * handSize + n]!);
      }
    }
    return hands.map((hand) => sortCards(hand));
  });
}

/**
 * The winner of a completed (or in-progress) trick: the highest trump if any
 * trump was played, otherwise the highest card of the led suit.
 */
export function trickWinner(
  trick: readonly KachufulTrickCard[],
  ledSuit: Suit,
  trump: KachufulTrump,
): KachufulTrickCard {
  const trumps = trump === 'no-trump' ? [] : trick.filter((entry) => entry.card.suit === trump);
  const contenders =
    trumps.length > 0 ? trumps : trick.filter((entry) => entry.card.suit === ledSuit);
  return contenders.reduce((best, entry) =>
    rankValue(entry.card.rank) > rankValue(best.card.rank) ? entry : best,
  );
}
