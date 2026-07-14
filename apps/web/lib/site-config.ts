/**
 * Single source of truth for the canonical public identity of Lazy Patta.
 *
 * Every place that emits an absolute URL (metadata, canonicals, sitemap, room
 * invite links, structured data) MUST derive it from {@link siteConfig} so the
 * production canonical host lives in exactly one place. Hardcoding the old
 * preview host or any `*.vercel.app` origin elsewhere is a bug — the
 * `check-forbidden-domains` guard rejects it.
 *
 * Preview deployments may render from a `*.vercel.app` origin, but the canonical
 * metadata they emit must still point at the permanent domain. That is the whole
 * reason this value is a build-time constant rather than `window.location`.
 */

const DEFAULT_CANONICAL_ORIGIN = 'https://lazypatta.com';
const DEFAULT_SUPPORT_EMAIL = 'support@lazypatta.com';

/**
 * Validates and normalizes a configured origin at module-load (build) time.
 * Throws with a clear message rather than letting an invalid value silently
 * poison every canonical tag on the site.
 */
function resolveCanonicalOrigin(raw: string | undefined): string {
  const candidate = (raw ?? DEFAULT_CANONICAL_ORIGIN).trim();

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL is not a valid absolute URL: "${candidate}". ` +
        `Expected something like "https://lazypatta.com".`,
    );
  }

  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must use https (got "${url.protocol}//" for "${candidate}"). ` +
        `Only localhost may use http for local development.`,
    );
  }

  // Origin form only — strip any path/query/hash and the trailing slash so
  // callers can safely do `new URL(path, canonicalOrigin)`.
  return url.origin;
}

const canonicalOrigin = resolveCanonicalOrigin(process.env.NEXT_PUBLIC_SITE_URL);

const supportEmail = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? DEFAULT_SUPPORT_EMAIL).trim();

export const siteConfig = {
  name: 'Lazy Patta',
  shortName: 'Lazy Patta',
  descriptor: 'Desi Indian Card Games',
  description: 'Play Gadha Chor, Lal Satti, and traditional Indian family card games online.',
  /** Permanent public origin, e.g. `https://lazypatta.com` (no trailing slash). */
  canonicalOrigin,
  supportEmail,
  socialHandle: '@lazypatta',
  /** Absolute URL used for Open Graph / Twitter social previews. */
  socialImagePath: '/images/lazy-patta-ios-icon-opaque-maroon-1024.png',
} as const;

/** Resolves a site-relative path to an absolute canonical URL. */
export function absoluteUrl(path = '/'): string {
  return new URL(path, siteConfig.canonicalOrigin).toString();
}
