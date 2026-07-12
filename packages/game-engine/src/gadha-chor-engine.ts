import type {
  Card,
  Engine,
  GameAction,
  GameEvent,
  GameResult,
  GameState,
  PlayerId,
  PlayerState,
  PrivateView,
  PublicPlayerView,
  PublicSnapshot,
  RulePack,
  Rng,
} from '@lazy-patta/game-contracts';

import { buildDeck } from './deck';
import { removeSameRankPairs } from './pairs';
import { shuffle } from './shuffle';
import { mintPositionToken, resolvePositionToken } from './token';
import { activeCount, nextActiveIndex } from './turn';

function toPublicPlayer(p: PlayerState): PublicPlayerView {
  return { id: p.id, handCount: p.hand.length, status: p.status, isBot: p.isBot };
}

function withStatus(p: PlayerState, hand: Card[]): PlayerState {
  return { ...p, hand, status: hand.length === 0 ? 'finished' : p.status };
}

export class GadhaChorEngine implements Engine {
  init(rulePack: RulePack, players: readonly PlayerId[], rng: Rng): GameState {
    if (players.length < rulePack.minPlayers || players.length > rulePack.maxPlayers) {
      throw new Error(
        `Player count ${players.length} outside [${rulePack.minPlayers}, ${rulePack.maxPlayers}]`,
      );
    }

    // Shuffle, then remove one card of the removed rank at random (first in
    // shuffled order = random), leaving an odd one out.
    const shuffled = shuffle(buildDeck(), rng);
    const removeAt = shuffled.findIndex((c) => c.rank === rulePack.removedRank);
    const dealDeck = shuffled.filter((_, i) => i !== removeAt);

    const hands: Card[][] = players.map(() => []);
    dealDeck.forEach((card, i) => {
      hands[i % players.length]!.push(card);
    });

    const playerStates: PlayerState[] = players.map((id, i) => {
      const dealt = hands[i]!;
      const hand = rulePack.autoRemovePairs ? removeSameRankPairs(dealt).hand : dealt;
      return { id, hand, status: hand.length === 0 ? 'finished' : 'active', isBot: false };
    });

    const firstActive = playerStates.findIndex((p) => p.status === 'active');
    const phase = activeCount(playerStates) <= 1 ? 'completed' : 'in_progress';

    return {
      rulePack,
      players: playerStates,
      currentPlayerIndex: firstActive === -1 ? 0 : firstActive,
      phase,
      stateVersion: 0,
    };
  }

  legalMoves(state: GameState, actor: PlayerId): GameAction[] {
    if (state.phase === 'completed') return [];
    const current = state.players[state.currentPlayerIndex]!;
    if (current.id !== actor || current.status !== 'active') return [];

    const fromIndex = nextActiveIndex(
      state.players,
      state.currentPlayerIndex,
      state.rulePack.direction,
    );
    if (fromIndex === -1) return [];
    const from = state.players[fromIndex]!;

    return from.hand.map((_, index) => ({
      type: 'DRAW_CARD' as const,
      actor,
      from: from.id,
      positionToken: mintPositionToken(state.stateVersion, from.id, index),
    }));
  }

  reduce(state: GameState, action: GameAction): { state: GameState; events: GameEvent[] } {
    if (state.phase === 'completed') throw new Error('GAME_COMPLETED');
    if (action.type !== 'DRAW_CARD') throw new Error('UNKNOWN_ACTION');

    const currentIdx = state.currentPlayerIndex;
    const current = state.players[currentIdx]!;
    if (current.id !== action.actor) throw new Error('NOT_YOUR_TURN');

    const fromIndex = nextActiveIndex(state.players, currentIdx, state.rulePack.direction);
    if (fromIndex === -1) throw new Error('NO_SOURCE_PLAYER');
    const from = state.players[fromIndex]!;
    if (from.id !== action.from) throw new Error('INVALID_SOURCE_PLAYER');

    const handIndex = resolvePositionToken(
      action.positionToken,
      state.stateVersion,
      from.id,
      from.hand.length,
    );
    if (handIndex === -1) throw new Error('INVALID_POSITION_TOKEN');

    const drawn = from.hand[handIndex]!;
    const nextVersion = state.stateVersion + 1;
    const events: GameEvent[] = [{ type: 'CARD_DRAWN', stateVersion: nextVersion }];

    // Apply: remove from source, add to actor, auto-remove pairs in actor hand.
    const fromHand = from.hand.filter((_, i) => i !== handIndex);
    const actorRaw = [...current.hand, drawn];
    const { hand: actorHand, removed } = state.rulePack.autoRemovePairs
      ? removeSameRankPairs(actorRaw)
      : { hand: actorRaw, removed: [] as Card[] };
    if (removed.length > 0) events.push({ type: 'PAIR_REMOVED', stateVersion: nextVersion });

    const players = state.players.map((p, i) => {
      if (i === currentIdx) return withStatus(p, actorHand);
      if (i === fromIndex) return withStatus(p, fromHand);
      return p;
    });

    for (const idx of [currentIdx, fromIndex]) {
      if (state.players[idx]!.status === 'active' && players[idx]!.status === 'finished') {
        events.push({ type: 'PLAYER_FINISHED', stateVersion: nextVersion });
      }
    }

    const complete = activeCount(players) <= 1;
    const nextIdx = nextActiveIndex(players, currentIdx, state.rulePack.direction);
    events.push({ type: 'TURN_ADVANCED', stateVersion: nextVersion });
    if (complete) events.push({ type: 'GAME_COMPLETED', stateVersion: nextVersion });

    return {
      state: {
        ...state,
        players,
        currentPlayerIndex: nextIdx === -1 ? currentIdx : nextIdx,
        phase: complete ? 'completed' : 'in_progress',
        stateVersion: nextVersion,
      },
      events,
    };
  }

  isComplete(state: GameState): boolean {
    return state.phase === 'completed' || activeCount(state.players) <= 1;
  }

  result(state: GameState): GameResult | null {
    if (!this.isComplete(state)) return null;
    const loser = state.players.find((p) => p.status === 'active');
    if (!loser) return null;
    return {
      winners: state.players.filter((p) => p.status === 'finished').map((p) => p.id),
      loser: loser.id,
    };
  }

  botMove(state: GameState, actor: PlayerId, rng: Rng): GameAction | null {
    const moves = this.legalMoves(state, actor);
    if (moves.length === 0) return null;
    return moves[Math.floor(rng.next() * moves.length)]!;
  }

  projectPublic(state: GameState): PublicSnapshot {
    const current = state.players[state.currentPlayerIndex];
    return {
      rulePackId: state.rulePack.id,
      players: state.players.map(toPublicPlayer),
      currentPlayerId: state.phase === 'completed' ? null : (current?.id ?? null),
      phase: state.phase,
      stateVersion: state.stateVersion,
    };
  }

  projectPrivate(state: GameState, viewer: PlayerId): PrivateView {
    const me = state.players.find((p) => p.id === viewer);
    if (!me) throw new Error('VIEWER_NOT_IN_GAME');
    const current = state.players[state.currentPlayerIndex];
    return {
      viewer,
      hand: me.hand,
      opponents: state.players.filter((p) => p.id !== viewer).map(toPublicPlayer),
      currentPlayerId: state.phase === 'completed' ? null : (current?.id ?? null),
      phase: state.phase,
      stateVersion: state.stateVersion,
    };
  }
}
