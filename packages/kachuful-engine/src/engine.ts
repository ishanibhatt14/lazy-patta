import type { Card, PlayerId, Rng } from '@lazy-patta/game-contracts';

import { dealRounds, sortCards, trickWinner } from './cards';
import {
  buildHandSizeSchedule,
  KACHUFUL_FAMILY_DESCENDING,
  legalActions as legalRuleActions,
  legalBids,
  legalPlayableCards,
} from './rules';
import { kachufulRoundScores } from './scoring';
import type {
  KachufulAction,
  KachufulEvent,
  KachufulPlayerState,
  KachufulResult,
  KachufulRoundSummary,
  KachufulRulePack,
  KachufulState,
  KachufulTrickCard,
  KachufulTrump,
} from './types';

function assertUniquePlayers(players: readonly PlayerId[]): void {
  if (new Set(players).size !== players.length) throw new Error('DUPLICATE_PLAYERS');
}

function trumpForRound(rulePack: KachufulRulePack, roundIndex: number): KachufulTrump {
  const rotation = rulePack.trumpRotation;
  return rotation[roundIndex % rotation.length]!;
}

function record<T>(players: readonly KachufulPlayerState[], value: (p: KachufulPlayerState) => T) {
  return Object.fromEntries(players.map((player) => [player.id, value(player)]));
}

function assertRoundCardsConserved(state: KachufulState): void {
  const inPlay: Card[] = [
    ...state.players.flatMap((player) => player.hand),
    ...state.currentTrick.map((entry) => entry.card),
    ...state.playedPile,
  ];
  const expected = state.handSize * state.players.length;
  if (inPlay.length !== expected) throw new Error('CARD_COUNT_INVARIANT');
  if (new Set(inPlay.map((card) => card.id)).size !== inPlay.length) {
    throw new Error('DUPLICATE_CARD_INVARIANT');
  }
}

export class KachufulEngine {
  init(
    players: readonly PlayerId[],
    rng: Rng,
    rulePack: KachufulRulePack = KACHUFUL_FAMILY_DESCENDING,
    botIds: readonly PlayerId[] = [],
  ): KachufulState {
    if (players.length < rulePack.minPlayers || players.length > rulePack.maxPlayers) {
      throw new Error(
        `Player count ${players.length} outside [${rulePack.minPlayers}, ${rulePack.maxPlayers}]`,
      );
    }
    assertUniquePlayers(players);

    const schedule = buildHandSizeSchedule(rulePack, players.length);
    const deals = dealRounds(schedule, players.length, rng);
    const botSet = new Set(botIds);
    const handSize = schedule[0]!;
    const dealerIndex = 0;

    const playerStates = players.map<KachufulPlayerState>((id, index) => ({
      id,
      seat: index,
      hand: deals[0]![index]!,
      isBot: botSet.has(id),
      bid: null,
      tricksWon: 0,
      roundScore: 0,
      totalScore: 0,
    }));

    const state: KachufulState = {
      rulePack,
      players: playerStates,
      deals,
      handSizeSchedule: schedule,
      roundNumber: 1,
      totalRounds: schedule.length,
      handSize,
      trump: trumpForRound(rulePack, 0),
      dealerIndex,
      currentPlayerIndex: (dealerIndex + 1) % players.length,
      ledSuit: null,
      currentTrick: [],
      playedPile: [],
      tricksPlayed: 0,
      phase: 'bidding',
      stateVersion: 0,
      roundHistory: [],
      matchWinnerIds: [],
    };
    assertRoundCardsConserved(state);
    return state;
  }

  legalActions(state: KachufulState, actor: PlayerId): readonly KachufulAction[] {
    return legalRuleActions(state, actor);
  }

  reduce(
    state: KachufulState,
    action: KachufulAction,
  ): { readonly state: KachufulState; readonly events: readonly KachufulEvent[] } {
    if (state.phase === 'match_complete') throw new Error('MATCH_COMPLETE');
    if (action.expectedVersion !== undefined && action.expectedVersion !== state.stateVersion) {
      throw new Error('STALE_ACTION');
    }
    if (action.type === 'PLACE_BID') return this.placeBid(state, action);
    if (action.type === 'PLAY_CARD') return this.playCard(state, action);
    return this.startNextRound(state, action);
  }

