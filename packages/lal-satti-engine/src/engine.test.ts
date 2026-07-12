import { cardId, type Card, type Rank, type Suit } from '@lazy-patta/game-contracts';
import { seededRng } from '@lazy-patta/test-fixtures';
import { describe, expect, it } from 'vitest';

import { LalSattiEngine } from './engine';
import { createOpeningTableau, LAL_SATTI_CLASSIC } from './rules';
import type { LalSattiPlayerState, LalSattiState } from './types';

function card(suit: Suit, rank: Rank): Card {
  return { id: cardId(suit, rank), suit, rank };
}

function player(id: string, hand: readonly Card[]): LalSattiPlayerState {
  return { id, hand, status: 'active', isBot: id.startsWith('bot') };
}

function stateWith(players: readonly LalSattiPlayerState[]): LalSattiState {
  return {
    rulePack: LAL_SATTI_CLASSIC,
    players,
    currentPlayerIndex: 0,
    tableau: createOpeningTableau(),
    phase: 'in_progress',
    stateVersion: 0,
    consecutivePasses: 0,
    winnerIds: [],
    completionReason: null,
  };
}

describe('LalSattiEngine', () => {
  it('deals all non-seven cards and opens every seven on the tableau', () => {
    const engine = new LalSattiEngine();
    const state = engine.init(['you', 'bot-a', 'bot-b', 'bot-c'], seededRng(7));

    const tableauCards = Object.values(state.tableau).flat();
    const handCards = state.players.flatMap((entry) => entry.hand);

    expect(tableauCards).toHaveLength(4);
    expect(tableauCards.map((entry) => entry.id).sort()).toEqual([
      'clubs-7',
      'diamonds-7',
      'hearts-7',
      'spades-7',
    ]);
    expect(handCards).toHaveLength(48);
    expect(handCards.some((entry) => entry.rank === '7')).toBe(false);
    expect(new Set([...tableauCards, ...handCards].map((entry) => entry.id))).toHaveLength(52);
  });

  it('offers only adjacent cards around each seven', () => {
    const engine = new LalSattiEngine();
    const state = stateWith([
      player('you', [card('hearts', '5'), card('hearts', '6'), card('spades', '8')]),
      player('bot-a', [card('clubs', '2')]),
    ]);

    expect(engine.legalActions(state, 'you')).toEqual([
      { type: 'PLAY_CARD', actor: 'you', cardId: 'hearts-6' },
      { type: 'PLAY_CARD', actor: 'you', cardId: 'spades-8' },
    ]);
  });

  it('rejects non-adjacent plays', () => {
    const engine = new LalSattiEngine();
    const state = stateWith([
      player('you', [card('hearts', '5')]),
      player('bot-a', [card('clubs', '2')]),
    ]);

    expect(() =>
      engine.reduce(state, { type: 'PLAY_CARD', actor: 'you', cardId: 'hearts-5' }),
    ).toThrow('ILLEGAL_CARD');
  });

  it('allows passing only when the current player is blocked', () => {
    const engine = new LalSattiEngine();
    const blocked = stateWith([
      player('you', [card('hearts', '5')]),
      player('bot-a', [card('clubs', '6')]),
    ]);
    const playable = stateWith([
      player('you', [card('hearts', '6')]),
      player('bot-a', [card('clubs', '6')]),
    ]);

    expect(engine.legalActions(blocked, 'you')).toEqual([{ type: 'PASS', actor: 'you' }]);
    expect(() => engine.reduce(playable, { type: 'PASS', actor: 'you' })).toThrow(
      'PASS_NOT_ALLOWED',
    );
  });

  it('completes when a player empties their hand', () => {
    const engine = new LalSattiEngine();
    const state = stateWith([
      player('you', [card('hearts', '6')]),
      player('bot-a', [card('clubs', '6')]),
    ]);

    const next = engine.reduce(state, { type: 'PLAY_CARD', actor: 'you', cardId: 'hearts-6' });

    expect(next.state.phase).toBe('completed');
    expect(next.state.winnerIds).toEqual(['you']);
    expect(engine.result(next.state)).toEqual({
      winnerIds: ['you'],
      reason: 'hand_empty',
      remainingCards: { you: 0, 'bot-a': 1 },
    });
  });

  it('advances turns after a legal play', () => {
    const engine = new LalSattiEngine();
    const state = stateWith([
      player('you', [card('hearts', '6'), card('diamonds', '5')]),
      player('bot-a', [card('clubs', '6')]),
    ]);

    const next = engine.reduce(state, { type: 'PLAY_CARD', actor: 'you', cardId: 'hearts-6' });

    expect(next.state.currentPlayerIndex).toBe(1);
    expect(next.state.tableau.hearts.map((entry) => entry.id)).toEqual(['hearts-6', 'hearts-7']);
    expect(next.events.map((event) => event.type)).toEqual(['CARD_PLAYED', 'TURN_ADVANCED']);
  });
});
