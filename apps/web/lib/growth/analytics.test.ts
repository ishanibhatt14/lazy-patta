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

  it('accepts the family-group lifecycle events without private fields', () => {
    for (const event of [
      { name: 'family_hub_viewed', familyCount: 2 },
      { name: 'family_group_create_started' },
      { name: 'family_group_created' },
      { name: 'family_group_join_started' },
      { name: 'family_group_joined' },
    ] as const) {
      expect(() => assertGrowthEventSafe(event)).not.toThrow();
    }
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
