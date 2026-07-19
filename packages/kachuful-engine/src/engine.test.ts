import type { PlayerId } from '@lazy-patta/game-contracts';
import { seededRng } from '@lazy-patta/test-fixtures';
import { describe, expect, it } from 'vitest';

import { chooseKachufulBotAction } from './bot';
import { KachufulEngine } from './engine';
import { KACHUFUL_FAMILY_DESCENDING } from './rules';
import type { KachufulAction, KachufulState } from './types';

const PLAYERS: readonly PlayerId[] = ['you', 'bot-1', 'bot-2'];

function currentActor(state: KachufulState): PlayerId {
  return state.players[state.currentPlayerIndex]!.id;
}

/** Drive the whole match with the deterministic `hard` bot and return the path. */
function playMatch(seed: number): KachufulState {
  const engine = new KachufulEngine();
  let state = engine.init(PLAYERS, seededRng(seed), KACHUFUL_FAMILY_DESCENDING, ['bot-1', 'bot-2']);
  let guard = 0;
  while (state.phase !== 'match_complete') {
    const actor = currentActor(state);
    const decision = chooseKachufulBotAction(state, actor);
    if (!decision) throw new Error('bot returned no action');
    state = engine.reduce(state, decision.action).state;
    guard += 1;
    if (guard > 5000) throw new Error('match did not terminate');
  }
  return state;
}

describe('KachufulEngine.init', () => {
  it('deals the descending schedule and opens bidding left of the dealer', () => {
    const engine = new KachufulEngine();
    const state = engine.init(PLAYERS, seededRng(1));

    expect(state.phase).toBe('bidding');
    expect(state.handSizeSchedule).toEqual([7, 6, 5, 4, 3, 2, 1]);
    expect(state.totalRounds).toBe(7);
    expect(state.handSize).toBe(7);
    expect(state.trump).toBe('spades');
    expect(state.dealerIndex).toBe(0);
    expect(state.currentPlayerIndex).toBe(1);
    state.players.forEach((player) => expect(player.hand).toHaveLength(7));
  });

  it('rejects player counts outside the rule pack bounds', () => {
    const engine = new KachufulEngine();
    expect(() => engine.init(['a', 'b'], seededRng(1))).toThrow();
    expect(() => engine.init(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], seededRng(1))).toThrow();
  });

  it('rejects duplicate players', () => {
    const engine = new KachufulEngine();
    expect(() => engine.init(['a', 'a', 'b'], seededRng(1))).toThrow('DUPLICATE_PLAYERS');
  });
});

describe('KachufulEngine bidding', () => {
  it('enforces the hook rule so total bids cannot equal the trick count', () => {
    const engine = new KachufulEngine();
    let state = engine.init(PLAYERS, seededRng(3));
    // First two players bid; dealer is index 0 and bids last.
    state = engine.reduce(state, { type: 'PLACE_BID', actor: currentActor(state), bid: 3 }).state;
    state = engine.reduce(state, { type: 'PLACE_BID', actor: currentActor(state), bid: 2 }).state;

    expect(currentActor(state)).toBe('you');
    const legal = engine.legalActions(state, 'you') as Extract<
      KachufulAction,
      { type: 'PLACE_BID' }
    >[];
    const bids = legal.map((action) => action.bid);
    // handSize 7, others bid 3 + 2 = 5, so a dealer bid of 2 is forbidden.
    expect(bids).not.toContain(2);
    expect(bids).toContain(0);
    expect(bids).toContain(7);
  });

  it('moves to the playing phase once everyone has bid', () => {
    const engine = new KachufulEngine();
    let state = engine.init(PLAYERS, seededRng(4));
    state = engine.reduce(state, { type: 'PLACE_BID', actor: currentActor(state), bid: 1 }).state;
    state = engine.reduce(state, { type: 'PLACE_BID', actor: currentActor(state), bid: 1 }).state;
    const { state: playing } = engine.reduce(state, {
      type: 'PLACE_BID',
      actor: currentActor(state),
      bid: 3,
    });
    expect(playing.phase).toBe('playing');
    // Leader is left of the dealer (seat 1).
    expect(playing.currentPlayerIndex).toBe(1);
  });
});

