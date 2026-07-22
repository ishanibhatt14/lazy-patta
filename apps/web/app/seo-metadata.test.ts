import { describe, expect, it } from 'vitest';

import { siteConfig } from '../lib/site-config';

import robots from './robots';
import sitemap from './sitemap';

function serialize(value: unknown): string {
  return JSON.stringify(value);
}

describe('sitemap', () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it('lists canonical public pages on the permanent domain', () => {
    expect(urls).toContain(siteConfig.canonicalOrigin + '/');
    expect(urls).toContain(siteConfig.canonicalOrigin + '/games/gadha-chor');
    expect(urls).toContain(siteConfig.canonicalOrigin + '/games/lal-satti');
    expect(urls).toContain(siteConfig.canonicalOrigin + '/mobile');
    expect(urls).toContain(siteConfig.canonicalOrigin + '/privacy');
    expect(urls).toContain(siteConfig.canonicalOrigin + '/play/gadha-chor/computer');
    expect(urls).not.toContain(siteConfig.canonicalOrigin + '/play');
  });

  it('keeps every URL on the canonical origin and excludes private/preview URLs', () => {
    for (const url of urls) {
      expect(url.startsWith(siteConfig.canonicalOrigin)).toBe(true);
      expect(url).not.toContain('/join/');
      // The online hub `/play/online` is allowed; live session paths are not.
      expect(url).not.toContain('/play/online/');
      expect(url).not.toContain('vercel.app');
      expect(url).not.toContain('lazytraveler');
    }
  });

  it('includes localized game variants with reciprocal hreflang alternates', () => {
    expect(urls).toContain(siteConfig.canonicalOrigin + '/hi/games/gadha-chor');
    expect(urls).toContain(siteConfig.canonicalOrigin + '/gu/games/lal-satti');
    const enGadha = entries.find(
      (e) => e.url === siteConfig.canonicalOrigin + '/en/games/gadha-chor',
    );
    expect(enGadha?.alternates?.languages).toMatchObject({
      en: siteConfig.canonicalOrigin + '/en/games/gadha-chor',
      hi: siteConfig.canonicalOrigin + '/hi/games/gadha-chor',
      gu: siteConfig.canonicalOrigin + '/gu/games/gadha-chor',
      'x-default': siteConfig.canonicalOrigin + '/en/games/gadha-chor',
    });
  });

  it('never emits a preview or cross-promo host anywhere in the sitemap', () => {
    const blob = serialize(entries);
    expect(blob).not.toContain('vercel.app');
    expect(blob).not.toContain('lazytraveler');
  });
});

describe('robots', () => {
  const result = robots();

  it('advertises the canonical sitemap on the permanent domain', () => {
    expect(result.sitemap).toBe(siteConfig.canonicalOrigin + '/sitemap.xml');
  });

  it('disallows private, auth, and internal surfaces', () => {
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallow = rule?.disallow ?? [];
    const list = Array.isArray(disallow) ? disallow : [disallow];
    for (const path of ['/api/', '/auth/', '/account/', '/profile/', '/room/', '/join/']) {
      expect(list).toContain(path);
    }
  });
});
