import type { Card, PlayerId, Rng } from '@lazy-patta/game-contracts';
import { seededRng } from '@lazy-patta/test-fixtures';
import { describe, expect, it } from 'vitest';

import { chooseKachufulBotAction } from './bot';
import { KachufulEngine } from './engine';
import { KACHUFUL_FAMILY_DESCENDING } from './rules';
import type { KachufulState } from './types';

/**
 * Fair play: a Kachuful bot bids from its own hand plus the public trump, and
 * plays from its own hand plus the public trick. It must never react to which
 * hidden cards its opponents hold. We replay whole bot-vs-bot matches and, at
 * every bid and every card, scramble the identities of every non-acting hand
 * (keeping each opponent's card count — which is public — and the trump, trick,
 * led suit, and bids untouched), then assert the bot's decision is identical.
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

function scrambleHiddenHands(state: KachufulState, actorIndex: number, rng: Rng): KachufulState {
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

function hiddenHandsChanged(
  before: KachufulState,
  after: KachufulState,
  actorIndex: number,
): boolean {
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

function runFairPlayMatch(playerCount: number, seed: number): FairPlayRun {
  const engine = new KachufulEngine();
  const ids: PlayerId[] = Array.from({ length: playerCount }, (_, index) => `p${index + 1}`);
  let state = engine.init(ids, seededRng(seed), KACHUFUL_FAMILY_DESCENDING, ids.slice());
  const scrambleRng = seededRng(seed * 31 + 7);
  let scrambleObserved = false;

  for (let turn = 0; turn < 5000; turn += 1) {
    if (state.phase === 'match_complete') return { turns: turn, scrambleObserved };

    const actorIndex = state.currentPlayerIndex;
    const actor = state.players[actorIndex]!.id;
    const legal = engine.legalActions(state, actor);
    const real = chooseKachufulBotAction(state, actor);
    expect(real).not.toBeNull();
    // Bot turn correctness: the chosen action is always a legal one.
    expect(legal).toContainEqual(real!.action);

    // Fair play: the same decision under scrambled hidden hands.
    const scrambled = scrambleHiddenHands(state, actorIndex, scrambleRng);
    if (hiddenHandsChanged(state, scrambled, actorIndex)) scrambleObserved = true;
    const shadow = chooseKachufulBotAction(scrambled, actor);
    expect(shadow?.action).toEqual(real!.action);

    state = engine.reduce(state, real!.action).state;
  }

  throw new Error('SIMULATION_DID_NOT_TERMINATE');
}

describe('Kachuful fair play', () => {
  it.each([3, 4, 5])(
    'a %i-player bot match never lets a bid or play depend on hidden hands',
    (playerCount) => {
      const run = runFairPlayMatch(playerCount, 5150 + playerCount);
      expect(run.scrambleObserved).toBe(true);
      expect(run.turns).toBeGreaterThan(0);
    },
  );

  it('holds across many seeds without an illegal or hidden-info-dependent move', () => {
    let scrambleObserved = false;
    for (let seed = 1; seed <= 24; seed += 1) {
      const run = runFairPlayMatch(3, seed);
      scrambleObserved = scrambleObserved || run.scrambleObserved;
    }
    expect(scrambleObserved).toBe(true);
  });
});
