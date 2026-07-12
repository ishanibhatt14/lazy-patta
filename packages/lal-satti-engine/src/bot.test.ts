import { cardId, type Card, type Rank, type Suit } from '@lazy-patta/game-contracts';
import { describe, expect, it } from 'vitest';

import { chooseLalSattiBotAction } from './bot';
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
});
