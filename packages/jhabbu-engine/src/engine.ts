import { cardId, type Card, type PlayerId, type Rng } from '@lazy-patta/game-contracts';

import { buildJhabbuDeck, highestLedSuitCard, shuffle, sortCards } from './cards';
import {
  activePlayers,
  JHABBU_GUJARATI_FAMILY,
  legalActions as legalRuleActions,
  legalPlayableCards,
  mustDrawFromWaste,
} from './rules';
import { jhabbuRoundPenalties } from './scoring';
import type {
  JhabbuAction,
  JhabbuEvent,
  JhabbuPlayerState,
  JhabbuResult,
  JhabbuRulePack,
  JhabbuState,
  JhabbuTrickCard,
} from './types';

function assertUniquePlayers(players: readonly PlayerId[]): void {
  const unique = new Set(players);
  if (unique.size !== players.length) throw new Error('DUPLICATE_PLAYERS');
}

function findPlayerIndex(players: readonly JhabbuPlayerState[], playerId: PlayerId): number {
  return players.findIndex((player) => player.id === playerId);
}

function currentPlayer(state: JhabbuState): JhabbuPlayerState | null {
  if (state.phase === 'round_complete') return null;
  return state.players[state.currentPlayerIndex] ?? null;
}

function nextActiveIndex(players: readonly JhabbuPlayerState[], fromIndex: number): number {
  if (players.length === 0) return -1;

  for (let offset = 1; offset <= players.length; offset += 1) {
    const index = (fromIndex + offset) % players.length;
    if (players[index]?.status === 'active') return index;
  }
  return -1;
}

function setCurrentIndexToPlayer(
  players: readonly JhabbuPlayerState[],
  playerId: PlayerId,
): number {
  const index = findPlayerIndex(players, playerId);
  if (index === -1) throw new Error('POWER_PLAYER_NOT_FOUND');
  return index;
}

function remainingCards(state: JhabbuState): Readonly<Record<PlayerId, number>> {
  return Object.fromEntries(state.players.map((player) => [player.id, player.hand.length]));
}

function cardsInState(state: JhabbuState): readonly Card[] {
  return [
    ...state.players.flatMap((player) => player.hand),
    ...state.currentTrick.map((entry) => entry.card),
    ...state.wastePile,
  ];
}

function finishEmptyNonPowerPlayers(
  state: JhabbuState,
  nextVersion: number,
  events: JhabbuEvent[],
): JhabbuState {
  let finishOrder = state.finishOrder.slice();
  const players = state.players.map((player) => {
    if (
      player.status === 'active' &&
      player.hand.length === 0 &&
      player.id !== state.powerPlayerId
    ) {
      const finishPosition = finishOrder.length + 1;
      finishOrder = [...finishOrder, player.id];
      events.push({
        type: 'PLAYER_GOT_AWAY',
        actor: player.id,
        finishPosition,
        stateVersion: nextVersion,
      });
      return { ...player, status: 'got_away' as const, finishPosition };
    }
    return player;
  });

  return { ...state, players, finishOrder };
}

function completeIfOnlyLoserRemains(
  state: JhabbuState,
  nextVersion: number,
  events: JhabbuEvent[],
): JhabbuState {
  const remaining = state.players.filter(
    (player) => player.status === 'active' && player.hand.length > 0,
  );
  if (remaining.length !== 1) return state;

  const loserId = remaining[0]!.id;
  const penalties = jhabbuRoundPenalties(state.players, state.finishOrder, loserId);
  const players = state.players.map((player) => ({
    ...player,
    penaltyPoints: penalties[player.id] ?? player.penaltyPoints,
  }));

  events.push({ type: 'ROUND_COMPLETED', loser: loserId, stateVersion: nextVersion });

  return {
    ...state,
    players,
    currentPlayerIndex: setCurrentIndexToPlayer(players, loserId),
    phase: 'round_complete',
    loserId,
    completionReason: 'last_player_with_cards',
  };
}

function assertUniqueCards(state: JhabbuState): void {
  const ids = cardsInState(state).map((card) => card.id);
  if (new Set(ids).size !== ids.length) throw new Error('DUPLICATE_CARD_INVARIANT');
}

function assertFullDeckConserved(state: JhabbuState): void {
  const ids = cardsInState(state).map((card) => card.id);
  if (ids.length !== 52) throw new Error('CARD_COUNT_INVARIANT');
  assertUniqueCards(state);
}

