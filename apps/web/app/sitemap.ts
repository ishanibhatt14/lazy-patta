import type { MetadataRoute } from 'next';

import { GAME_LOCALES, GAME_SLUGS } from '../lib/game-discovery';
import { absoluteUrl } from '../lib/site-config';

/**
 * Canonical sitemap. Lists only durable, indexable, public pages on the
 * canonical domain. Deliberately excludes: private room pages (`/join/*`,
 * `/play/online/*`), internal APIs, the component gallery, and any preview or
 * alias hosts. Localized game routes are emitted with reciprocal hreflang
 * alternates so Google can pick the right language per query.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPaths = [
    '/',
    '/play/online',
    '/download',
    '/privacy',
    '/terms',
    '/support',
    '/delete-account',
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
  }));

  // Game overview + computer-play pages, in the default (unprefixed) locale plus
  // each localized variant, cross-linked via hreflang alternates.
  const gameEntries: MetadataRoute.Sitemap = GAME_SLUGS.flatMap((slug) => {
    const languages = Object.fromEntries([
      ...GAME_LOCALES.map((locale) => [locale, absoluteUrl(`/${locale}/games/${slug}`)]),
      ['x-default', absoluteUrl(`/games/${slug}`)],
    ]);

    const overview: MetadataRoute.Sitemap = [
      {
        url: absoluteUrl(`/games/${slug}`),
        lastModified: now,
        alternates: { languages },
      },
      ...GAME_LOCALES.map((locale) => ({
        url: absoluteUrl(`/${locale}/games/${slug}`),
        lastModified: now,
        alternates: { languages },
      })),
    ];

    const computer: MetadataRoute.Sitemap = [
      { url: absoluteUrl(`/play/${slug}/computer`), lastModified: now },
    ];

    return [...overview, ...computer];
  });

  return [...staticEntries, ...gameEntries];
}
