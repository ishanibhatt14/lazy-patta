import { describe, expect, it } from 'vitest';

import sitemap from './sitemap';

describe('sitemap', () => {
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);

  it('lists core discovery pages on the canonical origin', () => {
    expect(urls).toContain('https://lazypatta.com/');
    expect(urls).toContain('https://lazypatta.com/mobile');
    expect(urls).toContain('https://lazypatta.com/play/online');
  });

  it('lists non-prefixed and locale-prefixed game topic pages', () => {
    expect(urls).toContain('https://lazypatta.com/games/gadha-chor');
    expect(urls).toContain('https://lazypatta.com/games/lal-satti');
    expect(urls).toContain('https://lazypatta.com/en/games/gadha-chor');
    expect(urls).toContain('https://lazypatta.com/gu/games/lal-satti');
  });

  it('lists localized games and how-to-play index routes', () => {
    expect(urls).toContain('https://lazypatta.com/en/games');
    expect(urls).toContain('https://lazypatta.com/hi/games');
    expect(urls).toContain('https://lazypatta.com/gu/games');
    expect(urls).toContain('https://lazypatta.com/en/how-to-play');
    expect(urls).toContain('https://lazypatta.com/hi/how-to-play');
    expect(urls).toContain('https://lazypatta.com/gu/how-to-play');
  });

  it('lists localized rules detail routes for every game', () => {
    expect(urls).toContain('https://lazypatta.com/en/how-to-play/gadha-chor');
    expect(urls).toContain('https://lazypatta.com/gu/how-to-play/gadha-chor');
    expect(urls).toContain('https://lazypatta.com/hi/how-to-play/lal-satti');
  });

  it('lists Jhabbu topic and rules pages even though it is coming soon', () => {
    expect(urls).toContain('https://lazypatta.com/games/jhabbu');
    expect(urls).toContain('https://lazypatta.com/en/games/jhabbu');
    expect(urls).toContain('https://lazypatta.com/en/how-to-play/jhabbu');
    expect(urls).toContain('https://lazypatta.com/gu/how-to-play/jhabbu');
  });

  it('lists computer play routes only for playable games', () => {
    expect(urls).toContain('https://lazypatta.com/play/gadha-chor/computer');
    expect(urls).toContain('https://lazypatta.com/play/lal-satti/computer');
    // Jhabbu has no computer experience yet, so its play route is excluded.
    expect(urls).not.toContain('https://lazypatta.com/play/jhabbu/computer');
  });

  it('attaches a reciprocal hreflang set to each localized entry', () => {
    const enRules = entries.find(
      (entry) => entry.url === 'https://lazypatta.com/en/how-to-play/gadha-chor',
    );
    expect(enRules?.alternates?.languages).toMatchObject({
      en: 'https://lazypatta.com/en/how-to-play/gadha-chor',
      hi: 'https://lazypatta.com/hi/how-to-play/gadha-chor',
      gu: 'https://lazypatta.com/gu/how-to-play/gadha-chor',
      'x-default': 'https://lazypatta.com/en/how-to-play/gadha-chor',
    });
  });
});
