import { type Locale, type MessageKey } from '@lazy-patta/localization';
import type { Metadata } from 'next';

export type GameSlug = 'gadha-chor' | 'lal-satti' | 'jhabbu';

export interface GameDiscoveryConfig {
  readonly slug: GameSlug;
  /**
   * `true` once the game has a real single-player (computer) experience.
   * Coming-soon games still get crawlable overview + rules pages, but no
   * Play buttons and no `/play/...` sitemap entries.
   */
  readonly playable: boolean;
  /**
   * `true` once the game has a live online/family multiplayer experience.
   * A game can be `playable` (computer mode is live) while `onlinePlayable`
   * is still `false` — in that case the online/family CTA renders as a
   * "coming soon" affordance instead of a working link.
   */
  readonly onlinePlayable: boolean;
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
    playable: true,
    onlinePlayable: true,
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
    playable: true,
    onlinePlayable: true,
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
  jhabbu: {
    slug: 'jhabbu',
    // Computer (single-player) mode is live, so Jhabbu gets Play routes and a
    // practice CTA. Online/family multiplayer is not built yet, so the online
    // CTA renders as "coming soon" (see `onlinePlayable`).
    playable: true,
    onlinePlayable: false,
    nameKey: 'games.jhabbu.name',
    pageHeadingKey: 'games.jhabbu.pageHeading',
    descriptionKey: 'games.jhabbu.description',
    aliasShortKey: 'games.jhabbu.aliasShort',
    aliasesKey: 'games.jhabbu.aliases',
    hindiNameKey: 'games.jhabbu.hindiName',
    gujaratiNameKey: 'games.jhabbu.gujaratiName',
    metaTitleKey: 'games.jhabbu.metaTitle',
    metaDescriptionKey: 'games.jhabbu.metaDescription',
    detailIntroKey: 'games.jhabbu.detailIntro',
    otherNamesSummaryKey: 'games.jhabbu.otherNamesSummary',
    sections: [
      {
        titleKey: 'games.jhabbu.howTitle',
        bodyKey: 'games.jhabbu.howBody',
      },
      {
        titleKey: 'games.jhabbu.thullaTitle',
        bodyKey: 'games.jhabbu.thullaBody',
      },
      {
        titleKey: 'games.jhabbu.getawayTitle',
        bodyKey: 'games.jhabbu.getawayBody',
      },
      {
        titleKey: 'games.jhabbu.familyTitle',
        bodyKey: 'games.jhabbu.familyBody',
      },
    ],
    // Intended future routes — never rendered or sitemapped while `playable`
    // is false, but kept accurate so flipping the flag is the only change.
    computerHref: '/play/jhabbu/computer',
    onlineHref: '/play/online?game=jhabbu',
    slugAliases: ['bhabho', 'bhabhi', 'laad', 'get-away', 'zabbu'],
    alternateNames: ['Bhabho', 'Bhabhi', 'Laad', 'Get Away', 'Zabbu'],
  },
};

export const GAME_SLUGS = Object.keys(GAME_DISCOVERY) as readonly GameSlug[];

/** Games with a live computer experience — the only ones that get Play routes. */
export const PLAYABLE_GAME_SLUGS = GAME_SLUGS.filter(
  (slug) => GAME_DISCOVERY[slug].playable,
) as readonly GameSlug[];
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
