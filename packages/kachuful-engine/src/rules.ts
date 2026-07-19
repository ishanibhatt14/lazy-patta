import type { Card, PlayerId, Suit } from '@lazy-patta/game-contracts';

import type { KachufulAction, KachufulRulePack, KachufulState } from './types';

export const KACHUFUL_FAMILY_DESCENDING: KachufulRulePack = {
  id: 'family-descending-v1',
  minPlayers: 3,
  maxPlayers: 7,
  maxHandSize: 7,
  trumpRotation: ['spades', 'diamonds', 'clubs', 'hearts', 'no-trump'],
  hookRule: true,
  exactBidBonus: 10,
  perTrickBonus: 1,
};

/**
 * Hand sizes for a match: count down from `maxHandSize` to 1, but never deal
 * more cards than the 52-card deck can supply for `playerCount` players.
 */
export function buildHandSizeSchedule(rulePack: KachufulRulePack, playerCount: number): number[] {
  const fits = Math.floor(52 / playerCount);
  const start = Math.max(1, Math.min(rulePack.maxHandSize, fits));
  const schedule: number[] = [];
  for (let size = start; size >= 1; size -= 1) schedule.push(size);
  return schedule;
}

function currentPlayer(state: KachufulState) {
  return state.players[state.currentPlayerIndex] ?? null;
}

function playerHasSuit(hand: readonly Card[], suit: Suit): boolean {
  return hand.some((card) => card.suit === suit);
}

export function legalPlayableCards(state: KachufulState, actor: PlayerId): readonly Card[] {
  if (state.phase !== 'playing') return [];
  const current = currentPlayer(state);
  if (!current || current.id !== actor) return [];
  if (state.ledSuit === null) return current.hand;
  if (!playerHasSuit(current.hand, state.ledSuit)) return current.hand;
  return current.hand.filter((card) => card.suit === state.ledSuit);
}

function sumOtherBids(state: KachufulState, actor: PlayerId): number {
  return state.players.reduce(
    (total, player) => (player.id === actor || player.bid === null ? total : total + player.bid),
    0,
  );
}

/** Whether `actor` is the last player still to bid this round (the dealer). */
export function isFinalBidder(state: KachufulState, actor: PlayerId): boolean {
  const yetToBid = state.players.filter((player) => player.bid === null);
  return yetToBid.length === 1 && yetToBid[0]!.id === actor;
}

export function legalBids(state: KachufulState, actor: PlayerId): readonly number[] {
  if (state.phase !== 'bidding') return [];
  const current = currentPlayer(state);
  if (!current || current.id !== actor) return [];

  const all: number[] = [];
  for (let bid = 0; bid <= state.handSize; bid += 1) all.push(bid);

  if (state.rulePack.hookRule && isFinalBidder(state, actor)) {
    const forbidden = state.handSize - sumOtherBids(state, actor);
    return all.filter((bid) => bid !== forbidden);
  }
  return all;
}

export function legalActions(state: KachufulState, actor: PlayerId): readonly KachufulAction[] {
  if (state.phase === 'bidding') {
    return legalBids(state, actor).map((bid) => ({ type: 'PLACE_BID' as const, actor, bid }));
  }
  if (state.phase === 'playing') {
    return legalPlayableCards(state, actor).map((card) => ({
      type: 'PLAY_CARD' as const,
      actor,
      cardId: card.id,
    }));
  }
  if (state.phase === 'round_scored') {
    return [{ type: 'START_NEXT_ROUND' as const, actor }];
  }
  return [];
}
