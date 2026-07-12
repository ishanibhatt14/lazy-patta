import { describe, expect, it } from 'vitest';

import { mintPositionToken, resolvePositionToken } from './token';

describe('position tokens', () => {
  it('round-trips to the correct index', () => {
    const t = mintPositionToken(3, 'p1', 4);
    expect(resolvePositionToken(t, 3, 'p1', 6)).toBe(4);
  });

  it('does not resolve against a different state version (no replay)', () => {
    const t = mintPositionToken(3, 'p1', 4);
    expect(resolvePositionToken(t, 4, 'p1', 6)).toBe(-1);
  });

  it('does not resolve against a different from-player', () => {
    const t = mintPositionToken(3, 'p1', 4);
    expect(resolvePositionToken(t, 3, 'p2', 6)).toBe(-1);
  });

  it('is opaque: contains no card identity, rank, or suit', () => {
    const t = mintPositionToken(3, 'p1', 4);
    expect(t).toMatch(/^pt_[0-9a-f]{8}$/);
    for (const leak of ['jack', 'queen', 'hearts', 'spades', 'clubs', 'diamonds']) {
      expect(t).not.toContain(leak);
    }
  });
});
