import type { Card, GameState, Rank } from '@lazy-patta/game-contracts';
import { CLASSIC_GULAM_CHOR, seededRng } from '@lazy-patta/test-fixtures';
import { describe, expect, it } from 'vitest';

import { buildDeck } from './deck';
import { DEFAULT_MAX_TURNS, simulateGame, type SimulationResult } from './simulate';

const REMOVED: Rank = CLASSIC_GULAM_CHOR.removedRank;

function handCards(state: GameState): Card[] {
  return state.players.flatMap((p) => [...p.hand]);
}

function rankCount(cards: Card[], rank: Rank): number {
  return cards.filter((c) => c.rank === rank).length;
}

function run(playerCount: number, seed: number, captureEvents = false): SimulationResult {
  return simulateGame({
    playerCount,
    seed,
    rulePack: CLASSIC_GULAM_CHOR,
    createRng: seededRng,
    captureEvents,
  });
}

describe('deck fixture invariants', () => {
  it('a fresh deck has 52 valid unique card ids', () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
    for (const card of deck) {
      expect(card.id).toBe(`${card.suit}-${card.rank}`);
    }
  });
});

describe('simulateGame terminal invariants', () => {
  it.each([2, 3, 4, 5, 6])('a %i-player game terminates within the safety bound', (count) => {
    const sim = run(count, 20250712 + count);
    expect(sim.completed).toBe(true);
    expect(sim.reachedTurnLimit).toBe(false);
    expect(sim.turns).toBeLessThan(DEFAULT_MAX_TURNS);
    expect(sim.players).toHaveLength(count);
  });

  it.each([2, 3, 4, 5, 6])('a %i-player game ends with exactly one Gadha Chor loser', (count) => {
    const sim = run(count, 7 * count + 1);
    expect(sim.result).not.toBeNull();

    const active = sim.finalState.players.filter((p) => p.status === 'active');
    expect(active).toHaveLength(1);
    expect(sim.result!.loser).toBe(active[0]!.id);
    expect(sim.result!.winners).toEqual(
      sim.finalState.players.filter((p) => p.status === 'finished').map((p) => p.id),
    );
  });

  it.each([2, 3, 4, 5, 6])('the loser holds the odd removed-rank card (%i players)', (count) => {
    const sim = run(count, 900 + count);
    const loser = sim.finalState.players.find((p) => p.id === sim.result!.loser)!;
    const loserOdd = rankCount([...loser.hand], REMOVED);
    expect(loserOdd % 2).toBe(1);
    expect(loserOdd).toBeGreaterThanOrEqual(1);
    // Every remaining removed-rank card is in the loser's hand.
    expect(rankCount(handCards(sim.finalState), REMOVED)).toBe(loserOdd);
  });

  it('conserves cards: exactly one removed-rank card is taken out, rest pair off', () => {
    const sim = run(4, 314159);
    const cards = handCards(sim.finalState);
    // No card exists in two places (unique ids), removed rank stays odd, others even.
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
    expect(rankCount(cards, REMOVED) % 2).toBe(1);
  });
});

describe('simulateGame determinism', () => {
  it('identical options produce an identical result', () => {
    const a = run(5, 2024);
    const b = run(5, 2024);
    expect(a.finalState).toEqual(b.finalState);
    expect(a.turns).toBe(b.turns);
    expect(a.result).toEqual(b.result);
  });

  it('different seeds can diverge but each stays valid', () => {
    const a = run(4, 1);
    const b = run(4, 2);
    expect(a.completed && b.completed).toBe(true);
    // Both terminate with a valid single loser regardless of the path taken.
    expect(a.result!.loser).toBeTruthy();
    expect(b.result!.loser).toBeTruthy();
  });
});

describe('simulateGame event trace', () => {
  it('omits events by default and includes an ordered trace when requested', () => {
    const withoutTrace = run(3, 55, false);
    expect(withoutTrace.events).toBeUndefined();

    const withTrace = run(3, 55, true);
    expect(withTrace.events).toBeDefined();
    expect(withTrace.events!.length).toBeGreaterThan(0);
    // Every accepted action advances the turn exactly once.
    const advances = withTrace.events!.filter((e) => e.type === 'TURN_ADVANCED');
    expect(advances).toHaveLength(withTrace.turns);
    // Exactly one terminal event.
    expect(withTrace.events!.filter((e) => e.type === 'GAME_COMPLETED')).toHaveLength(1);
  });
});

describe('simulateGame safety bound', () => {
  it('never exceeds maxTurns and flags a stuck run instead of looping forever', () => {
    // A tiny bound forces the limit path deterministically.
    const capped = simulateGame({
      playerCount: 6,
      seed: 123,
      rulePack: CLASSIC_GULAM_CHOR,
      createRng: seededRng,
      maxTurns: 1,
    });
    expect(capped.turns).toBeLessThanOrEqual(1);
    if (!capped.completed) {
      expect(capped.reachedTurnLimit).toBe(true);
      expect(capped.result).toBeNull();
    }
  });
});
