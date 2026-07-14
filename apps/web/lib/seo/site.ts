/**
 * Canonical public origin for Lazy Patta. `lazypatta.com` is the single
 * indexable domain; every other host (www, .games, vercel.app) redirects here.
 * Overridable per-environment (e.g. preview deployments) via NEXT_PUBLIC_SITE_URL.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lazypatta.com';

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