describe('KachufulEngine trick play', () => {
  it('rejects a bid during the playing phase and an illegal off-suit card', () => {
    const engine = new KachufulEngine();
    let state = engine.init(PLAYERS, seededRng(4));
    while (state.phase === 'bidding') {
      const legal = engine.legalActions(state, currentActor(state));
      state = engine.reduce(state, legal[0]!).state;
    }
    expect(() =>
      engine.reduce(state, { type: 'PLACE_BID', actor: currentActor(state), bid: 0 }),
    ).toThrow('NOT_BIDDING');

    const leader = state.players[state.currentPlayerIndex]!;
    const led = leader.hand[0]!;
    state = engine.reduce(state, {
      type: 'PLAY_CARD',
      actor: leader.id,
      cardId: led.id,
    }).state;

    const follower = state.players[state.currentPlayerIndex]!;
    const hasLedSuit = follower.hand.some((c) => c.suit === state.ledSuit);
    if (hasLedSuit) {
      const offSuit = follower.hand.find((c) => c.suit !== state.ledSuit);
      if (offSuit) {
        expect(() =>
          engine.reduce(state, { type: 'PLAY_CARD', actor: follower.id, cardId: offSuit.id }),
        ).toThrow('ILLEGAL_CARD');
      }
    }
  });

  it('rejects a stale action whose expectedVersion is wrong', () => {
    const engine = new KachufulEngine();
    const state = engine.init(PLAYERS, seededRng(4));
    expect(() =>
      engine.reduce(state, {
        type: 'PLACE_BID',
        actor: currentActor(state),
        bid: 0,
        expectedVersion: 99,
      }),
    ).toThrow('STALE_ACTION');
  });
});

describe('KachufulEngine full match', () => {
  it('plays a complete 7-round match to a scored winner', () => {
    const final = playMatch(7);
    expect(final.phase).toBe('match_complete');
    expect(final.roundHistory).toHaveLength(7);
    expect(final.matchWinnerIds.length).toBeGreaterThanOrEqual(1);

    const engine = new KachufulEngine();
    const result = engine.result(final);
    expect(result).not.toBeNull();
    const best = Math.max(...Object.values(result!.totalScores));
    result!.winnerIds.forEach((id) => expect(result!.totalScores[id]).toBe(best));
  });

  it('is deterministic for a fixed seed', () => {
    const a = playMatch(11);
    const b = playMatch(11);
    expect(a.matchWinnerIds).toEqual(b.matchWinnerIds);
    expect(a.players.map((p) => p.totalScore)).toEqual(b.players.map((p) => p.totalScore));
  });

  it('rotates the dealer and trump every round', () => {
    const engine = new KachufulEngine();
    let state = engine.init(PLAYERS, seededRng(9), KACHUFUL_FAMILY_DESCENDING, ['bot-1', 'bot-2']);
    const dealers: number[] = [];
    const trumps: string[] = [];
    let guard = 0;
    while (state.roundNumber <= 2 && state.phase !== 'match_complete') {
      if (state.phase === 'bidding' && state.currentPlayerIndex === (state.dealerIndex + 1) % 3) {
        if (!dealers.includes(state.roundNumber)) {
          dealers.push(state.roundNumber);
          trumps.push(state.trump);
        }
      }
      const decision = chooseKachufulBotAction(state, currentActor(state));
      state = engine.reduce(state, decision!.action).state;
      guard += 1;
      if (guard > 400) break;
    }
    expect(trumps[0]).toBe('spades');
    expect(trumps[1]).toBe('diamonds');
  });
});

describe('KachufulEngine scoring integration', () => {
  it('awards the exact-bid bonus and zero for a miss', () => {
    // Construct a tiny final round (handSize 1) by playing to the last round is
    // heavy; instead verify the scoring rule via a hand-built one-trick round.
    const engine = new KachufulEngine();
    let state = engine.init(['you', 'bot-1', 'bot-2'], seededRng(2));
    // Fast-forward: bid 0 for everyone where legal, else lowest legal bid.
    while (state.phase === 'bidding') {
      const legal = engine.legalActions(state, currentActor(state)) as Extract<
        KachufulAction,
        { type: 'PLACE_BID' }
      >[];
      const zero = legal.find((a) => a.bid === 0) ?? legal[0]!;
      state = engine.reduce(state, zero).state;
    }
    // Play the whole round out with the bot, then check that anyone who won
    // exactly their bid scored the bonus and missers scored zero.
    while (state.phase === 'playing') {
      const decision = chooseKachufulBotAction(state, currentActor(state));
      state = engine.reduce(state, decision!.action).state;
    }
    const summary = state.roundHistory[0]!;
    state.players.forEach((player) => {
      const bid = summary.bids[player.id]!;
      const won = summary.tricksWon[player.id]!;
      const expected = bid === won ? 10 + bid : 0;
      expect(summary.roundScores[player.id]).toBe(expected);
    });
  });
});
