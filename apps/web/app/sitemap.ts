import type { MetadataRoute } from 'next';

import { GAME_SLUGS, defaultGamePath, localizedGamePath } from '../lib/game-discovery';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lazy-patta-web.vercel.app';

function absolute(path: string): string {
  return new URL(path, siteUrl).toString();
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
  ];

  const gameRoutes = GAME_SLUGS.flatMap((slug) => [
    {
      url: absolute(defaultGamePath(slug)),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    {
      url: absolute(localizedGamePath('en', slug)),
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    },
    {
      url: absolute(localizedGamePath('hi', slug)),
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    },
    {
      url: absolute(localizedGamePath('gu', slug)),
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    },
  ]);

  return [...staticRoutes, ...gameRoutes];
}
