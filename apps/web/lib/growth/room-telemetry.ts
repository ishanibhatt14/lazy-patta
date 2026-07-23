import type { GameSlug } from '../game-discovery';

import type { GrowthEvent } from './analytics';

/**
 * Pure derivation of the live-room game-lifecycle telemetry. The two events that
 * matter most for release readiness — a family match *starting* and *completing*
 * on real devices — are derived here so the rule is unit-testable and the
 * component is left only with fire-once bookkeeping (one dispatch per game id per
 * phase). Completion carries the round duration, the roadmap's core signal that a
 * live multi-device hand actually ran end to end; it is clamped to a
 * non-negative whole number of seconds and falls back to 0 when the start time is
 * unknown, so a missing timestamp can never produce a negative or NaN metric.
 */
export function gameLifecycleEvent(input: {
  readonly status: 'active' | 'complete' | 'abandoned';
  readonly gameSlug: GameSlug;
  readonly playerCount: number;
  readonly startedAtMs?: number;
  readonly nowMs: number;
}): GrowthEvent | null {
  const { status, gameSlug, playerCount } = input;
  if (status === 'active') {
    return { name: 'multiplayer_game_started', gameSlug, playerCount };
  }
  if (status === 'complete') {
    const startedAtMs = input.startedAtMs;
    const roundDurationSeconds =
      startedAtMs != null && Number.isFinite(startedAtMs)
        ? Math.max(0, Math.round((input.nowMs - startedAtMs) / 1000))
        : 0;
    return {
      name: 'family_multiplayer_game_completed',
      gameSlug,
      playerCount,
      roundDurationSeconds,
    };
  }
  return null;
}

/** Parse a game's server `created_at` to epoch ms, or `undefined` if unusable. */
export function startedAtMsOf(createdAt: string | undefined): number | undefined {
  if (!createdAt) return undefined;
  const ms = Date.parse(createdAt);
  return Number.isFinite(ms) ? ms : undefined;
}
