import { cardId, type Card, type PlayerId, type Rng, type Suit } from '@lazy-patta/game-contracts';

import { buildLalSattiDeck, shuffle, sortCards } from './cards';
import {
  addCardToTableau,
  createAllSevensTableau,
  createEmptyTableau,
  isLegalTableauPlay,
  LAL_SATTI_CLASSIC,
  playableCards,
} from './rules';
import type {
  LalSattiAction,
  LalSattiEvent,
  LalSattiInvariantError,
  LalSattiPlayerState,
  LalSattiResult,
  LalSattiRulePack,
  LalSattiState,
} from './types';
import { LalSattiInvariantError as BlockedCycleError } from './types';

function activePlayers(state: LalSattiState): readonly LalSattiPlayerState[] {
  return state.players.filter((player) => player.status === 'active');
}

function nextActiveIndex(players: readonly LalSattiPlayerState[], fromIndex: number): number {
  if (players.length === 0) return -1;

  for (let offset = 1; offset <= players.length; offset++) {
    const index = (fromIndex + offset) % players.length;
    if (players[index]?.status === 'active') return index;
  }
  return -1;
}

function currentPlayer(state: LalSattiState): LalSattiPlayerState | null {
  if (state.phase === 'completed') return null;
  return state.players[state.currentPlayerIndex] ?? null;
}

function assertUniquePlayers(players: readonly PlayerId[]): void {
  const unique = new Set(players);
  if (unique.size !== players.length) throw new Error('DUPLICATE_PLAYERS');
}

function remainingCards(state: LalSattiState): Readonly<Record<PlayerId, number>> {
  return Object.fromEntries(state.players.map((player) => [player.id, player.hand.length]));
}

function findCardHolder(players: readonly LalSattiPlayerState[], cardIdToFind: string): number {
  return players.findIndex((player) => player.hand.some((card) => card.id === cardIdToFind));
}

function isOpeningMoveRequired(state: LalSattiState): boolean {
  return (
    state.rulePack.opening === 'classic-seven-of-hearts' &&
    state.stateVersion === 0 &&
    state.tableau.hearts.length === 0
  );
}

function openSuits(state: LalSattiState): readonly Suit[] {
  return Object.entries(state.tableau)
    .filter(([, cards]) => cards.length > 0)
    .map(([suit]) => suit as Suit);
}

function blockedCycleError(state: LalSattiState, actor: PlayerId): LalSattiInvariantError {
  return new BlockedCycleError({
    code: 'BLOCKED_CYCLE',
    stateVersion: state.stateVersion,
    currentPlayerId: actor,
    activePlayerCount: activePlayers(state).length,
    consecutivePasses: state.consecutivePasses + 1,
    openSuits: openSuits(state),
  });
}

export class LalSattiEngine {
  init(
    players: readonly PlayerId[],
    rng: Rng,
    rulePack: LalSattiRulePack = LAL_SATTI_CLASSIC,
    botIds: readonly PlayerId[] = [],
  ): LalSattiState {
    if (players.length < rulePack.minPlayers || players.length > rulePack.maxPlayers) {
      throw new Error(
        `Player count ${players.length} outside [${rulePack.minPlayers}, ${rulePack.maxPlayers}]`,
      );
    }
    assertUniquePlayers(players);

    const botSet = new Set(botIds);
    const tableau =
      rulePack.opening === 'all-sevens-open' ? createAllSevensTableau() : createEmptyTableau();
    const dealDeck = shuffle(
      buildLalSattiDeck().filter(
        (card) => rulePack.opening === 'classic-seven-of-hearts' || card.rank !== '7',
      ),
      rng,
    );
    const hands: Card[][] = players.map(() => []);

    dealDeck.forEach((card, index) => {
      hands[index % players.length]!.push(card);
    });

    const playerStates = players.map((id, index) => ({
      id,
      hand: sortCards(hands[index]!),
      status: 'active' as const,
      isBot: botSet.has(id),
    }));

    const openingIndex =
      rulePack.opening === 'classic-seven-of-hearts'
        ? findCardHolder(playerStates, cardId('hearts', '7'))
        : 0;
    if (openingIndex === -1) throw new Error('OPENING_CARD_NOT_DEALT');

    return {
      rulePack,
      players: playerStates,
      currentPlayerIndex: openingIndex,
      tableau,
      phase: 'in_progress',
      stateVersion: 0,
      consecutivePasses: 0,
      winnerIds: [],
      completionReason: null,
    };
  }

  legalActions(state: LalSattiState, actor: PlayerId): readonly LalSattiAction[] {
    if (state.phase === 'completed') return [];

    const current = currentPlayer(state);
    if (!current || current.id !== actor || current.status !== 'active') return [];

    if (isOpeningMoveRequired(state)) {
      return current.hand.some((card) => card.id === cardId('hearts', '7'))
        ? [{ type: 'PLAY_CARD', actor, cardId: cardId('hearts', '7') }]
        : [];
    }

    const playable = playableCards(state.tableau, current.hand);
    if (playable.length === 0) return [{ type: 'PASS', actor }];
    return playable.map((card) => ({ type: 'PLAY_CARD' as const, actor, cardId: card.id }));
  }

