import { describe, expect, it } from 'vitest';

import { GAME_CAPABILITIES, canUseMode, findCapabilityByRoomGameKey } from './product-capabilities';

describe('GAME_CAPABILITIES', () => {
  it('is the authoritative availability source for live and coming-soon games', () => {
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
