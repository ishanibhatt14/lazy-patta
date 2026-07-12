import type { Card, Rank } from '@lazy-patta/game-contracts';

/**
 * Remove same-rank pairs from a hand. Cards pair two-at-a-time by rank; if a
 * rank has an odd count, one card of that rank remains. Returns the reduced
 * hand and the removed cards (for events). Pure.
 */
export function removeSameRankPairs(hand: readonly Card[]): {
  hand: Card[];
  removed: Card[];
} {
  const byRank = new Map<Rank, Card[]>();
  for (const card of hand) {
    const bucket = byRank.get(card.rank);
    if (bucket) bucket.push(card);
    else byRank.set(card.rank, [card]);
  }

  const kept: Card[] = [];
  const removed: Card[] = [];
  for (const cards of byRank.values()) {
    const pairCount = Math.floor(cards.length / 2);
    for (let i = 0; i < pairCount * 2; i++) removed.push(cards[i]!);
    for (let i = pairCount * 2; i < cards.length; i++) kept.push(cards[i]!);
  }

  // Preserve original order for kept cards (stable, deterministic projections).
  const keptIds = new Set(kept.map((c) => c.id));
  const orderedKept = hand.filter((c) => keptIds.has(c.id));
  return { hand: orderedKept, removed };
}
