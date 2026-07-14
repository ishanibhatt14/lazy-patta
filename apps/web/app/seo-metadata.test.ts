import { describe, expect, it } from 'vitest';

import { siteConfig } from '../lib/site-config';

import { metadata as homeMetadata } from './page';
import robots from './robots';
import sitemap from './sitemap';

function serialize(value: unknown): string {
  return JSON.stringify(value);
}

describe('homepage metadata', () => {
  it('sets the canonical to the homepage and the SEO title', () => {
    expect(homeMetadata.alternates?.canonical).toBe('/');
    expect(String(homeMetadata.title)).toContain('Lazy Patta');
    expect(String(homeMetadata.title)).toContain('Desi Indian Card Games');
  });

  it('never emits a preview or cross-promo host in metadata', () => {
    const blob = serialize(homeMetadata);
    expect(blob).not.toContain('vercel.app');
    expect(blob).not.toContain('lazytraveler');
  });
});

describe('sitemap', () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it('lists canonical public pages on the permanent domain', () => {
    expect(urls).toContain(siteConfig.canonicalOrigin + '/');
    expect(urls).toContain(siteConfig.canonicalOrigin + '/games/gadha-chor');
    expect(urls).toContain(siteConfig.canonicalOrigin + '/games/lal-satti');
    expect(urls).toContain(siteConfig.canonicalOrigin + '/download');
    expect(urls).toContain(siteConfig.canonicalOrigin + '/privacy');
  });

  it('excludes private and preview URLs', () => {
    for (const url of urls) {
      expect(url.startsWith(siteConfig.canonicalOrigin)).toBe(true);
      expect(url).not.toContain('/join/');
      expect(url).not.toContain('/play/online/');
      expect(url).not.toContain('vercel.app');
    }
  });

  it('includes localized game variants with hreflang alternates', () => {
    expect(urls).toContain(siteConfig.canonicalOrigin + '/hi/games/gadha-chor');
    expect(urls).toContain(siteConfig.canonicalOrigin + '/gu/games/lal-satti');
  });
});

describe('robots', () => {
  const result = robots();

  it('advertises the canonical sitemap', () => {
    expect(result.sitemap).toBe(siteConfig.canonicalOrigin + '/sitemap.xml');
  });

  it('disallows private and internal surfaces', () => {
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallow = rule?.disallow ?? [];
    const list = Array.isArray(disallow) ? disallow : [disallow];
    expect(list).toContain('/api/');
    expect(list).toContain('/join/');
  });
});
