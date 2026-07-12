import { describe, expect, it } from 'vitest';

import { formatMessage } from './format';

describe('formatMessage', () => {
  it('substitutes a named argument', () => {
    expect(formatMessage('en', 'turn.waiting', { name: 'Asha' })).toBe('Waiting for Asha…');
  });

  it('fills result templates', () => {
    expect(formatMessage('en', 'result.winner', { name: 'Ravi' })).toBe('Ravi wins!');
    expect(formatMessage('en', 'result.gadhaChor', { name: 'Ravi' })).toBe(
      'Ravi is the Gadha Chor!',
    );
  });

  it('selects the singular plural branch for count 1', () => {
    expect(formatMessage('en', 'lobby.playerCount', { count: 1 })).toBe('1 player');
  });

  it('selects the other plural branch for counts != 1', () => {
    expect(formatMessage('en', 'lobby.playerCount', { count: 4 })).toBe('4 players');
    expect(formatMessage('en', 'lobby.playerCount', { count: 0 })).toBe('0 players');
  });

  it('leaves messages without placeholders untouched', () => {
    expect(formatMessage('en', 'welcome.noBetting')).toBe('No cash. No betting. Just family fun.');
  });

  it('keeps an unknown placeholder verbatim rather than throwing', () => {
    expect(formatMessage('en', 'turn.waiting')).toBe('Waiting for {name}…');
  });

  it('works across locales', () => {
    // gu/hi carry the same {name}/plural structure; substitution must still apply.
    const gu = formatMessage('gu', 'result.winner', { name: 'Ravi' });
    expect(gu).toContain('Ravi');
    expect(gu).not.toContain('{name}');
  });
});
