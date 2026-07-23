import { messages } from '@lazy-patta/localization';
import { describe, expect, it } from 'vitest';

import {
  MOBILE_CATALOG,
  PLAYABLE_CATALOG,
  findCatalogItem,
  hasEnoughPlayers,
  isValidPlayerCount,
} from './mobile-catalog';

const en = messages.en;

describe('MOBILE_CATALOG', () => {
  it('includes the four live games and both coming-soon games', () => {
    const ids = MOBILE_CATALOG.map((g) => g.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'gadha-chor',
        'lal-satti',
        'jhabbu',
        'kachuful',
        'mendicot',
        'three-two-five',
      ]),
    );
  });

  it('marks exactly the four discovery games as playable with a practice route', () => {
    expect(PLAYABLE_CATALOG).toHaveLength(4);
    for (const game of PLAYABLE_CATALOG) {
      expect(game.availability).toBe('available');
      expect(game.practiceRoute).toMatch(/^\/mobile\/game\/.+\/setup\?mode=computer$/);
      // Family rooms are verified live, so every live game exposes a room key.
      expect(game.roomGameKey).toBeTruthy();
    }
  });

  it('never links coming-soon games into a play or room route', () => {
    for (const game of MOBILE_CATALOG.filter((g) => g.availability === 'coming-soon')) {
      expect(game.practiceRoute).toBeUndefined();
      expect(game.roomGameKey).toBeUndefined();
      expect(game.rulesRoute).toBeUndefined();
    }
  });

  it('has coherent player ranges (min <= max, min >= 2)', () => {
    for (const game of MOBILE_CATALOG) {
      expect(game.minPlayers).toBeGreaterThanOrEqual(2);
      expect(game.maxPlayers).toBeGreaterThanOrEqual(game.minPlayers);
    }
  });

  it('resolves every message key against the English catalogue', () => {
    for (const game of MOBILE_CATALOG) {
      for (const key of [
        game.nameKey,
        game.taglineKey,
        game.alternateNamesKey,
        game.difficultyKey,
      ]) {
        expect(en[key], key).toBeTruthy();
      }
    }
  });

  it('matches the product-spec player limits for each live game', () => {
    const byId = Object.fromEntries(MOBILE_CATALOG.map((g) => [g.id, g]));
    expect(byId['gadha-chor']).toMatchObject({ minPlayers: 2, maxPlayers: 6, difficulty: 'easy' });
    expect(byId['lal-satti']).toMatchObject({ minPlayers: 3, maxPlayers: 6 });
    expect(byId['jhabbu']).toMatchObject({ minPlayers: 3, maxPlayers: 6, difficulty: 'fast' });
    expect(byId['kachuful']).toMatchObject({ minPlayers: 3, maxPlayers: 7 });
  });
});

describe('player-limit validation', () => {
  const gadha = findCatalogItem('gadha-chor')!;

  it('accepts counts within the range and rejects those outside', () => {
    expect(isValidPlayerCount(gadha, 2)).toBe(true);
    expect(isValidPlayerCount(gadha, 6)).toBe(true);
    expect(isValidPlayerCount(gadha, 1)).toBe(false);
    expect(isValidPlayerCount(gadha, 7)).toBe(false);
    expect(isValidPlayerCount(gadha, 2.5)).toBe(false);
  });

  it('hasEnoughPlayers gates on the minimum but stays within the max', () => {
    expect(hasEnoughPlayers(gadha, 1)).toBe(false);
    expect(hasEnoughPlayers(gadha, 2)).toBe(true);
    expect(hasEnoughPlayers(gadha, 7)).toBe(false);
  });
});
