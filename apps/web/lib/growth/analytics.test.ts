import { describe, expect, it, vi } from 'vitest';

import { assertGrowthEventSafe, trackGrowthEvent, type GrowthEvent } from './analytics';

describe('growth analytics contract', () => {
  it('accepts the North Star completion event without private fields', () => {
    expect(() =>
      assertGrowthEventSafe({
        name: 'family_multiplayer_game_completed',
        gameSlug: 'gadha-chor',
        playerCount: 4,
        roundDurationSeconds: 120,
      }),
    ).not.toThrow();
  });

  it('rejects forbidden analytics fields', () => {
    expect(() =>
      assertGrowthEventSafe({
        name: 'invite_opened',
        roomCode: 'LP57AB',
      } as GrowthEvent),
    ).toThrow(/Forbidden/);
  });

  it('dispatches browser events and swallows failures', () => {
    const spy = vi.spyOn(window, 'dispatchEvent');
    trackGrowthEvent({ name: 'mobile_home_viewed' });
    expect(spy).toHaveBeenCalledOnce();
  });
});
