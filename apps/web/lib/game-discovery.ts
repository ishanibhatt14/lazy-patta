import { type Locale, type MessageKey } from '@lazy-patta/localization';
import type { Metadata } from 'next';

export type GameSlug = 'gadha-chor' | 'lal-satti';

export interface GameDiscoveryConfig {
  readonly slug: GameSlug;
  readonly nameKey: MessageKey;
  readonly pageHeadingKey: MessageKey;
  readonly descriptionKey: MessageKey;
  readonly aliasShortKey: MessageKey;
  readonly aliasesKey: MessageKey;
  readonly hindiNameKey: MessageKey;
  readonly gujaratiNameKey: MessageKey;
  readonly metaTitleKey: MessageKey;
  readonly metaDescriptionKey: MessageKey;
  readonly detailIntroKey: MessageKey;
  readonly otherNamesSummaryKey: MessageKey;
  readonly sections: readonly {
    readonly titleKey: MessageKey;
    readonly bodyKey: MessageKey;
  }[];
  readonly computerHref: string;
  readonly onlineHref: string;
  /** Kebab-case URL aliases that redirect to this canonical slug (future redirect PR). */
  readonly slugAliases: readonly string[];
  /** Human-readable alternate names for `VideoGame` JSON-LD `alternateName`. */
  readonly alternateNames: readonly string[];
}

export const GAME_DISCOVERY: Record<GameSlug, GameDiscoveryConfig> = {
  'gadha-chor': {
    slug: 'gadha-chor',
    nameKey: 'games.gadhaChor.name',
    pageHeadingKey: 'games.gadhaChor.pageHeading',
    descriptionKey: 'games.gadhaChor.description',
    aliasShortKey: 'games.gadhaChor.aliasShort',
    aliasesKey: 'games.gadhaChor.aliases',
    hindiNameKey: 'games.gadhaChor.hindiName',
    gujaratiNameKey: 'games.gadhaChor.gujaratiName',
    metaTitleKey: 'games.gadhaChor.metaTitle',
    metaDescriptionKey: 'games.gadhaChor.metaDescription',
    detailIntroKey: 'games.gadhaChor.detailIntro',
    otherNamesSummaryKey: 'games.gadhaChor.otherNamesSummary',
    sections: [
      {
        titleKey: 'games.gadhaChor.howTitle',
        bodyKey: 'games.gadhaChor.howBody',
      },
      {
        titleKey: 'games.gadhaChor.oldMaidTitle',
        bodyKey: 'games.gadhaChor.oldMaidBody',
      },
      {
        titleKey: 'games.gadhaChor.familyTitle',
        bodyKey: 'games.gadhaChor.familyBody',
      },
      {
        titleKey: 'games.gadhaChor.localRulesTitle',
        bodyKey: 'games.gadhaChor.localRulesBody',
      },
    ],
    computerHref: '/play/gadha-chor/computer',
    onlineHref: '/play/online?game=gadha_chor',
    slugAliases: ['gulam-chor', 'gulaam-chor', 'gaddha-chor', 'jack-thief'],
    alternateNames: ['Gulam Chor', 'Gulaam Chor', 'Gaddha Chor', 'Jack Thief'],
  },
  'lal-satti': {
    slug: 'lal-satti',
    nameKey: 'games.lalSatti.name',
    pageHeadingKey: 'games.lalSatti.pageHeading',
    descriptionKey: 'games.lalSatti.description',
    aliasShortKey: 'games.lalSatti.aliasShort',
    aliasesKey: 'games.lalSatti.aliases',
    hindiNameKey: 'games.lalSatti.hindiName',
    gujaratiNameKey: 'games.lalSatti.gujaratiName',
    metaTitleKey: 'games.lalSatti.metaTitle',
    metaDescriptionKey: 'games.lalSatti.metaDescription',
    detailIntroKey: 'games.lalSatti.detailIntro',
    otherNamesSummaryKey: 'games.lalSatti.otherNamesSummary',
    sections: [
      {
        titleKey: 'games.lalSatti.howTitle',
        bodyKey: 'games.lalSatti.howBody',
      },
      {
        titleKey: 'games.lalSatti.sevenTitle',
        bodyKey: 'games.lalSatti.sevenBody',
      },
      {
        titleKey: 'games.lalSatti.familyTitle',
        bodyKey: 'games.lalSatti.familyBody',
      },
      {
        titleKey: 'games.lalSatti.localRulesTitle',
        bodyKey: 'games.lalSatti.localRulesBody',
      },
    ],
    computerHref: '/play/lal-satti/computer',
    onlineHref: '/play/online?game=lal_satti',
    slugAliases: ['badam-saat', 'badam-satti', 'laal-satti', 'seven-of-hearts', 'sevens'],
    alternateNames: ['Badam Saat', 'Badam Satti', 'Laal Satti', 'Seven of Hearts', 'Sevens'],
  },
};

export const GAME_SLUGS = Object.keys(GAME_DISCOVERY) as readonly GameSlug[];
export const GAME_LOCALES: readonly Locale[] = ['en', 'hi', 'gu'];

export function localizedGamePath(locale: Locale, slug: GameSlug): string {
  return `/${locale}/games/${slug}`;
}

export function defaultGamePath(slug: GameSlug): string {
  return `/games/${slug}`;
}

export function gameAlternates(slug: GameSlug, canonicalLocale?: Locale): Metadata['alternates'] {
  return {
    canonical: canonicalLocale ? localizedGamePath(canonicalLocale, slug) : defaultGamePath(slug),
    languages: {
      en: localizedGamePath('en', slug),
      hi: localizedGamePath('hi', slug),
      gu: localizedGamePath('gu', slug),
      'x-default': defaultGamePath(slug),
    },
  };
}
