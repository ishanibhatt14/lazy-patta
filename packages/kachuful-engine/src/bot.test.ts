import { cardId, type Card, type Rank, type Suit } from '@lazy-patta/game-contracts';
import { seededRng } from '@lazy-patta/test-fixtures';
import { describe, expect, it } from 'vitest';

import { chooseKachufulBotAction, estimateBid } from './bot';
import { KachufulEngine } from './engine';
import type { KachufulState } from './types';

function card(suit: Suit, rank: Rank): Card {
  return { id: cardId(suit, rank), suit, rank };
}

describe('estimateBid', () => {
  it('values high trumps and off-suit aces/kings', () => {
    const hand = [card('spades', 'ace'), card('spades', 'king'), card('hearts', '2')];
    // Two high spade trumps (1 each) → 2, hearts 2 contributes nothing.
    expect(estimateBid(hand, 'spades', 3)).toBe(2);
  });

  it('never exceeds the hand size and is never negative', () => {
    const hand = [card('spades', 'ace'), card('spades', 'king'), card('spades', 'queen')];
    expect(estimateBid(hand, 'spades', 1)).toBe(1);
    expect(estimateBid([card('clubs', '2')], 'spades', 1)).toBe(0);
  });
});

describe('chooseKachufulBotAction', () => {
  it('always returns a legal action during bidding and play', () => {
    const engine = new KachufulEngine();
    let state: KachufulState = engine.init(['you', 'bot-1', 'bot-2'], seededRng(5), undefined, [
      'you',
      'bot-1',
      'bot-2',
    ]);
    for (let step = 0; step < 30 && state.phase !== 'match_complete'; step += 1) {
      const actor = state.players[state.currentPlayerIndex]!.id;
      const decision = chooseKachufulBotAction(state, actor, { difficulty: 'hard' });
      expect(decision).not.toBeNull();
      const legal = engine.legalActions(state, actor);
      expect(legal).toContainEqual(decision!.action);
      state = engine.reduce(state, decision!.action).state;
    }
  });

  it('throws when asked to act out of turn', () => {
    const engine = new KachufulEngine();
    const state = engine.init(['you', 'bot-1', 'bot-2'], seededRng(5));
    const notCurrent = state.players[(state.currentPlayerIndex + 1) % 3]!.id;
    expect(() => chooseKachufulBotAction(state, notCurrent)).toThrow('NOT_ACTORS_TURN');
  });

  it('injects mistakes on easy difficulty without producing illegal moves', () => {
    const engine = new KachufulEngine();
    let state = engine.init(['you', 'bot-1', 'bot-2'], seededRng(6), undefined, [
      'you',
      'bot-1',
      'bot-2',
    ]);
    const rng = seededRng(42);
    for (let step = 0; step < 20 && state.phase !== 'match_complete'; step += 1) {
      const actor = state.players[state.currentPlayerIndex]!.id;
      const decision = chooseKachufulBotAction(state, actor, { difficulty: 'easy', rng });
      const legal = engine.legalActions(state, actor);
      expect(legal).toContainEqual(decision!.action);
      state = engine.reduce(state, decision!.action).state;
    }
  });
});