  result(state: KachufulState): KachufulResult | null {
    if (state.phase !== 'match_complete') return null;
    return {
      winnerIds: state.matchWinnerIds,
      totalScores: record(state.players, (player) => player.totalScore),
      rounds: state.roundHistory,
    };
  }

  private placeBid(
    state: KachufulState,
    action: Extract<KachufulAction, { readonly type: 'PLACE_BID' }>,
  ): { readonly state: KachufulState; readonly events: readonly KachufulEvent[] } {
    if (state.phase !== 'bidding') throw new Error('NOT_BIDDING');
    const current = state.players[state.currentPlayerIndex];
    if (!current || current.id !== action.actor) throw new Error('NOT_YOUR_TURN');
    if (!legalBids(state, action.actor).includes(action.bid)) throw new Error('ILLEGAL_BID');

    const nextVersion = state.stateVersion + 1;
    const players = state.players.map((player, index) =>
      index === state.currentPlayerIndex ? { ...player, bid: action.bid } : player,
    );
    const events: KachufulEvent[] = [
      { type: 'BID_PLACED', actor: action.actor, bid: action.bid, stateVersion: nextVersion },
    ];

    const everyoneBid = players.every((player) => player.bid !== null);
    if (everyoneBid) {
      const leaderIndex = (state.dealerIndex + 1) % players.length;
      events.push({
        type: 'BIDDING_COMPLETE',
        leader: players[leaderIndex]!.id,
        stateVersion: nextVersion,
      });
      return {
        state: {
          ...state,
          players,
          currentPlayerIndex: leaderIndex,
          phase: 'playing',
          stateVersion: nextVersion,
        },
        events,
      };
    }

    const nextIndex = (state.currentPlayerIndex + 1) % players.length;
    events.push({
      type: 'TURN_ADVANCED',
      actor: players[nextIndex]!.id,
      stateVersion: nextVersion,
    });
    return {
      state: { ...state, players, currentPlayerIndex: nextIndex, stateVersion: nextVersion },
      events,
    };
  }

  private playCard(
    state: KachufulState,
    action: Extract<KachufulAction, { readonly type: 'PLAY_CARD' }>,
  ): { readonly state: KachufulState; readonly events: readonly KachufulEvent[] } {
    if (state.phase !== 'playing') throw new Error('NOT_PLAYING');
    const current = state.players[state.currentPlayerIndex];
    if (!current || current.id !== action.actor) throw new Error('NOT_YOUR_TURN');

    const card = current.hand.find((candidate) => candidate.id === action.cardId);
    if (!card || !legalPlayableCards(state, action.actor).some((legal) => legal.id === card.id)) {
      throw new Error('ILLEGAL_CARD');
    }

    const nextVersion = state.stateVersion + 1;
    const trickEntry: KachufulTrickCard = {
      playerId: action.actor,
      card,
      sequence: state.currentTrick.length,
    };
    const currentTrick = [...state.currentTrick, trickEntry];
    const players = state.players.map((player, index) =>
      index === state.currentPlayerIndex
        ? { ...player, hand: player.hand.filter((candidate) => candidate.id !== card.id) }
        : player,
    );
    const ledSuit = state.ledSuit ?? card.suit;
    const events: KachufulEvent[] = [
      { type: 'CARD_PLAYED', actor: action.actor, card, stateVersion: nextVersion },
    ];

    const afterPlay: KachufulState = {
      ...state,
      players,
      ledSuit,
      currentTrick,
      stateVersion: nextVersion,
    };

    if (currentTrick.length < players.length) {
      const nextIndex = (state.currentPlayerIndex + 1) % players.length;
      events.push({
        type: 'TURN_ADVANCED',
        actor: players[nextIndex]!.id,
        stateVersion: nextVersion,
      });
      const next = { ...afterPlay, currentPlayerIndex: nextIndex };
      assertRoundCardsConserved(next);
      return { state: next, events };
    }

    // Trick complete: award it and either continue, or score the round.
    const winner = trickWinner(currentTrick, ledSuit, state.trump);
    const winnerIndex = players.findIndex((player) => player.id === winner.playerId);
    const awardedPlayers = players.map((player, index) =>
      index === winnerIndex ? { ...player, tricksWon: player.tricksWon + 1 } : player,
    );
    events.push({
      type: 'TRICK_WON',
      winner: winner.playerId,
      cardCount: currentTrick.length,
      stateVersion: nextVersion,
    });

    const resolved: KachufulState = {
      ...afterPlay,
      players: awardedPlayers,
      currentPlayerIndex: winnerIndex,
      ledSuit: null,
      currentTrick: [],
      playedPile: [...state.playedPile, ...currentTrick.map((entry) => entry.card)],
      tricksPlayed: state.tricksPlayed + 1,
    };

    if (resolved.tricksPlayed >= state.handSize) {
      const scored = this.scoreRound(resolved, nextVersion, events);
      assertRoundCardsConserved(scored);
      return { state: scored, events };
    }

    events.push({
      type: 'TURN_ADVANCED',
      actor: awardedPlayers[winnerIndex]!.id,
      stateVersion: nextVersion,
    });
    assertRoundCardsConserved(resolved);
    return { state: resolved, events };
  }

