'use client';

/**
 * Builds the browser redirect used by Supabase email auth. Keeping this explicit
 * prevents production emails from falling back to a stale Supabase Site URL such
 * as localhost:3000.
 */
export function getBrowserAuthRedirectUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}${window.location.pathname}`;
}
