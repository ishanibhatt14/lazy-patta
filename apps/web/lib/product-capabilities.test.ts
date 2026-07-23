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

const PLAYABLE_SLUGS = [
  'gadha-chor',
  'lal-satti',
  'jhabbu',
  'kachuful',
] as const satisfies readonly GameSlug[];
const COMING_SOON_SLUGS = ['mendicot', '3-2-5'] as const satisfies readonly ProductGameSlug[];

describe('GAME_CAPABILITIES', () => {
  it('is the authoritative availability source for live and coming-soon games', () => {
    // Private family rooms are verified live against production Supabase, so the
    // four live games are now 'available'; unbuilt games stay coming-soon.
    expect(GAME_CAPABILITIES['gadha-chor'].availability.privateRoom).toBe('available');
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

  it('promises a live family room now that private rooms are verified', () => {
    expect(capability.availability.privateRoom).toBe('available');
    expect(canUseMode(capability, 'private-room')).toBe(true);
    expect(isRoomCapable(capability)).toBe(true);
  });
});

// LP-103: Home, mode sheets, game pages, Rooms and backend validation must read
// the same status. These invariants keep the registries from drifting apart.
describe('cross-registry consistency (LP-103)', () => {
  it.each(PLAYABLE_SLUGS)('locks private-room availability to onlinePlayable for %s', (slug) => {
    const roomAvailable = GAME_CAPABILITIES[slug].availability.privateRoom === 'available';
    expect(roomAvailable).toBe(GAME_DISCOVERY[slug].onlinePlayable);
  });

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

  it('exposes a live family room for the four live games and none for coming-soon games', () => {
    for (const slug of PLAYABLE_SLUGS) {
      expect(isRoomCapable(GAME_CAPABILITIES[slug])).toBe(true);
    }
    for (const slug of COMING_SOON_SLUGS) {
      expect(isRoomCapable(GAME_CAPABILITIES[slug])).toBe(false);
    }
    // Coming-soon games never surface a room key in the mobile catalog.
    for (const item of MOBILE_CATALOG.filter((g) => g.availability === 'coming-soon')) {
      expect(item.roomGameKey).toBeUndefined();
    }
    // Every live game does surface its room key now.
    for (const item of MOBILE_CATALOG.filter((g) => g.availability === 'available')) {
      expect(item.roomGameKey).toBeTruthy();
    }
  });
});
