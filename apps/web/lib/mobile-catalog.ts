import type { MessageKey } from '@lazy-patta/localization';

import { GAME_DISCOVERY, type GameSlug } from './game-discovery';
import { GAME_REGISTRY } from './mobile/game-registry';
import { getGameCapability, isRoomCapable } from './product-capabilities';
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

/** Per-game identity accents — each resolves to a theme-stable `game.*` token. */
export type GameAccent = 'gadha' | 'lalSatti' | 'jhabbu' | 'kachuful';

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

interface PlayableShape {
  readonly slug: GameSlug;
  readonly difficulty: GameDifficulty;
  readonly durationMinutes: { readonly min: number; readonly max: number };
  readonly taglineKey: MessageKey;
  readonly accent: GameAccent;
}

const PLAYABLE_SHAPES: readonly PlayableShape[] = [
  {
    slug: 'gadha-chor',
    difficulty: 'easy',
    durationMinutes: { min: 5, max: 10 },
    taglineKey: 'games.gadhaChor.description',
    accent: 'gadha',
  },
  {
    slug: 'lal-satti',
    difficulty: 'strategy',
    durationMinutes: { min: 10, max: 20 },
    taglineKey: 'games.lalSatti.description',
    accent: 'lalSatti',
  },
  {
    slug: 'jhabbu',
    difficulty: 'fast',
    durationMinutes: { min: 15, max: 30 },
    taglineKey: 'games.jhabbu.description',
    accent: 'jhabbu',
  },
  {
    slug: 'kachuful',
    difficulty: 'strategy',
    durationMinutes: { min: 20, max: 40 },
    taglineKey: 'games.kachuful.description',
    accent: 'kachuful',
  },
];

function playableItem(shape: PlayableShape): MobileCatalogItem {
  const discovery = GAME_DISCOVERY[shape.slug];
  const game = GAME_REGISTRY[shape.slug];
  const capability = getGameCapability(shape.slug);
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
    minPlayers: game.players.min,
    maxPlayers: game.players.max,
    practiceRoute:
      discovery.playable && capability.availability.computer === 'available'
        ? game.routes.mobileSetup
        : undefined,
    roomGameKey:
      discovery.onlinePlayable && isRoomCapable(capability) ? game.roomGameKey : undefined,
    rulesRoute: game.routes.rules,
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
    accent: 'lalSatti',
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
    accent: 'jhabbu',
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
  return Number.isInteger(count) && count >= item.minPlayers && count <= item.maxPlayers;
}

/** True when a table with `seated` players may start (enough to deal). */
export function hasEnoughPlayers(item: MobileCatalogItem, seated: number): boolean {
  return seated >= item.minPlayers && seated <= item.maxPlayers;
}
