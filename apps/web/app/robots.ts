import type { MetadataRoute } from 'next';

import { absoluteUrl } from '../lib/site-config';

/**
 * Robots policy. Public landing, game, rules, and legal pages are crawlable.
 * Private rooms, auth/callback surfaces, internal APIs, and the component
 * gallery are disallowed — they hold no durable public content and must not be
 * indexed. The sitemap is advertised on the canonical host.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/join/', '/play/online/', '/gallery', '/.well-known/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
