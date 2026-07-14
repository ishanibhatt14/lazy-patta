import { describe, expect, it } from 'vitest';

import {
  gamesIndexAlternates,
  gamesIndexPath,
  rulesAlternates,
  rulesIndexPath,
  rulesPath,
} from './routes';

describe('seo route paths', () => {
  it('builds locale-prefixed discovery paths', () => {
    expect(gamesIndexPath('en')).toBe('/en/games');
    expect(rulesIndexPath('gu')).toBe('/gu/how-to-play');
    expect(rulesPath('hi', 'gadha-chor')).toBe('/hi/how-to-play/gadha-chor');
  });
});

describe('localized alternates', () => {
  it('self-references the canonical locale and cross-links every locale plus x-default', () => {
    const alternates = gamesIndexAlternates('gu');
    expect(alternates?.canonical).toBe('/gu/games');
    expect(alternates?.languages).toStrictEqual({
      en: '/en/games',
      hi: '/hi/games',
      gu: '/gu/games',
      'x-default': '/en/games',
    });
  });

  it('does not canonicalize a localized page to English', () => {
    const alternates = rulesAlternates('lal-satti', 'hi');
    expect(alternates?.canonical).toBe('/hi/how-to-play/lal-satti');
    expect(alternates?.languages?.['x-default']).toBe('/en/how-to-play/lal-satti');
  });
});
