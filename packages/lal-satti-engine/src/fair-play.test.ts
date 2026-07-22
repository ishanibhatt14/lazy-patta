import type { Card, PlayerId, Rng } from '@lazy-patta/game-contracts';
import { seededRng } from '@lazy-patta/test-fixtures';
import { describe, expect, it } from 'vitest';

import { chooseLalSattiBotAction } from './bot';
import { LalSattiEngine } from './engine';
import { LalSattiInvariantError, type LalSattiState } from './types';

/**
 * Fair play: a bot's move must be a pure function of the public table plus its
 * own hand. It must never depend on which hidden cards its opponents hold. We
 * prove that by replaying real bot-vs-bot games and, at every turn, scrambling
 * the *identities* of every non-acting hand (keeping each opponent's card
 * count — which is public — and all shared table state untouched). If the bot
 * peeked at a hidden hand, some scramble would change its decision.
 */

function shuffleInPlace<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    const swap = items[i]!;
    items[i] = items[j]!;
    items[j] = swap;
  }
  return items;
}

/** Redeal every non-acting hand from the pooled opponent cards, preserving each
 * opponent's hand size. No card is invented and none collides with the actor's
 * hand or the tableau, so every engine invariant still holds. */
function scrambleHiddenHands(state: LalSattiState, actorIndex: number, rng: Rng): LalSattiState {
  const pool = shuffleInPlace(
    state.players.flatMap((entry, index) => (index === actorIndex ? [] : [...entry.hand])),
    rng,
  );
  let cursor = 0;
  const players = state.players.map((entry, index) => {
    if (index === actorIndex) return entry;
    const next = pool.slice(cursor, cursor + entry.hand.length);
    cursor += entry.hand.length;
    return { ...entry, hand: next };
  });
  return { ...state, players };
}

function hiddenHandsChanged(before: LalSattiState, after: LalSattiState, actorIndex: number): boolean {
  return before.players.some((entry, index) => {
    if (index === actorIndex) return false;
    const ids = entry.hand.map((card) => card.id).join(',');
    const otherIds = after.players[index]!.hand.map((card: Card) => card.id).join(',');
    return ids !== otherIds;
  });
}

interface FairPlayRun {
  readonly turns: number;
  readonly scrambleObserved: boolean;
}

function runFairPlayGame(playerCount: number, seed: number): FairPlayRun {
  const engine = new LalSattiEngine();
  const ids: PlayerId[] = Array.from({ length: playerCount }, (_, index) => `p${index + 1}`);
  let state = engine.init(ids, seededRng(seed));
  const scrambleRng = seededRng(seed * 31 + 7);
  let scrambleObserved = false;

  for (let turn = 0; turn < 500; turn += 1) {
    if (state.phase === 'completed') return { turns: turn, scrambleObserved };

    const actorIndex = state.currentPlayerIndex;
    const actor = state.players[actorIndex]!.id;
    const legal = engine.legalActions(state, actor);
    const real = chooseLalSattiBotAction(state, actor);
    expect(real).not.toBeNull();
    // Bot turn correctness: the chosen action is always a legal one.
    expect(legal).toContainEqual(real!.action);

    // Fair play: the same decision under scrambled hidden hands.
    const scrambled = scrambleHiddenHands(state, actorIndex, scrambleRng);
    if (hiddenHandsChanged(state, scrambled, actorIndex)) scrambleObserved = true;
    const shadow = chooseLalSattiBotAction(scrambled, actor);
    expect(shadow?.action).toEqual(real!.action);

    try {
      state = engine.reduce(state, real!.action).state;
    } catch (error) {
      // A fully blocked pass cycle is a legitimate terminal, not a bot fault.
      if (error instanceof LalSattiInvariantError) return { turns: turn, scrambleObserved };
      throw error;
    }
  }

  throw new Error('SIMULATION_DID_NOT_TERMINATE');
}

describe('Lal Satti fair play', () => {
  it.each([3, 4, 5, 6])(
    'a %i-player bot game never lets a decision depend on hidden hands',
    (playerCount) => {
      const run = runFairPlayGame(playerCount, 4242 + playerCount);
      // The test is only meaningful if the scramble actually reshuffled hands.
      expect(run.scrambleObserved).toBe(true);
      expect(run.turns).toBeGreaterThan(0);
    },
  );

  it('holds across many seeds without an illegal or hidden-info-dependent move', () => {
    let scrambleObserved = false;
    for (let seed = 1; seed <= 40; seed += 1) {
      const run = runFairPlayGame(4, seed);
      scrambleObserved = scrambleObserved || run.scrambleObserved;
    }
    expect(scrambleObserved).toBe(true);
  });
});
