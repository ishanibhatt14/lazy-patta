import { cardId, type Card, type Rank, type Rng, type Suit } from '@lazy-patta/game-contracts';
import { describe, expect, it } from 'vitest';

import { chooseJhabbuBotAction } from './bot';
import { JhabbuEngine } from './engine';
import { JHABBU_GUJARATI_FAMILY } from './rules';
import type { JhabbuPlayerState, JhabbuState } from './types';

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

function card(suit: Suit, rank: Rank): Card {
  return { id: cardId(suit, rank), suit, rank };
}

function player(id: string, hand: readonly Card[]): JhabbuPlayerState {
  return {
    id,
    seat: 0,
    hand,
    status: 'active',
    isBot: true,
    finishPosition: null,
    penaltyPoints: 0,
  };
}

function stateWith(players: readonly JhabbuPlayerState[]): JhabbuState {
  return {
    rulePack: JHABBU_GUJARATI_FAMILY,
    players,
    currentPlayerIndex: 0,
    powerPlayerId: players[0]!.id,
    ledSuit: null,
    currentTrick: [],
    wastePile: [],
    finishOrder: [],
    roundNumber: 1,
    phase: 'in_progress',
    stateVersion: 1,
    loserId: null,
    completionReason: null,
  };
}

describe('Jhabbu bot', () => {
  it('leads with a low card from the longest suit', () => {
    const state = stateWith([
      player('bot', [
        card('clubs', 'king'),
        card('hearts', '4'),
        card('hearts', '6'),
        card('hearts', 'queen'),
      ]),
      player('p2', [card('clubs', '2')]),
      player('p3', [card('clubs', '3')]),
    ]);

    expect(chooseJhabbuBotAction(state, 'bot')?.action).toEqual({
      type: 'PLAY_CARD',
      actor: 'bot',
      cardId: 'hearts-4',
    });
  });

  it('draws when an empty power player must use the waste pile', () => {
    const state = stateWith([
      player('bot', []),
      player('p2', [card('clubs', '2')]),
      player('p3', [card('clubs', '3')]),
    ]);
    const withWaste = { ...state, wastePile: [card('spades', 'ace')] };

    expect(chooseJhabbuBotAction(withWaste, 'bot')?.action).toEqual({
      type: 'DRAW_FROM_WASTE',
      actor: 'bot',
    });
  });

  describe('difficulty', () => {
    const mistakeState = stateWith([
      player('bot', [
        card('clubs', 'king'),
        card('hearts', '4'),
        card('hearts', '6'),
        card('hearts', 'queen'),
      ]),
      player('p2', [card('clubs', '2')]),
      player('p3', [card('clubs', '3')]),
    ]);

    it('defaults to hard (deterministic best) and never consumes the rng', () => {
      let consumed = false;
      const rng: Rng = {
        next() {
          consumed = true;
          return 0;
        },
      };
      const decision = chooseJhabbuBotAction(mistakeState, 'bot', { difficulty: 'hard', rng });
      expect(decision?.action).toEqual({ type: 'PLAY_CARD', actor: 'bot', cardId: 'hearts-4' });
      expect(consumed).toBe(false);
    });

    it('plays the best move on easy when the mistake roll misses', () => {
      const decision = chooseJhabbuBotAction(mistakeState, 'bot', {
        difficulty: 'easy',
        rng: sequenceRng([0.9]),
      });
      expect(decision?.action).toEqual({ type: 'PLAY_CARD', actor: 'bot', cardId: 'hearts-4' });
    });

    it('plays a random legal move on easy when the mistake roll hits', () => {
      const legal = new JhabbuEngine().legalActions(mistakeState, 'bot');
      const index = Math.min(legal.length - 1, Math.floor(0.5 * legal.length));
      const decision = chooseJhabbuBotAction(mistakeState, 'bot', {
        difficulty: 'easy',
        rng: sequenceRng([0.1, 0.5]),
      });
      expect(decision?.action).toEqual(legal[index]);
    });
  });
});
