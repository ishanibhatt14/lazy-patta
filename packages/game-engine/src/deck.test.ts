import { describe, expect, it } from 'vitest';

import { buildDeck } from './deck';

describe('buildDeck', () => {
  it('produces 52 cards', () => {
    expect(buildDeck()).toHaveLength(52);
  });

  it('has 52 unique ids', () => {
    const ids = new Set(buildDeck().map((c) => c.id));
    expect(ids.size).toBe(52);
  });

  it('has exactly 4 of each rank and 13 of each suit', () => {
    const deck = buildDeck();
    const jacks = deck.filter((c) => c.rank === 'jack');
    const hearts = deck.filter((c) => c.suit === 'hearts');
    expect(jacks).toHaveLength(4);
    expect(hearts).toHaveLength(13);
  });
});
