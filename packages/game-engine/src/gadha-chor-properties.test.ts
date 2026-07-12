import type { Card, GameState, PlayerId, Rank, RulePack } from '@lazy-patta/game-contracts';
import { GULAM_CHOR_VARIANTS, seededRng } from '@lazy-patta/test-fixtures';
import { describe, expect, it } from 'vitest';

import { chooseBotAction } from './bot';
import { GadhaChorEngine } from './gadha-chor-engine';
import { simulateGame } from './simulate';

/**
 * Lightweight, dependency-free property testing: we enumerate a reproducible
 * matrix of configurations and drive each one. fast-check was considered but
 * deliberately skipped to avoid churning the shared lockfile in this
 * parallel-agent setup — the seeded RNG already gives reproducible, shrinkable
 * cases, and every failure reports its exact config via the assertion label.
 */
const PLAYER_COUNTS = [2, 3, 4, 5, 6] as const;
const SEEDS = Array.from({ length: 12 }, (_, i) => 1000 + i * 7919);

interface Config {
  readonly rulePack: RulePack;
  readonly playerCount: number;
  readonly seed: number;
}

function matrix(): Config[] {
  const configs: Config[] = [];
  for (const rulePack of GULAM_CHOR_VARIANTS) {
    for (const playerCount of PLAYER_COUNTS) {
      for (const seed of SEEDS) {
        configs.push({ rulePack, playerCount, seed });
      }
    }
  }
  return configs;
}

function label(c: Config): string {
  return `rulePack=${c.rulePack.id} players=${c.playerCount} seed=${c.seed}`;
}

function players(count: number): PlayerId[] {
  return Array.from({ length: count }, (_, i) => `p${i + 1}`);
}

function inPlay(state: GameState): Card[] {
  return state.players.flatMap((p) => [...p.hand]);
}

function rankCount(cards: Card[], rank: Rank): number {
  return cards.filter((c) => c.rank === rank).length;
}

/** Assert the conservation/uniqueness invariants hold for `state`. */
function assertStateInvariants(state: GameState, removed: Rank, msg: string): void {
  const cards = inPlay(state);
  const ids = cards.map((c) => c.id);
  // No card is in two locations at once (globally unique ids).
  expect(new Set(ids).size, `${msg}: duplicate card id`).toBe(ids.length);
  // The removed rank stays odd; every other rank stays even (pairs leave together).
  expect(rankCount(cards, removed) % 2, `${msg}: removed-rank parity`).toBe(1);
  const others = new Set(cards.filter((c) => c.rank !== removed).map((c) => c.rank));
  for (const r of others) {
    expect(rankCount(cards, r) % 2, `${msg}: rank ${r} parity`).toBe(0);
  }
}

describe('Gadha Chor property matrix', () => {
  const configs = matrix();

  it('every configuration terminates with exactly one valid loser', () => {
    for (const c of configs) {
      const msg = label(c);
      const engine = new GadhaChorEngine();
      let state = engine.init(c.rulePack, players(c.playerCount), seededRng(c.seed));
      const botRng = seededRng((c.seed ^ 0x9e3779b9) >>> 0);
      const removed = c.rulePack.removedRank;

      assertStateInvariants(state, removed, msg);

      let guard = 0;
      while (!engine.isComplete(state) && guard < 10_000) {
        guard += 1;
        const actorId = state.players[state.currentPlayerIndex]!.id;

        // A bot only ever acts on its own turn.
        expect(state.players[state.currentPlayerIndex]!.status, `${msg}: actor active`).toBe(
          'active',
        );

        const validActions = engine.legalMoves(state, actorId);
        // A bot never selects an unavailable opponent position.
        for (const a of validActions) {
          expect(a.actor, `${msg}: action actor`).toBe(actorId);
          const target = state.players.find((p) => p.id === a.from)!;
          expect(target.status, `${msg}: target active`).toBe('active');
          expect(target.id, `${msg}: target not self`).not.toBe(actorId);
        }

        const { action } = chooseBotAction({
          gameState: state,
          actorId,
          validActions,
          rng: botRng,
        });
        const before = state.stateVersion;
        const { state: next } = engine.reduce(state, action);
        // Each accepted action advances state exactly once.
        expect(next.stateVersion, `${msg}: single version bump`).toBe(before + 1);
        state = next;
        assertStateInvariants(state, removed, msg);
      }

      expect(guard, `${msg}: exceeded safety bound`).toBeLessThan(10_000);
      expect(engine.isComplete(state), `${msg}: not complete`).toBe(true);

      const active = state.players.filter((p) => p.status === 'active');
      expect(active.length, `${msg}: not exactly one loser`).toBe(1);

      const result = engine.result(state);
      expect(result, `${msg}: null result`).not.toBeNull();
      expect(result!.loser, `${msg}: loser mismatch`).toBe(active[0]!.id);

      const loserOdd = rankCount([...active[0]!.hand], removed);
      expect(loserOdd % 2, `${msg}: loser odd parity`).toBe(1);
      expect(rankCount(inPlay(state), removed), `${msg}: all odd cards with loser`).toBe(loserOdd);
    }
  });

  it('simulateGame is deterministic across the whole matrix', () => {
    for (const c of configs) {
      const opts = {
        playerCount: c.playerCount,
        seed: c.seed,
        rulePack: c.rulePack,
        createRng: seededRng,
      };
      const a = simulateGame(opts);
      const b = simulateGame(opts);
      expect(a.finalState, `${label(c)}: nondeterministic finalState`).toEqual(b.finalState);
      expect(a.turns, `${label(c)}: nondeterministic turns`).toBe(b.turns);
      expect(a.completed, `${label(c)}: did not complete`).toBe(true);
    }
  });
});
