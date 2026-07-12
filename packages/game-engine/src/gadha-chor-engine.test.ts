import type { Card, GameState, PlayerId, Rank } from '@lazy-patta/game-contracts';
import { CLASSIC_GULAM_CHOR, seededRng } from '@lazy-patta/test-fixtures';
import { describe, expect, it } from 'vitest';

import { GadhaChorEngine } from './gadha-chor-engine';

const REMOVED: Rank = CLASSIC_GULAM_CHOR.removedRank;

function inPlayCards(state: GameState): Card[] {
  return state.players.flatMap((p) => [...p.hand]);
}

function rankCount(cards: Card[], rank: Rank): number {
  return cards.filter((c) => c.rank === rank).length;
}

/** Invariants that must hold at every state throughout a game. */
function assertStateInvariants(state: GameState): void {
  const cards = inPlayCards(state);

  // No duplicate card ids anywhere.
  const ids = cards.map((c) => c.id);
  expect(new Set(ids).size).toBe(ids.length);

  // The removed rank always has an odd count in play (3 or 1); every other rank
  // always has an even count (0, 2, or 4). Pairs only ever leave together.
  expect(rankCount(cards, REMOVED) % 2).toBe(1);
  const otherRanks = new Set(cards.filter((c) => c.rank !== REMOVED).map((c) => c.rank));
  for (const r of otherRanks) {
    expect(rankCount(cards, r) % 2).toBe(0);
  }
}

/** Drive a full game to completion with all-bot play. */
function playToCompletion(seed: number, players: PlayerId[]) {
  const engine = new GadhaChorEngine();
  let state = engine.init(CLASSIC_GULAM_CHOR, players, seededRng(seed));
  const botRng = seededRng(seed ^ 0x9e3779b9);
  assertStateInvariants(state);

  let versionsSeen = state.stateVersion;
  let guard = 0;
  while (!engine.isComplete(state) && guard < 10_000) {
    guard += 1;
    const actor = state.players[state.currentPlayerIndex]!.id;
    const move = engine.botMove(state, actor, botRng);
    expect(move).not.toBeNull();

    const before = state.stateVersion;
    const { state: next, events } = engine.reduce(state, move!);

    // Exactly one version bump per accepted action.
    expect(next.stateVersion).toBe(before + 1);
    expect(events.every((e) => e.stateVersion === next.stateVersion)).toBe(true);

    versionsSeen = next.stateVersion;
    state = next;
    assertStateInvariants(state);
  }

  expect(guard).toBeLessThan(10_000);
  return { engine, state, moves: versionsSeen };
}

describe('GadhaChorEngine.init', () => {
  it('deals 51 cards (one removed-rank card taken out)', () => {
    const engine = new GadhaChorEngine();
    const state = engine.init(CLASSIC_GULAM_CHOR, ['a', 'b', 'c'], seededRng(1));
    // Before any auto-removal the deal is 51; after initial pair removal it is
    // 51 minus an even number, so parity of removed-rank count is preserved.
    const cards = inPlayCards(state);
    expect(rankCount(cards, REMOVED)).toBe(3);
    expect(cards.length % 2).toBe(1);
  });

  it('rejects a player count outside the rule pack bounds', () => {
    const engine = new GadhaChorEngine();
    expect(() => engine.init(CLASSIC_GULAM_CHOR, ['solo'], seededRng(1))).toThrow();
  });
});

describe('GadhaChorEngine full game', () => {
  it.each([
    [1, ['a', 'b']],
    [2, ['a', 'b', 'c']],
    [3, ['a', 'b', 'c', 'd']],
    [4, ['a', 'b', 'c', 'd', 'e', 'f']],
  ] as const)(
    'completes with exactly one loser holding the odd card (seed %i)',
    (seed, players) => {
      const { engine, state } = playToCompletion(seed, [...players]);

      expect(engine.isComplete(state)).toBe(true);
      const active = state.players.filter((p) => p.status === 'active');
      expect(active).toHaveLength(1);

      const result = engine.result(state);
      expect(result).not.toBeNull();
      expect(result!.loser).toBe(active[0]!.id);
      expect(result!.winners).toEqual(
        state.players.filter((p) => p.status === 'finished').map((p) => p.id),
      );

      // The loser holds every remaining removed-rank card, an odd count >= 1.
      const loserJacks = rankCount([...active[0]!.hand], REMOVED);
      expect(loserJacks % 2).toBe(1);
      expect(loserJacks).toBeGreaterThanOrEqual(1);
      expect(rankCount(inPlayCards(state), REMOVED)).toBe(loserJacks);
    },
  );

  it('is deterministic: same seed + same bot policy yields identical outcomes', () => {
    const a = playToCompletion(123, ['a', 'b', 'c']);
    const b = playToCompletion(123, ['a', 'b', 'c']);
    expect(a.state).toEqual(b.state);
    expect(a.moves).toBe(b.moves);
  });
});

describe('GadhaChorEngine projections (privacy)', () => {
  it('public snapshot never exposes card contents, only counts', () => {
    const engine = new GadhaChorEngine();
    const state = engine.init(CLASSIC_GULAM_CHOR, ['a', 'b'], seededRng(5));
    const pub = engine.projectPublic(state);
    expect(JSON.stringify(pub)).not.toMatch(/"suit"|"rank"/);
    expect(pub.players[0]!.handCount).toBeGreaterThan(0);
  });

  it('private view shows only the viewer hand; opponents are counts only', () => {
    const engine = new GadhaChorEngine();
    const state = engine.init(CLASSIC_GULAM_CHOR, ['a', 'b'], seededRng(5));
    const view = engine.projectPrivate(state, 'a');
    expect(view.hand.length).toBeGreaterThan(0);
    for (const opp of view.opponents) {
      expect(opp).not.toHaveProperty('hand');
    }
  });
});

describe('GadhaChorEngine action validation', () => {
  it('rejects a stale position token (version conflict)', () => {
    const engine = new GadhaChorEngine();
    const state = engine.init(CLASSIC_GULAM_CHOR, ['a', 'b'], seededRng(5));
    const actor = state.players[state.currentPlayerIndex]!.id;
    const move = engine.legalMoves(state, actor)[0]!;
    const stale = { ...move, positionToken: 'pt_00000000' };
    expect(() => engine.reduce(state, stale)).toThrow('INVALID_POSITION_TOKEN');
  });

  it('rejects an action from a player whose turn it is not', () => {
    const engine = new GadhaChorEngine();
    const state = engine.init(CLASSIC_GULAM_CHOR, ['a', 'b'], seededRng(5));
    const notCurrent = state.players.find(
      (p) => p.id !== state.players[state.currentPlayerIndex]!.id,
    )!.id;
    expect(engine.legalMoves(state, notCurrent)).toHaveLength(0);
  });
});
