import type { BotDifficulty } from '@lazy-patta/game-contracts';
import type { MessageKey } from '@lazy-patta/localization';

import { GAME_DISCOVERY, type GameSlug } from '../game-discovery';
import type { OnlineGameKey } from '../rooms/rooms-client';

export type { GameSlug };

export type GameMode = 'computer' | 'private-room' | 'pass-and-play';

export interface GameDefinition {
  readonly slug: GameSlug;
  readonly engineId: GameSlug;
  readonly available: boolean;
  readonly players: {
    readonly min: number;
    readonly max: number;
    readonly defaultComputer: number;
  };
  readonly supportedModes: readonly GameMode[];
  readonly computerOptions: {
    readonly supportsDifficulty: boolean;
    readonly defaultDifficulty?: BotDifficulty;
  };
  readonly routes: {
    readonly mobileSetup: string;
    readonly mobileComputer: (sessionId: string) => string;
    readonly legacyComputer: string;
    readonly rules: string;
  };
  readonly roomGameKey: OnlineGameKey;
  readonly localization: {
    readonly nameKey: MessageKey;
    readonly alternateNameKeys: readonly MessageKey[];
    readonly descriptionKey: MessageKey;
  };
}

const ROOM_GAME_KEY: Record<GameSlug, OnlineGameKey> = {
  'gadha-chor': 'gadha_chor',
  'lal-satti': 'lal_satti',
  jhabbu: 'jhabbu',
  kachuful: 'kachuful',
};

const PLAYER_LIMITS: Record<
  GameSlug,
  { readonly min: number; readonly max: number; readonly defaultComputer: number }
> = {
  'gadha-chor': { min: 2, max: 6, defaultComputer: 4 },
  'lal-satti': { min: 3, max: 6, defaultComputer: 4 },
  jhabbu: { min: 3, max: 6, defaultComputer: 4 },
  kachuful: { min: 3, max: 7, defaultComputer: 4 },
};

const DEFAULT_DIFFICULTY: Record<GameSlug, BotDifficulty | undefined> = {
  'gadha-chor': undefined,
  'lal-satti': 'medium',
  jhabbu: 'medium',
  kachuful: 'medium',
};

function defineGame(slug: GameSlug): GameDefinition {
  const discovery = GAME_DISCOVERY[slug];
  const setup = `/mobile/game/${slug}/setup?mode=computer`;
  return {
    slug,
    engineId: slug,
    available: discovery.playable,
    players: PLAYER_LIMITS[slug],
    supportedModes: ['computer', 'private-room'],
    computerOptions: {
      supportsDifficulty: slug !== 'gadha-chor',
      defaultDifficulty: DEFAULT_DIFFICULTY[slug],
    },
    routes: {
      mobileSetup: setup,
      mobileComputer: (sessionId) => `/mobile/game/${slug}/computer/${sessionId}`,
      legacyComputer: discovery.computerHref,
      rules: `/games/${slug}`,
    },
    roomGameKey: ROOM_GAME_KEY[slug],
    localization: {
      nameKey: discovery.nameKey,
      alternateNameKeys: [discovery.aliasShortKey],
      descriptionKey: discovery.descriptionKey,
    },
  };
}

export const GAME_REGISTRY: Record<GameSlug, GameDefinition> = {
  'gadha-chor': defineGame('gadha-chor'),
  'lal-satti': defineGame('lal-satti'),
  jhabbu: defineGame('jhabbu'),
  kachuful: defineGame('kachuful'),
};

export const MOBILE_GAME_SLUGS = Object.keys(GAME_REGISTRY) as readonly GameSlug[];

export function findGameDefinition(slug: string): GameDefinition | undefined {
  return MOBILE_GAME_SLUGS.includes(slug as GameSlug) ? GAME_REGISTRY[slug as GameSlug] : undefined;
}

export function isValidGameSlug(slug: string): slug is GameSlug {
  return findGameDefinition(slug) !== undefined;
}

export function isValidPlayerCount(game: GameDefinition, count: number): boolean {
  return Number.isInteger(count) && count >= game.players.min && count <= game.players.max;
}

export function clampPlayerCount(game: GameDefinition, count: number): number {
  if (!Number.isFinite(count)) return game.players.defaultComputer;
  return Math.min(game.players.max, Math.max(game.players.min, Math.round(count)));
}