export class JhabbuEngine {
  init(
    players: readonly PlayerId[],
    rng: Rng,
    rulePack: JhabbuRulePack = JHABBU_GUJARATI_FAMILY,
    botIds: readonly PlayerId[] = [],
  ): JhabbuState {
    if (players.length < rulePack.minPlayers || players.length > rulePack.maxPlayers) {
      throw new Error(
        `Player count ${players.length} outside [${rulePack.minPlayers}, ${rulePack.maxPlayers}]`,
      );
    }
    assertUniquePlayers(players);

    const botSet = new Set(botIds);
    const hands: Card[][] = players.map(() => []);
    shuffle(buildJhabbuDeck(), rng).forEach((card, index) => {
      hands[index % players.length]!.push(card);
    });

    const playerStates = players.map((id, index) => ({
      id,
      seat: index,
      hand: sortCards(hands[index]!),
      status: 'active' as const,
      isBot: botSet.has(id),
      finishPosition: null,
      penaltyPoints: 0,
    }));
    const openingIndex = playerStates.findIndex((player) =>
      player.hand.some((card) => card.id === cardId('spades', 'ace')),
    );
    if (openingIndex === -1) throw new Error('OPENING_CARD_NOT_DEALT');

    const state: JhabbuState = {
      rulePack,
      players: playerStates,
      currentPlayerIndex: openingIndex,
      powerPlayerId: playerStates[openingIndex]!.id,
      ledSuit: null,
      currentTrick: [],
      wastePile: [],
      finishOrder: [],
      roundNumber: 1,
      phase: 'first_trick',
      stateVersion: 0,
      loserId: null,
      completionReason: null,
    };
    assertFullDeckConserved(state);
    return state;
  }

  legalActions(state: JhabbuState, actor: PlayerId): readonly JhabbuAction[] {
    return legalRuleActions(state, actor);
  }

  reduce(
    state: JhabbuState,
    action: JhabbuAction,
  ): { readonly state: JhabbuState; readonly events: readonly JhabbuEvent[] } {
    if (state.phase === 'round_complete') throw new Error('ROUND_COMPLETED');
    if (action.expectedVersion !== undefined && action.expectedVersion !== state.stateVersion) {
      throw new Error('STALE_ACTION');
    }

    if (action.type === 'DRAW_FROM_WASTE') return this.drawFromWaste(state, action);
    return this.playCard(state, action);
  }

  result(state: JhabbuState): JhabbuResult | null {
    if (state.phase !== 'round_complete' || !state.loserId) return null;
    return {
      loserId: state.loserId,
      finishOrder: state.finishOrder,
      penaltyPoints: Object.fromEntries(
        state.players.map((player) => [player.id, player.penaltyPoints]),
      ),
      remainingCards: remainingCards(state),
    };
  }

  private drawFromWaste(
    state: JhabbuState,
    action: Extract<JhabbuAction, { readonly type: 'DRAW_FROM_WASTE' }>,
  ): { readonly state: JhabbuState; readonly events: readonly JhabbuEvent[] } {
    const current = currentPlayer(state);
    if (!current || current.id !== action.actor) throw new Error('NOT_YOUR_TURN');
    if (!mustDrawFromWaste(state, action.actor)) throw new Error('DRAW_NOT_ALLOWED');

    const nextVersion = state.stateVersion + 1;
    const [drawn, ...wastePile] = state.wastePile;
    if (!drawn) throw new Error('EMPTY_WASTE');

    const players = state.players.map((player, index) =>
      index === state.currentPlayerIndex ? { ...player, hand: sortCards([drawn]) } : player,
    );
    const nextState: JhabbuState = { ...state, players, wastePile, stateVersion: nextVersion };
    assertUniqueCards(nextState);

    return {
      state: nextState,
      events: [
        { type: 'WASTE_DRAWN', actor: action.actor, card: drawn, stateVersion: nextVersion },
      ],
    };
  }

