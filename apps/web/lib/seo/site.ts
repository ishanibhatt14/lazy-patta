/**
 * Canonical public origin for Lazy Patta. `lazypatta.com` is the single
 * indexable domain; every other host (www, .games, vercel.app) redirects here.
 *
 * This module intentionally re-exports the validated origin from
 * {@link siteConfig} so there is exactly one source of truth. `site-config.ts`
 * performs the build-time URL validation (https-only, valid absolute URL,
 * origin-normalized) and is overridable per-environment via NEXT_PUBLIC_SITE_URL.
 */
import { siteConfig, absoluteUrl as absoluteUrlFromConfig } from '../site-config';

export const SITE_URL = siteConfig.canonicalOrigin;

export function absoluteUrl(path: string): string {
  return absoluteUrlFromConfig(path);
}