  private scoreRound(
    state: KachufulState,
    nextVersion: number,
    events: KachufulEvent[],
  ): KachufulState {
    const roundScores = kachufulRoundScores(state.rulePack, state.players);
    const players = state.players.map((player) => {
      const roundScore = roundScores[player.id] ?? 0;
      return { ...player, roundScore, totalScore: player.totalScore + roundScore };
    });
    const summary: KachufulRoundSummary = {
      roundNumber: state.roundNumber,
      handSize: state.handSize,
      trump: state.trump,
      bids: record(players, (player) => player.bid ?? 0),
      tricksWon: record(players, (player) => player.tricksWon),
      roundScores,
      totalScores: record(players, (player) => player.totalScore),
    };
    events.push({
      type: 'ROUND_SCORED',
      roundNumber: state.roundNumber,
      stateVersion: nextVersion,
    });

    const scored: KachufulState = {
      ...state,
      players,
      roundHistory: [...state.roundHistory, summary],
    };

    if (state.roundNumber >= state.totalRounds) {
      const best = Math.max(...players.map((player) => player.totalScore));
      const winners = players.filter((player) => player.totalScore === best).map((p) => p.id);
      events.push({ type: 'MATCH_COMPLETE', winners, stateVersion: nextVersion });
      return { ...scored, phase: 'match_complete', matchWinnerIds: winners };
    }

    return { ...scored, phase: 'round_scored' };
  }

  private startNextRound(
    state: KachufulState,
    _action: Extract<KachufulAction, { readonly type: 'START_NEXT_ROUND' }>,
  ): { readonly state: KachufulState; readonly events: readonly KachufulEvent[] } {
    if (state.phase !== 'round_scored') throw new Error('ROUND_NOT_SCORED');

    const nextVersion = state.stateVersion + 1;
    const roundIndex = state.roundNumber; // 0-based index of the upcoming round
    const handSize = state.handSizeSchedule[roundIndex]!;
    const dealerIndex = (state.dealerIndex + 1) % state.players.length;
    const trump = trumpForRound(state.rulePack, roundIndex);

    const players = state.players.map<KachufulPlayerState>((player, index) => ({
      ...player,
      hand: sortCards(state.deals[roundIndex]![index]!),
      bid: null,
      tricksWon: 0,
      roundScore: 0,
    }));

    const leaderIndex = (dealerIndex + 1) % players.length;
    const next: KachufulState = {
      ...state,
      players,
      roundNumber: state.roundNumber + 1,
      handSize,
      trump,
      dealerIndex,
      currentPlayerIndex: leaderIndex,
      ledSuit: null,
      currentTrick: [],
      playedPile: [],
      tricksPlayed: 0,
      phase: 'bidding',
      stateVersion: nextVersion,
    };
    assertRoundCardsConserved(next);

    return {
      state: next,
      events: [
        {
          type: 'ROUND_DEALT',
          roundNumber: next.roundNumber,
          handSize,
          trump,
          leader: players[leaderIndex]!.id,
          stateVersion: nextVersion,
        },
      ],
    };
  }
}