  private playCard(
    state: JhabbuState,
    action: Extract<JhabbuAction, { readonly type: 'PLAY_CARD' }>,
  ): { readonly state: JhabbuState; readonly events: readonly JhabbuEvent[] } {
    const current = currentPlayer(state);
    if (!current || current.id !== action.actor || current.status !== 'active') {
      throw new Error('NOT_YOUR_TURN');
    }

    if (mustDrawFromWaste(state, action.actor)) throw new Error('DRAW_REQUIRED');

    const card = current.hand.find((candidate) => candidate.id === action.cardId);
    if (!card || !legalPlayableCards(state, action.actor).some((legal) => legal.id === card.id)) {
      throw new Error('ILLEGAL_CARD');
    }

    const nextVersion = state.stateVersion + 1;
    const isThulla =
      state.phase !== 'first_trick' &&
      state.currentTrick.length > 0 &&
      state.ledSuit !== null &&
      card.suit !== state.ledSuit;
    const trickEntry: JhabbuTrickCard = {
      playerId: action.actor,
      card,
      sequence: state.currentTrick.length,
      isThulla,
    };
    const currentTrick = [...state.currentTrick, trickEntry];
    const players = state.players.map((player, index) =>
      index === state.currentPlayerIndex
        ? { ...player, hand: player.hand.filter((candidate) => candidate.id !== card.id) }
        : player,
    );
    const ledSuit = state.ledSuit ?? card.suit;
    const events: JhabbuEvent[] = [
      { type: 'CARD_PLAYED', actor: action.actor, card, isThulla, stateVersion: nextVersion },
    ];

    const afterPlay: JhabbuState = {
      ...state,
      players,
      ledSuit,
      currentTrick,
      stateVersion: nextVersion,
    };

    const resolved =
      state.phase === 'first_trick'
        ? this.resolveFirstTrickIfReady(afterPlay, nextVersion, events)
        : this.resolveRegularTrickIfReady(afterPlay, isThulla, nextVersion, events);

    const trickResolved = resolved.currentTrick.length === 0;
    const nextState =
      !trickResolved && resolved.phase !== 'round_complete'
        ? {
            ...resolved,
            currentPlayerIndex: nextActiveIndex(resolved.players, state.currentPlayerIndex),
          }
        : resolved;

    const withEmptyPlayersFinished = trickResolved
      ? finishEmptyNonPowerPlayers(nextState, nextVersion, events)
      : nextState;
    const completed = trickResolved
      ? completeIfOnlyLoserRemains(withEmptyPlayersFinished, nextVersion, events)
      : withEmptyPlayersFinished;
    if (completed.phase !== 'round_complete') {
      events.push({
        type: 'TURN_ADVANCED',
        actor: completed.players[completed.currentPlayerIndex]?.id ?? null,
        stateVersion: nextVersion,
      });
    }
    assertUniqueCards(completed);

    return { state: completed, events };
  }

  private resolveFirstTrickIfReady(
    state: JhabbuState,
    nextVersion: number,
    events: JhabbuEvent[],
  ): JhabbuState {
    if (state.currentTrick.length < activePlayers(state).length) return state;

    const leaderIndex = setCurrentIndexToPlayer(state.players, state.powerPlayerId);
    events.push({
      type: 'FIRST_TRICK_DISCARDED',
      leader: state.powerPlayerId,
      cardCount: state.currentTrick.length,
      stateVersion: nextVersion,
    });

    return {
      ...state,
      currentPlayerIndex: leaderIndex,
      ledSuit: null,
      currentTrick: [],
      wastePile: [...state.wastePile, ...state.currentTrick.map((entry) => entry.card)],
      phase: 'in_progress',
    };
  }

  private resolveRegularTrickIfReady(
    state: JhabbuState,
    isThulla: boolean,
    nextVersion: number,
    events: JhabbuEvent[],
  ): JhabbuState {
    const shouldResolve = isThulla || state.currentTrick.length >= activePlayers(state).length;
    if (!shouldResolve || !state.ledSuit) return state;

    const winner =
      state.rulePack.pickupRule === 'off-suit-player' && isThulla
        ? state.currentTrick[state.currentTrick.length - 1]!
        : highestLedSuitCard(state.currentTrick, state.ledSuit);
    const winnerIndex = setCurrentIndexToPlayer(state.players, winner.playerId);

    if (isThulla) {
      const trickCards = state.currentTrick.map((entry) => entry.card);
      const players = state.players.map((player, index) =>
        index === winnerIndex
          ? { ...player, hand: sortCards([...player.hand, ...trickCards]) }
          : player,
      );
      events.push({
        type: 'THULLA_TRIGGERED',
        actor: state.currentTrick[state.currentTrick.length - 1]!.playerId,
        pickupPlayer: winner.playerId,
        cardCount: trickCards.length,
        stateVersion: nextVersion,
      });
      events.push({
        type: 'PLAYER_PICKED_UP',
        actor: winner.playerId,
        cardCount: trickCards.length,
        stateVersion: nextVersion,
      });
      return {
        ...state,
        players,
        currentPlayerIndex: winnerIndex,
        powerPlayerId: winner.playerId,
        ledSuit: null,
        currentTrick: [],
      };
    }

    events.push({
      type: 'TRICK_DISCARDED',
      winner: winner.playerId,
      cardCount: state.currentTrick.length,
      stateVersion: nextVersion,
    });
    return {
      ...state,
      currentPlayerIndex: winnerIndex,
      powerPlayerId: winner.playerId,
      ledSuit: null,
      currentTrick: [],
      wastePile: [...state.wastePile, ...state.currentTrick.map((entry) => entry.card)],
    };
  }
}
