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

  const gameRoutes = GAME_SLUGS.flatMap((slug: GameSlug) => [
    {
      url: absolute(defaultGamePath(slug)),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    ...localizedFamily((locale) => localizedGamePath(locale, slug), 0.75),
  ]);

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
