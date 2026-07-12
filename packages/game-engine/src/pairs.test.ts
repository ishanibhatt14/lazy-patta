import type { Card, Rank, Suit } from '@lazy-patta/game-contracts';
import { cardId } from '@lazy-patta/game-contracts';
import { describe, expect, it } from 'vitest';

import { removeSameRankPairs } from './pairs';

function card(suit: Suit, rank: Rank): Card {
  return { id: cardId(suit, rank), suit, rank };
}

describe('removeSameRankPairs', () => {
  it('removes a same-rank pair', () => {
    const { hand, removed } = removeSameRankPairs([card('hearts', '7'), card('spades', '7')]);
    expect(hand).toHaveLength(0);
    expect(removed).toHaveLength(2);
  });

  it('keeps the odd card when a rank has an odd count', () => {
    const { hand } = removeSameRankPairs([
      card('hearts', 'jack'),
      card('spades', 'jack'),
      card('clubs', 'jack'),
    ]);
    expect(hand).toHaveLength(1);
    expect(hand[0]!.rank).toBe('jack');
  });

  it('leaves unpaired ranks untouched', () => {
    const { hand } = removeSameRankPairs([card('hearts', '2'), card('spades', '9')]);
    expect(hand).toHaveLength(2);
  });

  it('preserves original order of kept cards', () => {
    const { hand } = removeSameRankPairs([
      card('hearts', '2'),
      card('hearts', '9'),
      card('spades', '9'),
      card('clubs', '3'),
    ]);
    expect(hand.map((c) => c.rank)).toEqual(['2', '3']);
  });
});
