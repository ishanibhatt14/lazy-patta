import type { MessageKey } from '@lazy-patta/localization';

import type { OnlineGameKey } from './rooms/rooms-client';

export type ProductGameSlug =
  'gadha-chor' | 'lal-satti' | 'jhabbu' | 'kachuful' | 'mendicot' | '3-2-5';

export type GameMode = 'computer' | 'private-room' | 'pass-and-play';
export type CapabilityStatus = 'available' | 'beta' | 'coming-soon' | 'temporarily-unavailable';

export interface GameCapability {
  readonly gameSlug: ProductGameSlug;
  readonly availability: {
    readonly game: CapabilityStatus;
    readonly computer: CapabilityStatus;
    readonly privateRoom: CapabilityStatus;
    readonly passAndPlay: CapabilityStatus;
  };
  readonly players: {
    readonly min: number;
    readonly max: number;
    readonly defaultComputer?: number;
  };
  readonly routes: {
    readonly details?: string;
    readonly rules?: string;
    readonly computer?: string;
    readonly createRoom?: string;
  };
  readonly roomGameKey?: OnlineGameKey;
  readonly reasonKeys?: {
    readonly gameUnavailable?: MessageKey;
    readonly roomUnavailable?: MessageKey;
  };
}

export const GAME_CAPABILITIES: Record<ProductGameSlug, GameCapability> = {
  'gadha-chor': {
    gameSlug: 'gadha-chor',
    availability: {
      game: 'available',
      computer: 'available',
      // Family rooms are not reliably live yet (see /mobile/rooms and
      // GAME_DISCOVERY.onlinePlayable). PR 8 flips this to 'available' once the
      // vertical slice passes; until then no surface may promise private rooms.
      privateRoom: 'coming-soon',
      passAndPlay: 'coming-soon',
    },
    players: { min: 2, max: 6, defaultComputer: 4 },
    routes: {
      details: '/games/gadha-chor',
      rules: '/games/gadha-chor',
      computer: '/mobile/game/gadha-chor/setup?mode=computer',
      createRoom: '/mobile/rooms?game=gadha_chor',
    },
    roomGameKey: 'gadha_chor',
    reasonKeys: { roomUnavailable: 'rooms.unavailableComingSoon' },
  },
  'lal-satti': {
    gameSlug: 'lal-satti',
    availability: {
      game: 'available',
      computer: 'available',
      // Family rooms are not reliably live yet (see /mobile/rooms and
      // GAME_DISCOVERY.onlinePlayable). PR 8 flips this to 'available' once the
      // vertical slice passes; until then no surface may promise private rooms.
      privateRoom: 'coming-soon',
      passAndPlay: 'coming-soon',
    },
    players: { min: 3, max: 6, defaultComputer: 4 },
    routes: {
      details: '/games/lal-satti',
      rules: '/games/lal-satti',
      computer: '/mobile/game/lal-satti/setup?mode=computer',
      createRoom: '/mobile/rooms?game=lal_satti',
    },
    roomGameKey: 'lal_satti',
    reasonKeys: { roomUnavailable: 'rooms.unavailableComingSoon' },
  },
  jhabbu: {
    gameSlug: 'jhabbu',
    availability: {
      game: 'available',
      computer: 'available',
      // Family rooms are not reliably live yet (see /mobile/rooms and
      // GAME_DISCOVERY.onlinePlayable). PR 8 flips this to 'available' once the
      // vertical slice passes; until then no surface may promise private rooms.
      privateRoom: 'coming-soon',
      passAndPlay: 'coming-soon',
    },
    players: { min: 3, max: 6, defaultComputer: 4 },
    routes: {
      details: '/games/jhabbu',
      rules: '/games/jhabbu',
      computer: '/mobile/game/jhabbu/setup?mode=computer',
      createRoom: '/mobile/rooms?game=jhabbu',
    },
    roomGameKey: 'jhabbu',
    reasonKeys: { roomUnavailable: 'rooms.unavailableComingSoon' },
  },
  kachuful: {
    gameSlug: 'kachuful',
    availability: {
      game: 'available',
      computer: 'available',
      // Family rooms are not reliably live yet (see /mobile/rooms and
      // GAME_DISCOVERY.onlinePlayable). PR 8 flips this to 'available' once the
      // vertical slice passes; until then no surface may promise private rooms.
      privateRoom: 'coming-soon',
      passAndPlay: 'coming-soon',
    },
    players: { min: 3, max: 7, defaultComputer: 4 },
    routes: {
      details: '/games/kachuful',
      rules: '/games/kachuful',
      computer: '/mobile/game/kachuful/setup?mode=computer',
      createRoom: '/mobile/rooms?game=kachuful',
    },
    roomGameKey: 'kachuful',
    reasonKeys: { roomUnavailable: 'rooms.unavailableComingSoon' },
  },
  mendicot: {
    gameSlug: 'mendicot',
    availability: {
      game: 'coming-soon',
      computer: 'coming-soon',
      privateRoom: 'coming-soon',
      passAndPlay: 'coming-soon',
    },
    players: { min: 4, max: 4 },
    routes: {},
    reasonKeys: {
      gameUnavailable: 'mobile.comingSoon.body',
      roomUnavailable: 'rooms.unavailableComingSoon',
    },
  },
  '3-2-5': {
    gameSlug: '3-2-5',
    availability: {
      game: 'coming-soon',
      computer: 'coming-soon',
      privateRoom: 'coming-soon',
      passAndPlay: 'coming-soon',
    },
    players: { min: 3, max: 3 },
    routes: {},
    reasonKeys: {
      gameUnavailable: 'mobile.comingSoon.body',
      roomUnavailable: 'rooms.unavailableComingSoon',
    },
  },
};

export function getGameCapability(slug: ProductGameSlug): GameCapability {
  return GAME_CAPABILITIES[slug];
}

export function findCapabilityByRoomGameKey(gameKey: string | null): GameCapability | undefined {
  if (!gameKey) return undefined;
  return Object.values(GAME_CAPABILITIES).find((capability) => capability.roomGameKey === gameKey);
}

export function canUseMode(capability: GameCapability, mode: GameMode): boolean {
  if (mode === 'computer') return capability.availability.computer === 'available';
  if (mode === 'private-room') return capability.availability.privateRoom === 'available';
  return capability.availability.passAndPlay === 'available';
}

export function isRoomCapable(capability: GameCapability): boolean {
  return (
    capability.availability.privateRoom === 'available' && capability.roomGameKey !== undefined
  );
}
