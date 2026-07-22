import { describe, expect, it } from 'vitest';

import { createTranslator } from '../i18n';

import { buildShareableGameResult, resultShareText } from './results';

describe('shareable game results', () => {
  it('adapts Gadha Chor results without private card data', () => {
    const t = createTranslator('en');
    const result = buildShareableGameResult({
      gameSlug: 'gadha-chor',
      gameName: 'Gadha Chor',
      result: { loser: 'p2', winners: ['p1'] },
      playerCount: 4,
      nameFor: (id) => (id === 'p1' ? 'Masi' : 'Player'),
      t,
    });
    expect(result.winnerDisplayName).toBe('Masi');
    expect(resultShareText(result, t)).toContain('Masi');
    expect(JSON.stringify(result)).not.toContain('hand');
  });

  it('carries an explicit winner, round number, and series leader for per-game views', () => {
    const t = createTranslator('en');
    const result = buildShareableGameResult({
      gameSlug: 'jhabbu',
      gameName: 'Jhabbu',
      winnerDisplayName: 'Ba',
      playerCount: 4,
      roundNumber: 3,
      seriesLeaderDisplayName: 'Masa',
      t,
    });
    expect(result.winnerDisplayName).toBe('Ba');
    expect(result.roundNumber).toBe(3);
    expect(result.seriesLeaderDisplayName).toBe('Masa');
    expect(result.headline).toContain('Ba');
  });

  it('omits round and series fields when a game does not track them', () => {
    const t = createTranslator('en');
    const result = buildShareableGameResult({
      gameSlug: 'gadha-chor',
      gameName: 'Gadha Chor',
      winnerDisplayName: 'Masi',
      playerCount: 4,
      t,
    });
    expect('roundNumber' in result).toBe(false);
    expect('seriesLeaderDisplayName' in result).toBe(false);
  });
});
