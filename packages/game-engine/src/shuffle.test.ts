import { seededRng } from '@lazy-patta/test-fixtures';
import { describe, expect, it } from 'vitest';

import { buildDeck } from './deck';
import { shuffle } from './shuffle';

describe('shuffle', () => {
  it('is deterministic for a given seed', () => {
    const a = shuffle(buildDeck(), seededRng(42));
    const b = shuffle(buildDeck(), seededRng(42));
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it('produces different orders for different seeds', () => {
    const a = shuffle(buildDeck(), seededRng(1));
    const b = shuffle(buildDeck(), seededRng(2));
    expect(a.map((c) => c.id)).not.toEqual(b.map((c) => c.id));
  });

  it('conserves cards (a permutation, no loss or duplication)', () => {
    const deck = buildDeck();
    const shuffled = shuffle(deck, seededRng(7));
    expect(shuffled).toHaveLength(deck.length);
    expect(new Set(shuffled.map((c) => c.id))).toEqual(new Set(deck.map((c) => c.id)));
  });

  it('does not mutate the input', () => {
    const deck = buildDeck();
    const before = deck.map((c) => c.id);
    shuffle(deck, seededRng(9));
    expect(deck.map((c) => c.id)).toEqual(before);
  });
});
