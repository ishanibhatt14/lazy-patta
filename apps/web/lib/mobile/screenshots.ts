import type { MessageKey } from '@lazy-patta/localization';

export interface MobileScreenshot {
  /** Public path under `/public`; also the source of truth for WebApplication JSON-LD. */
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly altKey: MessageKey;
  readonly captionKey: MessageKey;
  /** The one shot shown as the large featured visual in "See Lazy Patta in action". */
  readonly featured?: boolean;
}

/**
 * The product screenshots shown in the `/mobile` gallery, in display order. This
 * is the single source of truth: `webApplicationJsonLd` derives its `screenshot`
 * array from the same list, so the schema and the on-page gallery never drift.
 */
export const MOBILE_SCREENSHOTS: readonly [MobileScreenshot, ...MobileScreenshot[]] = [
  {
    path: '/images/screenshots/lazy-patta-mobile-home.png',
    width: 863,
    height: 1822,
    altKey: 'mobile.gallery.home.alt',
    captionKey: 'mobile.gallery.home.caption',
  },
  {
    path: '/images/screenshots/lazy-patta-lal-satti.png',
    width: 863,
    height: 1822,
    altKey: 'mobile.gallery.lalSatti.alt',
    captionKey: 'mobile.gallery.lalSatti.caption',
  },
  {
    path: '/images/screenshots/lazy-patta-game-setup.png',
    width: 863,
    height: 1822,
    altKey: 'mobile.gallery.setup.alt',
    captionKey: 'mobile.gallery.setup.caption',
  },
  {
    path: '/images/screenshots/lazy-patta-game-table.png',
    width: 1701,
    height: 393,
    altKey: 'mobile.gallery.table.alt',
    captionKey: 'mobile.gallery.table.caption',
    featured: true,
  },
  {
    path: '/images/screenshots/lazy-patta-win.png',
    width: 863,
    height: 1822,
    altKey: 'mobile.gallery.win.alt',
    captionKey: 'mobile.gallery.win.caption',
  },
];
