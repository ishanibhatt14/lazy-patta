import type { GameState } from '@lazy-patta/game-contracts';
import { GadhaChorEngine } from '@lazy-patta/game-engine';
import type { MessageKey } from '@lazy-patta/localization';

import type { ControllerState } from './controller';
import { HUMAN_ID, rosterName, type RosterEntry } from './players';
import type {
  ComputerGameResult,
  ComputerGameSeat,
  ComputerGameViewState,
  CurrentTurn,
  HiddenCardSlot,
} from './types';

const engine = new GadhaChorEngine();

interface Instruction {
  readonly instructionKey: MessageKey;
  readonly instructionValues?: Readonly<Record<string, string | number>>;
  readonly statusKey: MessageKey;
  readonly statusValues?: Readonly<Record<string, string | number>>;
}

function seats(
  state: ControllerState,
  game: GameState | null,
  turnActive: boolean,
): readonly ComputerGameSeat[] {
  return state.roster.map((entry: RosterEntry) => {
    const player = game?.players.find((candidate) => candidate.id === entry.id) ?? null;
    const isCurrent =
      turnActive &&
      game !== null &&
      game.phase !== 'completed' &&
      game.players[game.currentPlayerIndex]?.id === entry.id;
    return {
      id: entry.id,
      name: entry.name,
      avatarInitial: entry.avatarInitial,
      cardCount: player?.hand.length ?? 0,
      isSelf: entry.isSelf,
      isActive: isCurrent,
      isFinished: player?.status === 'finished',
      position: entry.position,
    };
  });
}

function hiddenCards(state: ControllerState, game: GameState): readonly HiddenCardSlot[] {
  const humanTurn =
    game.phase !== 'completed' && game.players[game.currentPlayerIndex]?.id === HUMAN_ID;
  if (state.phase !== 'playing' || state.draw || !humanTurn) return [];

  return engine.legalMoves(game, HUMAN_ID).map((action, index) => ({
    ownerId: action.from,
    ownerName: rosterName(state.roster, action.from),
    positionToken: action.positionToken,
    displayIndex: index + 1,
    isSelectable: true,
  }));
}

function currentTurn(state: ControllerState, game: GameState | null): CurrentTurn {
  if (!game || state.phase !== 'playing' || game.phase === 'completed') {
    return { isSelf: false, name: '', seatId: null };
  }
  const id = game.players[game.currentPlayerIndex]?.id ?? null;
  if (!id) return { isSelf: false, name: '', seatId: null };
  return { isSelf: id === HUMAN_ID, name: rosterName(state.roster, id), seatId: id };
}

function result(state: ControllerState, game: GameState | null): ComputerGameResult | undefined {
  if (state.phase !== 'result' || !game) return undefined;
  const outcome = engine.result(game);
  if (!outcome) return undefined;
  return {
    gadhaChorIsSelf: outcome.loser === HUMAN_ID,
    gadhaChorName: rosterName(state.roster, outcome.loser),
    winnerNames: outcome.winners.map((id) => rosterName(state.roster, id)),
  };
}

function instruction(state: ControllerState, turn: CurrentTurn): Instruction {
  switch (state.phase) {
    case 'setup':
      return { instructionKey: 'computer.setupInstruction', statusKey: 'computer.setupStatus' };
    case 'dealing':
      return { instructionKey: 'computer.dealingInstruction', statusKey: 'computer.dealingStatus' };
    case 'initialPairs':
      return { instructionKey: 'computer.initialPairsInstruction', statusKey: 'game.jodiMaliGai' };
    case 'result':
      return { instructionKey: 'computer.resultInstruction', statusKey: 'label.gadhaChor' };
    case 'error':
      return { instructionKey: 'error.recoverable', statusKey: 'error.recoverable' };
    case 'playing': {
      if (state.draw) {
        const { actorIsSelf, actorName, targetName, pairRemoved } = state.draw;
        if (actorIsSelf) {
          return pairRemoved
            ? { instructionKey: 'game.youFoundPair', statusKey: 'game.jodiMaliGai' }
            : { instructionKey: 'computer.youDrewInstruction', statusKey: 'turn.yours' };
        }
        return pairRemoved
          ? {
              instructionKey: 'computer.botFoundPair',
              instructionValues: { name: actorName },
              statusKey: 'game.jodiMaliGai',
            }
          : {
              instructionKey: 'computer.botDrewInstruction',
              instructionValues: { name: actorName, target: targetName },
              statusKey: 'turn.waiting',
              statusValues: { name: actorName },
            };
      }
      if (turn.isSelf) {
        return { instructionKey: 'turn.pickOneCard', statusKey: 'turn.yours' };
      }
      return {
        instructionKey: 'turn.waiting',
        instructionValues: { name: turn.name },
        statusKey: 'turn.waiting',
        statusValues: { name: turn.name },
      };
    }
  }
}

/**
 * Project the internal controller state into a render-safe view. This is the
 * ONLY bridge to the UI, and it deliberately emits the human's own hand plus
 * opponent *counts* and opaque tokens — never opponent card identities.
 */
export function selectViewState(state: ControllerState): ComputerGameViewState {
  const game = state.game;
  const turn = currentTurn(state, game);
  const turnActive = state.phase === 'playing' && !state.draw;
  const text = instruction(state, turn);

  return {
    phase: state.phase,
    settings: state.settings,
    seats: seats(state, game, turnActive),
    ownHand: game ? engine.projectPrivate(game, HUMAN_ID).hand : [],
    hiddenCards: game ? hiddenCards(state, game) : [],
    currentTurn: turn,
    draw: state.draw ?? undefined,
    result: result(state, game),
    instructionKey: text.instructionKey,
    instructionValues: text.instructionValues,
    statusKey: text.statusKey,
    statusValues: text.statusValues,
    events: state.events,
    recoverableError: state.recoverableError,
  };
}
