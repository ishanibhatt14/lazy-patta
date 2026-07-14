import type { MetadataRoute } from 'next';

import { absoluteUrl } from '../lib/seo/site';

/**
 * Robots policy. Private/session and auth surfaces are disallowed here as a
 * crawl-budget hint, but real protection comes from `noindex` meta on those
 * pages (see the join/room/auth routes) — never rely on robots.txt to hide
 * private data. Public landing, game, rules, and legal pages stay crawlable.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/account/', '/profile/', '/room/', '/join/', '/*?room='],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
