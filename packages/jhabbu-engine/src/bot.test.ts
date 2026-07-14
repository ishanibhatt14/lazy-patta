import { cardId, type Card, type Rank, type Suit } from '@lazy-patta/game-contracts';
import { describe, expect, it } from 'vitest';

import { chooseJhabbuBotAction } from './bot';
import { JHABBU_GUJARATI_FAMILY } from './rules';
import type { JhabbuPlayerState, JhabbuState } from './types';

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
});
