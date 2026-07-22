import { describe, expect, it } from 'vitest';

import { GAME_DISCOVERY, type GameSlug } from './game-discovery';
import { GAME_REGISTRY } from './mobile/game-registry';
import { MOBILE_CATALOG } from './mobile-catalog';
import {
  GAME_CAPABILITIES,
  canUseMode,
  findCapabilityByRoomGameKey,
  getGameCapability,
  isRoomCapable,
  type ProductGameSlug,
} from './product-capabilities';

const PLAYABLE_SLUGS = ['gadha-chor', 'lal-satti', 'jhabbu', 'kachuful'] as const satisfies readonly GameSlug[];
const COMING_SOON_SLUGS = ['mendicot', '3-2-5'] as const satisfies readonly ProductGameSlug[];

describe('GAME_CAPABILITIES', () => {
  it('is the authoritative availability source for live and coming-soon games', () => {
    // Family rooms are not reliably live yet — the honest status is coming-soon
    // until the PR 8 vertical slice passes.
    expect(GAME_CAPABILITIES['gadha-chor'].availability.privateRoom).toBe('coming-soon');
    expect(GAME_CAPABILITIES.mendicot.availability.privateRoom).toBe('coming-soon');
    expect(GAME_CAPABILITIES['3-2-5'].routes.createRoom).toBeUndefined();
  });

  it('resolves room game keys back to capabilities', () => {
    expect(findCapabilityByRoomGameKey('lal_satti')?.gameSlug).toBe('lal-satti');
    expect(findCapabilityByRoomGameKey('mendicot')).toBeUndefined();
  });

  it('gates mode usage through capability status', () => {
    expect(canUseMode(GAME_CAPABILITIES.jhabbu, 'computer')).toBe(true);
    expect(canUseMode(GAME_CAPABILITIES.jhabbu, 'pass-and-play')).toBe(false);
  });
});

// LP-101: every current game has an explicit capability contract test so a
// silent change to availability, player limits or routes fails loudly.
describe.each(PLAYABLE_SLUGS)('capability contract for %s', (slug) => {
  const capability = getGameCapability(slug);

  it('is a live game with a live computer experience', () => {
    expect(capability.availability.game).toBe('available');
    expect(capability.availability.computer).toBe('available');
  });

  it('offers Practice With Computer via a real setup route', () => {
    expect(capability.routes.computer).toBeTruthy();
  });

  it('declares a family-room game key and a coming-soon room explanation', () => {
    expect(capability.roomGameKey).toBeTruthy();
    expect(capability.reasonKeys?.roomUnavailable).toBe('rooms.unavailableComingSoon');
  });

  it('does not yet promise a live family room (honest until PR 8)', () => {
    expect(capability.availability.privateRoom).toBe('coming-soon');
    expect(canUseMode(capability, 'private-room')).toBe(false);
    expect(isRoomCapable(capability)).toBe(false);
  });
});

// LP-103: Home, mode sheets, game pages, Rooms and backend validation must read
// the same status. These invariants keep the registries from drifting apart.
describe('cross-registry consistency (LP-103)', () => {
  it.each(PLAYABLE_SLUGS)(
    'locks private-room availability to onlinePlayable for %s',
    (slug) => {
      const roomAvailable = GAME_CAPABILITIES[slug].availability.privateRoom === 'available';
      expect(roomAvailable).toBe(GAME_DISCOVERY[slug].onlinePlayable);
    },
  );

  it.each(PLAYABLE_SLUGS)('agrees on player limits across registries for %s', (slug) => {
    const cap = GAME_CAPABILITIES[slug].players;
    const reg = GAME_REGISTRY[slug].players;
    expect({ min: reg.min, max: reg.max }).toEqual({ min: cap.min, max: cap.max });

    const catalogItem = MOBILE_CATALOG.find((item) => item.slug === slug);
    expect(catalogItem).toBeDefined();
    expect({ min: catalogItem!.minPlayers, max: catalogItem!.maxPlayers }).toEqual({
      min: cap.min,
      max: cap.max,
    });
  });

  it.each(COMING_SOON_SLUGS)('never exposes a launch route for coming-soon game %s', (slug) => {
    const cap = GAME_CAPABILITIES[slug];
    expect(cap.availability.game).toBe('coming-soon');
    expect(cap.routes.computer).toBeUndefined();
    expect(cap.routes.createRoom).toBeUndefined();
  });

  it('exposes no live family room on any surface yet', () => {
    for (const capability of Object.values(GAME_CAPABILITIES)) {
      expect(isRoomCapable(capability)).toBe(false);
    }
    for (const item of MOBILE_CATALOG) {
      expect(item.roomGameKey).toBeUndefined();
    }
  });
});
