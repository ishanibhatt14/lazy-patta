import type { MessageKey } from '@lazy-patta/localization';

import { GAME_DISCOVERY, type GameSlug } from './game-discovery';
import type { OnlineGameKey } from './rooms/rooms-client';

/**
 * Config-driven catalog for the mobile app surface (`/mobile`). It is the single
 * source of truth for player limits, duration, difficulty and availability, so
 * no screen hardcodes "3–6 players" or a coming-soon flag of its own.
 *
 * Playable games are derived from {@link GAME_DISCOVERY} (which already owns the
 * canonical slug, name key and practice/rules routes) and augmented with the
 * table-shape metadata the app needs. Coming-soon games that do not yet have a
 * discovery entry (no rules/SEO pages) are declared inline and never link into a
 * broken route — the UI opens an info sheet instead.
 */

export type GameAvailability = 'available' | 'coming-soon';
export type GameDifficulty = 'easy' | 'strategy' | 'fast';

/** Warm palette roles a tile may adopt — all resolve to existing theme tokens. */
export type GameAccent = 'maroon' | 'teal' | 'saffron' | 'indigo';

export interface MobileCatalogItem {
  readonly id: string;
  readonly slug: string;
  readonly availability: GameAvailability;
  readonly nameKey: MessageKey;
  /** One-sentence "what is this game" line for tiles and the setup sheet. */
  readonly taglineKey: MessageKey;
  /** "Also known as …" alternate-name summary. */
  readonly alternateNamesKey: MessageKey;
  readonly difficulty: GameDifficulty;
  readonly difficultyKey: MessageKey;
  readonly durationMinutes: { readonly min: number; readonly max: number };
  readonly minPlayers: number;
  readonly maxPlayers: number;
  /** Practice-vs-computer route. Present only for playable games. */
  readonly practiceRoute?: string;
  /** Online-room game key. Present only for games with live family rooms. */
  readonly roomGameKey?: OnlineGameKey;
  /** Canonical rules page. Present only for games with discovery pages. */
  readonly rulesRoute?: string;
  readonly accent: GameAccent;
}

const DIFFICULTY_KEY: Record<GameDifficulty, MessageKey> = {
  easy: 'mobile.difficulty.easy',
  strategy: 'mobile.difficulty.strategy',
  fast: 'mobile.difficulty.fast',
};

/** Maps a discovery slug to the online-room game key used by `rooms-client`. */
const ROOM_GAME_KEY: Record<GameSlug, OnlineGameKey> = {
  'gadha-chor': 'gadha_chor',
  'lal-satti': 'lal_satti',
  jhabbu: 'jhabbu',
  kachuful: 'kachuful',
};

interface PlayableShape {
  readonly slug: GameSlug;
  readonly difficulty: GameDifficulty;
  readonly durationMinutes: { readonly min: number; readonly max: number };
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly taglineKey: MessageKey;
  readonly accent: GameAccent;
}

const PLAYABLE_SHAPES: readonly PlayableShape[] = [
  {
    slug: 'gadha-chor',
    difficulty: 'easy',
    durationMinutes: { min: 5, max: 10 },
    minPlayers: 2,
    maxPlayers: 6,
    taglineKey: 'games.gadhaChor.description',
    accent: 'maroon',
  },
  {
    slug: 'lal-satti',
    difficulty: 'strategy',
    durationMinutes: { min: 10, max: 20 },
    minPlayers: 3,
    maxPlayers: 6,
    taglineKey: 'games.lalSatti.description',
    accent: 'teal',
  },
  {
    slug: 'jhabbu',
    difficulty: 'fast',
    durationMinutes: { min: 15, max: 30 },
    minPlayers: 3,
    maxPlayers: 6,
    taglineKey: 'games.jhabbu.description',
    accent: 'saffron',
  },
  {
    slug: 'kachuful',
    difficulty: 'strategy',
    durationMinutes: { min: 20, max: 40 },
    minPlayers: 3,
    maxPlayers: 7,
    taglineKey: 'games.kachuful.description',
    accent: 'indigo',
  },
];

function playableItem(shape: PlayableShape): MobileCatalogItem {
  const discovery = GAME_DISCOVERY[shape.slug];
  return {
    id: shape.slug,
    slug: shape.slug,
    availability: 'available',
    nameKey: discovery.nameKey,
    taglineKey: shape.taglineKey,
    alternateNamesKey: discovery.aliasShortKey,
    difficulty: shape.difficulty,
    difficultyKey: DIFFICULTY_KEY[shape.difficulty],
    durationMinutes: shape.durationMinutes,
    minPlayers: shape.minPlayers,
    maxPlayers: shape.maxPlayers,
    practiceRoute: discovery.playable ? discovery.computerHref : undefined,
    roomGameKey: discovery.onlinePlayable ? ROOM_GAME_KEY[shape.slug] : undefined,
    rulesRoute: `/games/${shape.slug}`,
    accent: shape.accent,
  };
}

const COMING_SOON: readonly MobileCatalogItem[] = [
  {
    id: 'mendicot',
    slug: 'mendicot',
    availability: 'coming-soon',
    nameKey: 'mobile.comingSoon.mendicot.name',
    taglineKey: 'mobile.comingSoon.mendicot.tagline',
    alternateNamesKey: 'mobile.comingSoon.mendicot.aliases',
    difficulty: 'strategy',
    difficultyKey: DIFFICULTY_KEY.strategy,
    durationMinutes: { min: 20, max: 40 },
    minPlayers: 4,
    maxPlayers: 4,
    accent: 'teal',
  },
  {
    id: 'three-two-five',
    slug: 'three-two-five',
    availability: 'coming-soon',
    nameKey: 'mobile.comingSoon.threeTwoFive.name',
    taglineKey: 'mobile.comingSoon.threeTwoFive.tagline',
    alternateNamesKey: 'mobile.comingSoon.threeTwoFive.aliases',
    difficulty: 'strategy',
    durationMinutes: { min: 15, max: 30 },
    difficultyKey: DIFFICULTY_KEY.strategy,
    minPlayers: 3,
    maxPlayers: 3,
    accent: 'saffron',
  },
];

export const MOBILE_CATALOG: readonly MobileCatalogItem[] = [
  ...PLAYABLE_SHAPES.map(playableItem),
  ...COMING_SOON,
];

export const PLAYABLE_CATALOG: readonly MobileCatalogItem[] = MOBILE_CATALOG.filter(
  (item) => item.availability === 'available',
);

export function findCatalogItem(id: string): MobileCatalogItem | undefined {
  return MOBILE_CATALOG.find((item) => item.id === id);
}

/** True when `count` players can sit at this game's table. */
export function isValidPlayerCount(item: MobileCatalogItem, count: number): boolean {
  return (
    Number.isInteger(count) && count >= item.minPlayers && count <= item.maxPlayers
  );
}

/** True when a table with `seated` players may start (enough to deal). */
export function hasEnoughPlayers(item: MobileCatalogItem, seated: number): boolean {
  return seated >= item.minPlayers && seated <= item.maxPlayers;
}
