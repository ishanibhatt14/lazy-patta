import { describe, expect, it } from 'vitest';

import {
  applyVote,
  deriveRematch,
  hostCanForceStart,
  shouldRunCountdown,
  type PlayerRematchState,
} from './rematch-state';

function players(votes: PlayerRematchState['vote'][]): PlayerRematchState[] {
  return votes.map((vote, i) => ({
    playerId: `p${i}`,
    displayName: `Player ${i}`,
    vote,
  }));
}

describe('deriveRematch', () => {
  it('excludes left and declined players from the eligible set', () => {
    const derived = deriveRematch(players(['ready', 'left', 'declined', 'pending']), 2);
    expect(derived.eligibleCount).toBe(2);
    expect(derived.eligible.map((p) => p.vote)).toEqual(['ready', 'pending']);
  });

  it('counts only ready eligible players toward the minimum', () => {
    const derived = deriveRematch(players(['ready', 'ready', 'pending']), 3);
    expect(derived.readyCount).toBe(2);
    expect(derived.minimumPlayersMet).toBe(false);
  });

  it('is everyoneReady only when all eligible are ready and minimum is met', () => {
    expect(deriveRematch(players(['ready', 'ready']), 2).everyoneReady).toBe(true);
    // A pending eligible player blocks everyoneReady.
    expect(deriveRematch(players(['ready', 'ready', 'pending']), 2).everyoneReady).toBe(false);
    // Disconnected still counts as eligible, so it also blocks everyoneReady.
    expect(deriveRematch(players(['ready', 'disconnected']), 2).everyoneReady).toBe(false);
  });

  it('does not treat a lone ready player as everyoneReady below the minimum', () => {
    const derived = deriveRematch(players(['ready', 'left', 'left']), 2);
    expect(derived.everyoneReady).toBe(false);
    expect(derived.minimumPlayersMet).toBe(false);
  });
});

describe('shouldRunCountdown', () => {
  it('runs only when everyone eligible is ready', () => {
    expect(shouldRunCountdown(deriveRematch(players(['ready', 'ready']), 2))).toBe(true);
    expect(shouldRunCountdown(deriveRematch(players(['ready', 'pending']), 2))).toBe(false);
  });

  it('stops when a ready player changes their vote', () => {
    let state = players(['ready', 'ready']);
    expect(shouldRunCountdown(deriveRematch(state, 2))).toBe(true);
    state = [...applyVote(state, 'p1', 'left')];
    expect(shouldRunCountdown(deriveRematch(state, 2))).toBe(false);
  });
});

describe('hostCanForceStart', () => {
  it('is blocked until the waiting period expires', () => {
    const derived = deriveRematch(players(['ready', 'ready', 'pending']), 2);
    expect(hostCanForceStart(derived, false, false)).toBe(false);
    expect(hostCanForceStart(derived, true, false)).toBe(true);
  });

  it('never force-starts while the auto-countdown is active', () => {
    const derived = deriveRematch(players(['ready', 'ready']), 2);
    // everyoneReady -> auto countdown owns the start, not the host button.
    expect(hostCanForceStart(derived, true, true)).toBe(false);
    expect(hostCanForceStart(derived, true, false)).toBe(false);
  });

  it('is blocked when the minimum is not met', () => {
    const derived = deriveRematch(players(['ready', 'pending', 'pending']), 3);
    expect(hostCanForceStart(derived, true, false)).toBe(false);
  });
});

describe('applyVote', () => {
  it('updates only the target player and stamps the time', () => {
    const next = applyVote(players(['pending', 'pending']), 'p0', 'ready', '2026-07-21T00:00:00Z');
    expect(next[0]).toMatchObject({ vote: 'ready', votedAt: '2026-07-21T00:00:00Z' });
    expect(next[1]!.vote).toBe('pending');
  });
});
