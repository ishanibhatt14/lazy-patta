import { describe, expect, it } from 'vitest';

import sitemap from './sitemap';

describe('sitemap', () => {
  it('includes the mobile app discovery page and playable game routes', () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain('https://lazy-patta-web.vercel.app/mobile');
    expect(urls).toContain('https://lazy-patta-web.vercel.app/games/gadha-chor');
    expect(urls).toContain('https://lazy-patta-web.vercel.app/games/lal-satti');
    expect(urls).toContain('https://lazy-patta-web.vercel.app/play/online');
  });
});
