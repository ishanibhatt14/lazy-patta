import { cardId, type Card, type PlayerId, type Suit } from '@lazy-patta/game-contracts';

import type { JhabbuAction, JhabbuRulePack, JhabbuState } from './types';

export const JHABBU_GUJARATI_FAMILY: JhabbuRulePack = {
  id: 'gujarati-family-v1',
  minPlayers: 3,
  maxPlayers: 6,
  aceOfSpadesStarts: true,
  firstTrickAlwaysDiscarded: true,
  thullaEndsTrickImmediately: true,
  pickupRule: 'highest-led-suit',
  powerPlayerMustDrawIfEmpty: true,
  allowTakeLeftPlayersHand: false,
  twoPlayerShootout: true,
  scoring: 'finish-order-0-1-2-3',
  matchEnd: { type: 'penalty-limit', value: 6 },
};

export const JHABBU_CLASSIC_BHABHO: JhabbuRulePack = {
  ...JHABBU_GUJARATI_FAMILY,
  id: 'classic-bhabho-v1',
};

export function activePlayers(state: JhabbuState) {
  return state.players.filter((player) => player.status === 'active');
}

export function playerHasSuit(hand: readonly Card[], suit: Suit): boolean {
  return hand.some((card) => card.suit === suit);
}

export function isOpeningCard(card: Card): boolean {
  return card.id === cardId('spades', 'ace');
}

export function legalPlayableCards(state: JhabbuState, actor: PlayerId): readonly Card[] {
  if (state.phase === 'round_complete') return [];
  const current = state.players[state.currentPlayerIndex];
  if (!current || current.id !== actor || current.status !== 'active') return [];

  if (current.hand.length === 0) return [];
  if (state.phase === 'first_trick' && state.currentTrick.length === 0) {
    return current.hand.filter(isOpeningCard);
  }

  if (!state.ledSuit) return current.hand;
  if (!playerHasSuit(current.hand, state.ledSuit)) return current.hand;
  return current.hand.filter((card) => card.suit === state.ledSuit);
}

export function mustDrawFromWaste(state: JhabbuState, actor: PlayerId): boolean {
  const current = state.players[state.currentPlayerIndex];
  return Boolean(
    current &&
    current.id === actor &&
    current.status === 'active' &&
    current.id === state.powerPlayerId &&
    current.hand.length === 0 &&
    state.wastePile.length > 0 &&
    state.rulePack.powerPlayerMustDrawIfEmpty,
  );
}

export function legalActions(state: JhabbuState, actor: PlayerId): readonly JhabbuAction[] {
  if (mustDrawFromWaste(state, actor)) return [{ type: 'DRAW_FROM_WASTE', actor }];
  return legalPlayableCards(state, actor).map((card) => ({
    type: 'PLAY_CARD' as const,
    actor,
    cardId: card.id,
  }));
}
