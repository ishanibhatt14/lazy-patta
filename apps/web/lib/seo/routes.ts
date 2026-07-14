import { LOCALES, type Locale } from '@lazy-patta/localization';
import type { Metadata } from 'next';

import type { GameSlug } from '../game-discovery';

/**
 * Locale-prefixed discovery routes. Gameplay routes (`/play/...`) stay on their
 * existing cookie-based paths; only the indexable discovery surface is prefixed.
 */
export function gamesIndexPath(locale: Locale): string {
  return `/${locale}/games`;
}

export function rulesIndexPath(locale: Locale): string {
  return `/${locale}/how-to-play`;
}

export function rulesPath(locale: Locale, slug: GameSlug): string {
  return `/${locale}/how-to-play/${slug}`;
}

/**
 * Reciprocal hreflang set for a locale-prefixed page family. Canonical is the
 * page's own locale; every locale plus an English `x-default` are cross-linked.
 * Used for routes that have no non-prefixed equivalent (unlike game topic pages,
 * whose `x-default` is the bare `/games/<slug>` route).
 */
export function localizedAlternates(
  pathFor: (locale: Locale) => string,
  canonicalLocale: Locale,
): Metadata['alternates'] {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = pathFor(locale);
  }
  languages['x-default'] = pathFor('en');

  return {
    canonical: pathFor(canonicalLocale),
    languages,
  };
}

export function gamesIndexAlternates(canonicalLocale: Locale): Metadata['alternates'] {
  return localizedAlternates(gamesIndexPath, canonicalLocale);
}

export function rulesIndexAlternates(canonicalLocale: Locale): Metadata['alternates'] {
  return localizedAlternates(rulesIndexPath, canonicalLocale);
}

export function rulesAlternates(slug: GameSlug, canonicalLocale: Locale): Metadata['alternates'] {
  return localizedAlternates((locale) => rulesPath(locale, slug), canonicalLocale);
}
