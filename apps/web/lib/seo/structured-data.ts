import type { Locale } from '@lazy-patta/localization';

import { GAME_DISCOVERY, localizedGamePath, type GameSlug } from '../game-discovery';
import { MOBILE_SCREENSHOTS } from '../mobile/screenshots';

import { absoluteUrl, SITE_URL } from './site';

export type JsonLdObject = Record<string, unknown>;

const ORGANIZATION_ID = absoluteUrl('/#organization');
const WEBSITE_ID = absoluteUrl('/#website');

export function organizationJsonLd(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: 'Lazy Patta',
    url: SITE_URL,
    // Square 512×512 ImageObject (matches the search favicon) so Google has an
    // unambiguous, high-res brand logo rather than a bare URL string.
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/icons/icon-512.png'),
      width: 512,
      height: 512,
    },
  };
}

export function websiteJsonLd(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: 'Lazy Patta',
    url: SITE_URL,
    inLanguage: ['en', 'gu', 'hi'],
    publisher: { '@id': ORGANIZATION_ID },
  };
}

/**
 * WebApplication markup for the mobile-browser experience at `/mobile`. Modeled
 * as a free, browser-based GameApplication with real product screenshots. No
 * ratings/reviews/offers beyond the honest free price, per the no-fabrication rule.
 */
export function webApplicationJsonLd(description: string): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Lazy Patta',
    url: absoluteUrl('/mobile'),
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript and a modern web browser',
    description,
    image: absoluteUrl('/icons/icon-512.png'),
    screenshot: MOBILE_SCREENSHOTS.map((shot) => absoluteUrl(shot.path)),
    publisher: { '@id': ORGANIZATION_ID },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
}

export interface VideoGameInput {
  readonly slug: GameSlug;
  readonly locale: Locale;
  readonly name: string;
  readonly description: string;
}

/** No aggregateRating/review/offer — spec forbids fabricated ratings or prices. */
export function videoGameJsonLd({ slug, locale, name, description }: VideoGameInput): JsonLdObject {
  const game = GAME_DISCOVERY[slug];
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name,
    alternateName: [...game.alternateNames],
    description,
    url: absoluteUrl(localizedGamePath(locale, slug)),
    inLanguage: locale,
    genre: 'Card game',
    playMode: ['SinglePlayer', 'MultiPlayer'],
    gamePlatform: 'Web browser',
    publisher: { '@id': ORGANIZATION_ID },
  };
}

export interface BreadcrumbCrumb {
  readonly name: string;
  readonly path: string;
}

export function breadcrumbListJsonLd(crumbs: readonly BreadcrumbCrumb[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export interface FaqEntry {
  readonly question: string;
  readonly answer: string;
}

export function faqPageJsonLd(entries: readonly FaqEntry[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}
