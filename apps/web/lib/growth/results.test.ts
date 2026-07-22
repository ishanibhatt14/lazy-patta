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
});
