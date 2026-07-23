import { describe, expect, it } from 'vitest';

import { gameLifecycleEvent, startedAtMsOf } from './room-telemetry';

describe('gameLifecycleEvent', () => {
  it('emits multiplayer_game_started for an active game', () => {
    expect(
      gameLifecycleEvent({ status: 'active', gameSlug: 'gadha-chor', playerCount: 3, nowMs: 100 }),
    ).toEqual({ name: 'multiplayer_game_started', gameSlug: 'gadha-chor', playerCount: 3 });
  });

  it('emits family_multiplayer_game_completed with the elapsed round duration', () => {
    expect(
      gameLifecycleEvent({
        status: 'complete',
        gameSlug: 'kachuful',
        playerCount: 4,
        startedAtMs: 10_000,
        nowMs: 190_000,
      }),
    ).toEqual({
      name: 'family_multiplayer_game_completed',
      gameSlug: 'kachuful',
      playerCount: 4,
      roundDurationSeconds: 180,
    });
  });

  it('falls back to a zero duration when the start time is unknown', () => {
    const event = gameLifecycleEvent({
      status: 'complete',
      gameSlug: 'jhabbu',
      playerCount: 2,
      nowMs: 5_000,
    });
    expect(event).toMatchObject({
      name: 'family_multiplayer_game_completed',
      roundDurationSeconds: 0,
    });
  });

  it('never reports a negative duration from a clock skew', () => {
    const event = gameLifecycleEvent({
      status: 'complete',
      gameSlug: 'lal-satti',
      playerCount: 2,
      startedAtMs: 9_000,
      nowMs: 1_000,
    });
    expect(event).toMatchObject({ roundDurationSeconds: 0 });
  });

  it('emits nothing for an abandoned game', () => {
    expect(
      gameLifecycleEvent({ status: 'abandoned', gameSlug: 'gadha-chor', playerCount: 2, nowMs: 1 }),
    ).toBeNull();
  });
});

describe('startedAtMsOf', () => {
  it('parses an ISO timestamp to epoch ms', () => {
    expect(startedAtMsOf('2026-01-01T00:00:00.000Z')).toBe(Date.parse('2026-01-01T00:00:00.000Z'));
  });

  it('returns undefined for missing or unparseable input', () => {
    expect(startedAtMsOf(undefined)).toBeUndefined();
    expect(startedAtMsOf('not-a-date')).toBeUndefined();
  });
});