  reduce(
    state: LalSattiState,
    action: LalSattiAction,
  ): { readonly state: LalSattiState; readonly events: readonly LalSattiEvent[] } {
    if (state.phase === 'completed') throw new Error('GAME_COMPLETED');

    const current = currentPlayer(state);
    if (!current || current.id !== action.actor || current.status !== 'active') {
      throw new Error('NOT_YOUR_TURN');
    }

    if (action.type === 'PLAY_CARD') return this.playCard(state, action.actor, action.cardId);
    return this.pass(state, action.actor);
  }

  isComplete(state: LalSattiState): boolean {
    return state.phase === 'completed';
  }

  result(state: LalSattiState): LalSattiResult | null {
    if (state.phase !== 'completed' || !state.completionReason) return null;
    return {
      winnerIds: state.winnerIds,
      reason: state.completionReason,
      remainingCards: remainingCards(state),
    };
  }

  private playCard(
    state: LalSattiState,
    actor: PlayerId,
    cardIdToPlay: string,
  ): { readonly state: LalSattiState; readonly events: readonly LalSattiEvent[] } {
    const current = state.players[state.currentPlayerIndex]!;
    const card = current.hand.find((candidate) => candidate.id === cardIdToPlay);
    if (
      !card ||
      (isOpeningMoveRequired(state)
        ? card.id !== cardId('hearts', '7')
        : !isLegalTableauPlay(state.tableau, card))
    ) {
      throw new Error('ILLEGAL_CARD');
    }

    const nextVersion = state.stateVersion + 1;
    const hand = current.hand.filter((candidate) => candidate.id !== cardIdToPlay);
    const finished = hand.length === 0;
    const phase = finished ? 'completed' : 'in_progress';
    const nextIndex = finished
      ? state.currentPlayerIndex
      : nextActiveIndex(
          state.players.map((player, index) =>
            index === state.currentPlayerIndex
              ? { ...player, hand, status: finished ? ('finished' as const) : player.status }
              : player,
          ),
          state.currentPlayerIndex,
        );

    const players = state.players.map((player, index) =>
      index === state.currentPlayerIndex
        ? { ...player, hand, status: finished ? ('finished' as const) : player.status }
        : player,
    );

    const winnerIds = finished ? [actor] : state.winnerIds;
    const events: LalSattiEvent[] = [
      { type: 'CARD_PLAYED', actor, card, stateVersion: nextVersion },
    ];

    if (finished) {
      events.push({ type: 'PLAYER_FINISHED', actor, stateVersion: nextVersion });
      events.push({
        type: 'GAME_COMPLETED',
        winnerIds,
        reason: 'hand_empty',
        stateVersion: nextVersion,
      });
    } else {
      events.push({
        type: 'TURN_ADVANCED',
        actor: nextIndex === -1 ? null : (state.players[nextIndex]?.id ?? null),
        stateVersion: nextVersion,
      });
    }

    return {
      state: {
        ...state,
        players,
        currentPlayerIndex: nextIndex === -1 ? state.currentPlayerIndex : nextIndex,
        tableau: addCardToTableau(state.tableau, card),
        phase,
        stateVersion: nextVersion,
        consecutivePasses: 0,
        winnerIds,
        completionReason: finished ? 'hand_empty' : null,
      },
      events,
    };
  }

  private pass(
    state: LalSattiState,
    actor: PlayerId,
  ): { readonly state: LalSattiState; readonly events: readonly LalSattiEvent[] } {
    const current = state.players[state.currentPlayerIndex]!;
    if (playableCards(state.tableau, current.hand).length > 0) throw new Error('PASS_NOT_ALLOWED');

    const nextVersion = state.stateVersion + 1;
    const passCount = state.consecutivePasses + 1;
    const active = activePlayers(state);
    if (passCount >= active.length) throw blockedCycleError(state, actor);

    const nextIndex = nextActiveIndex(state.players, state.currentPlayerIndex);
    const events: LalSattiEvent[] = [{ type: 'PLAYER_PASSED', actor, stateVersion: nextVersion }];

    events.push({
      type: 'TURN_ADVANCED',
      actor: nextIndex === -1 ? null : (state.players[nextIndex]?.id ?? null),
      stateVersion: nextVersion,
    });

    return {
      state: {
        ...state,
        currentPlayerIndex: nextIndex === -1 ? state.currentPlayerIndex : nextIndex,
        phase: 'in_progress',
        stateVersion: nextVersion,
        consecutivePasses: passCount,
        winnerIds: state.winnerIds,
        completionReason: null,
      },
      events,
    };
  }
}
