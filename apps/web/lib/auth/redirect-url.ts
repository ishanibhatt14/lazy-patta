'use client';

import { siteConfig } from '../site-config';

/**
 * Builds the browser redirect used by Supabase email auth. Local dev and preview
 * deploys must round-trip on their own origin (otherwise a magic link opened
 * from a preview would bounce to production), but anywhere else we pin the
 * redirect to the canonical domain so a stale or unexpected origin can never be
 * baked into an auth email. We never hardcode the Vercel URL.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

function isPreviewOrLocal(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname) || hostname.endsWith('.vercel.app');
}

export function getBrowserAuthRedirectUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const { origin, pathname, hostname } = window.location;
  const base = isPreviewOrLocal(hostname) ? origin : siteConfig.canonicalOrigin;
  return `${base}${pathname}`;
}
