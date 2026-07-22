import { afterEach, describe, expect, it } from 'vitest';

import { hasSeenFirstGame, markFirstGameSeen } from './first-game';

afterEach(() => {
  window.localStorage.clear();
});

describe('first-game tracking', () => {
  it('reports an unseen game as not yet taught', () => {
    expect(hasSeenFirstGame('jhabbu')).toBe(false);
  });

  it('remembers a game once it has been seen', () => {
    markFirstGameSeen('jhabbu');
    expect(hasSeenFirstGame('jhabbu')).toBe(true);
  });

  it('tracks each game independently', () => {
    markFirstGameSeen('jhabbu');
    expect(hasSeenFirstGame('kachuful')).toBe(false);
    expect(hasSeenFirstGame('lal-satti')).toBe(false);
  });

  it('is idempotent and accumulates across games', () => {
    markFirstGameSeen('jhabbu');
    markFirstGameSeen('jhabbu');
    markFirstGameSeen('kachuful');
    expect(hasSeenFirstGame('jhabbu')).toBe(true);
    expect(hasSeenFirstGame('kachuful')).toBe(true);
  });

  it('recovers from a corrupt store as if nothing was seen', () => {
    window.localStorage.setItem('lazy-patta:mobile-seen-games:v1', 'not json');
    expect(hasSeenFirstGame('jhabbu')).toBe(false);
    markFirstGameSeen('jhabbu');
    expect(hasSeenFirstGame('jhabbu')).toBe(true);
  });
});
