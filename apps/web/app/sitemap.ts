import type { Locale } from '@lazy-patta/localization';
import type { MetadataRoute } from 'next';

import {
  GAME_LOCALES,
  GAME_SLUGS,
  PLAYABLE_GAME_SLUGS,
  defaultGamePath,
  localizedGamePath,
  type GameSlug,
} from '../lib/game-discovery';
import { gamesIndexPath, rulesIndexPath, rulesPath } from '../lib/seo/routes';
import { absoluteUrl as absolute } from '../lib/seo/site';

type Alternates = NonNullable<MetadataRoute.Sitemap[number]['alternates']>;

/** Reciprocal hreflang set (every locale + English `x-default`) for a path family. */
function localeAlternates(pathFor: (locale: Locale) => string): Alternates {
  const languages: Record<string, string> = {};
  for (const locale of GAME_LOCALES) {
    languages[locale] = absolute(pathFor(locale));
  }
  languages['x-default'] = absolute(pathFor('en'));
  return { languages };
}

/** One sitemap entry per locale for a locale-prefixed page family. */
function localizedFamily(
  pathFor: (locale: Locale) => string,
  priority: number,
): MetadataRoute.Sitemap {
  const alternates = localeAlternates(pathFor);
  return GAME_LOCALES.map((locale) => ({
    url: absolute(pathFor(locale)),
    changeFrequency: 'monthly',
    priority,
    alternates,
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: absolute('/'),
      changeFrequency: 'weekly',
      priority: 1,
      // Image sitemap hints for the two images that actually live on the
      // homepage: the family hero and the brand logo. Helps Google discover
      // them for Images separately from page indexing.
      images: [
        absolute('/images/landing/gujarati-family-card-night-1448.avif'),
        absolute('/images/lazy-patta-logo-256.png'),
      ],
    },
    {
      url: absolute('/mobile'),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: absolute('/play/online'),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Legal/support pages: English-only for now, low change frequency.
    ...(['/privacy', '/terms', '/support', '/delete-account'] as const).map((path) => ({
      url: absolute(path),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
  ];

  const gamesIndex = localizedFamily(gamesIndexPath, 0.7);
  const rulesIndex = localizedFamily(rulesIndexPath, 0.7);

  // Game detail pages consolidate English on the short `/games/{slug}` URL
  // (see `gameAlternates`), so the sitemap lists that as the English entry and
  // omits `/en/games/{slug}` — only Hindi/Gujarati get locale-prefixed entries.
  const gameRoutes = GAME_SLUGS.flatMap((slug: GameSlug) => {
    const alternates: Alternates = {
      languages: {
        en: absolute(defaultGamePath(slug)),
        hi: absolute(localizedGamePath('hi', slug)),
        gu: absolute(localizedGamePath('gu', slug)),
        'x-default': absolute(defaultGamePath(slug)),
      },
    };
    return [
      {
        url: absolute(defaultGamePath(slug)),
        changeFrequency: 'monthly' as const,
        priority: 0.9,
        alternates,
      },
      ...(['hi', 'gu'] as const).map((locale) => ({
        url: absolute(localizedGamePath(locale, slug)),
        changeFrequency: 'monthly' as const,
        priority: 0.75,
        alternates,
      })),
    ];
  });

  const rulesRoutes = GAME_SLUGS.flatMap((slug: GameSlug) =>
    localizedFamily((locale) => rulesPath(locale, slug), 0.8),
  );

  // Static single-player "play the computer" landings carry meaningful
  // server-rendered content, so they are indexable (spec §11). Only PLAYABLE
  // games get these routes — coming-soon games (e.g. Jhabbu) have no computer
  // experience yet, so emitting a play URL would 404 / mislead crawlers.
  const computerRoutes: MetadataRoute.Sitemap = PLAYABLE_GAME_SLUGS.map((slug: GameSlug) => ({
    url: absolute(`/play/${slug}/computer`),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...gamesIndex,
    ...rulesIndex,
    ...gameRoutes,
    ...rulesRoutes,
    ...computerRoutes,
  ];
}
