import { cardId, type Card, type Rank, type Rng, type Suit } from '@lazy-patta/game-contracts';
import { describe, expect, it } from 'vitest';

import { chooseLalSattiBotAction } from './bot';
import { LalSattiEngine } from './engine';
import { createAllSevensTableau, LAL_SATTI_CLASSIC } from './rules';
import type { LalSattiPlayerState, LalSattiState } from './types';

function card(suit: Suit, rank: Rank): Card {
  return { id: cardId(suit, rank), suit, rank };
}

/** RNG that replays a fixed sequence of values, then repeats the last one. */
function sequenceRng(values: readonly number[]): Rng {
  let index = 0;
  return {
    next() {
      const value = values[Math.min(index, values.length - 1)]!;
      index += 1;
      return value;
    },
  };
}

function player(id: string, hand: readonly Card[]): LalSattiPlayerState {
  return { id, hand, status: 'active', isBot: id.startsWith('bot') };
}

function stateWith(players: readonly LalSattiPlayerState[]): LalSattiState {
  return {
    rulePack: LAL_SATTI_CLASSIC,
    players,
    currentPlayerIndex: 0,
    tableau: createAllSevensTableau(),
    phase: 'in_progress',
    stateVersion: 1,
    consecutivePasses: 0,
    winnerIds: [],
    completionReason: null,
  };
}

describe('chooseLalSattiBotAction', () => {
  it('chooses the lowest legal card deterministically by default', () => {
    const state = stateWith([
      player('bot-a', [card('spades', '8'), card('clubs', '6'), card('hearts', '6')]),
      player('you', [card('diamonds', '2')]),
    ]);

    expect(chooseLalSattiBotAction(state, 'bot-a')).toEqual({
      strategy: 'lowest-card',
      action: { type: 'PLAY_CARD', actor: 'bot-a', cardId: 'clubs-6' },
    });
  });

  it('can prefer the highest legal card for an alternate computer personality', () => {
    const state = stateWith([
      player('bot-a', [card('spades', '8'), card('clubs', '6'), card('hearts', '6')]),
      player('you', [card('diamonds', '2')]),
    ]);

    expect(chooseLalSattiBotAction(state, 'bot-a', 'shed-high')).toEqual({
      strategy: 'shed-high',
      action: { type: 'PLAY_CARD', actor: 'bot-a', cardId: 'spades-8' },
    });
  });

  it('passes when the bot has no playable card', () => {
    const state = stateWith([
      player('bot-a', [card('spades', '10')]),
      player('you', [card('diamonds', '6')]),
    ]);

    expect(chooseLalSattiBotAction(state, 'bot-a')).toEqual({
      strategy: 'lowest-card',
      action: { type: 'PASS', actor: 'bot-a' },
    });
  });

  describe('difficulty', () => {
    const mistakeState = stateWith([
      player('bot-a', [card('spades', '8'), card('clubs', '6'), card('hearts', '6')]),
      player('you', [card('diamonds', '2')]),
    ]);

    it('defaults to hard (deterministic best) and never consumes the rng', () => {
      let consumed = false;
      const rng: Rng = {
        next() {
          consumed = true;
          return 0;
        },
      };
      const decision = chooseLalSattiBotAction(mistakeState, 'bot-a', { difficulty: 'hard', rng });
      expect(decision?.action).toEqual({ type: 'PLAY_CARD', actor: 'bot-a', cardId: 'clubs-6' });
      expect(consumed).toBe(false);
    });

    it('plays the best move on easy when the mistake roll misses', () => {
      // First roll 0.9 >= 0.55 mistake rate → no deviation, best card.
      const decision = chooseLalSattiBotAction(mistakeState, 'bot-a', {
        difficulty: 'easy',
        rng: sequenceRng([0.9]),
      });
      expect(decision?.action).toEqual({ type: 'PLAY_CARD', actor: 'bot-a', cardId: 'clubs-6' });
    });

    it('plays a random legal move on easy when the mistake roll hits', () => {
      const legal = new LalSattiEngine().legalActions(mistakeState, 'bot-a');
      // First roll 0.1 < 0.55 → mistake; second roll 0.5 → index floor(0.5 * len).
      const index = Math.min(legal.length - 1, Math.floor(0.5 * legal.length));
      const decision = chooseLalSattiBotAction(mistakeState, 'bot-a', {
        difficulty: 'easy',
        rng: sequenceRng([0.1, 0.5]),
      });
      expect(decision?.action).toEqual(legal[index]);
    });
  });
});
