import {
  event,
  hiddenCardsFor,
  HUMAN_AFTER_PAIR_HAND,
  HUMAN_STARTING_HAND,
  scriptedPair,
  seatsForPhase,
} from './fixture-adapter';
import type {
  ComputerGameController,
  ComputerGameIntent,
  ComputerGameSettings,
  ComputerGameViewState,
} from './types';

const DEFAULT_SETTINGS: ComputerGameSettings = {
  playerCount: 4,
  reducedMotion: false,
  soundEnabled: true,
};

function setupState(settings: ComputerGameSettings = DEFAULT_SETTINGS): ComputerGameViewState {
  return {
    phase: 'setup',
    settings,
    seats: seatsForPhase(settings, 'setup'),
    ownHand: [],
    hiddenCards: [],
    instructionKey: 'computer.setupInstruction',
    statusKey: 'computer.setupStatus',
    events: [],
  };
}

function stateForPhase(
  settings: ComputerGameSettings,
  phase: ComputerGameViewState['phase'],
): ComputerGameViewState {
  switch (phase) {
    case 'dealing':
      return {
        phase,
        settings,
        seats: seatsForPhase(settings, phase),
        ownHand: HUMAN_STARTING_HAND,
        hiddenCards: hiddenCardsFor(settings, false),
        instructionKey: 'computer.dealingInstruction',
        statusKey: 'computer.dealingStatus',
        events: [event('deal-1', 'deal', 'computer.eventDealing')],
      };
    case 'initialPairs':
      return {
        phase,
        settings,
        seats: seatsForPhase(settings, phase),
        ownHand: HUMAN_STARTING_HAND,
        hiddenCards: hiddenCardsFor(settings, false),
        instructionKey: 'computer.initialPairsInstruction',
        statusKey: 'game.jodiMaliGai',
        events: [event('initial-pair-1', 'initialPair', 'computer.eventInitialPairs')],
      };
    case 'humanTurn':
      return {
        phase,
        settings,
        seats: seatsForPhase(settings, phase),
        ownHand: HUMAN_STARTING_HAND,
        hiddenCards: hiddenCardsFor(settings, true),
        instructionKey: 'turn.pickOneCard',
        statusKey: 'turn.yours',
        events: [event('human-turn-1', 'draw', 'computer.eventHumanTurn')],
      };
    case 'botTurn':
      return {
        phase,
        settings,
        seats: seatsForPhase(settings, phase),
        ownHand: HUMAN_AFTER_PAIR_HAND,
        hiddenCards: hiddenCardsFor(settings, false),
        instructionKey: 'turn.waiting',
        instructionValues: { name: 'Ba' },
        statusKey: 'turn.waiting',
        statusValues: { name: 'Ba' },
        events: [event('bot-turn-1', 'draw', 'computer.eventBotTurn', 'Ba')],
      };
    case 'playerFinished':
      return {
        phase,
        settings,
        seats: seatsForPhase(settings, phase),
        ownHand: HUMAN_AFTER_PAIR_HAND,
        hiddenCards: hiddenCardsFor(settings, false),
        instructionKey: 'computer.finishedInstruction',
        instructionValues: { name: 'Ba' },
        statusKey: 'label.finished',
        events: [event('finished-1', 'finished', 'computer.eventFinished', 'Ba')],
      };
    case 'result':
      return {
        phase,
        settings,
        seats: seatsForPhase(settings, phase),
        ownHand: HUMAN_AFTER_PAIR_HAND,
        hiddenCards: [],
        winnerName: 'Ba',
        gadhaChorName: 'Ravi',
        instructionKey: 'computer.resultInstruction',
        statusKey: 'label.gadhaChor',
        events: [event('result-1', 'result', 'computer.eventResult')],
      };
    case 'error':
      return {
        phase,
        settings,
        seats: seatsForPhase(settings, phase),
        ownHand: HUMAN_AFTER_PAIR_HAND,
        hiddenCards: hiddenCardsFor(settings, false),
        instructionKey: 'error.recoverable',
        statusKey: 'error.recoverable',
        events: [],
        recoverableErrorKey: 'error.recoverable',
      };
    case 'pairFound':
    case 'setup':
      return setupState(settings);
  }
}

function pairFoundState(settings: ComputerGameSettings): ComputerGameViewState {
  return {
    phase: 'pairFound',
    settings,
    seats: seatsForPhase(settings, 'pairFound'),
    ownHand: HUMAN_AFTER_PAIR_HAND,
    hiddenCards: hiddenCardsFor(settings, false),
    pairAnimation: scriptedPair(),
    instructionKey: 'game.youFoundPair',
    statusKey: 'game.jodiMaliGai',
    events: [event('pair-found-1', 'pairFound', 'game.youFoundPair')],
  };
}

function nextPhase(phase: ComputerGameViewState['phase']): ComputerGameViewState['phase'] {
  switch (phase) {
    case 'dealing':
      return 'initialPairs';
    case 'initialPairs':
      return 'humanTurn';
    case 'pairFound':
      return 'botTurn';
    case 'botTurn':
      return 'playerFinished';
    case 'playerFinished':
      return 'result';
    default:
      return phase;
  }
}

export const computerGameController: ComputerGameController = {
  initialState: setupState(),
  dispatch(state: ComputerGameViewState, intent: ComputerGameIntent): ComputerGameViewState {
    switch (intent.type) {
      case 'setPlayerCount':
        return setupState({
          ...state.settings,
          playerCount: Math.min(5, Math.max(3, intent.playerCount)),
        });
      case 'toggleReducedMotion':
        return {
          ...state,
          settings: { ...state.settings, reducedMotion: !state.settings.reducedMotion },
        };
      case 'toggleSound':
        return {
          ...state,
          settings: { ...state.settings, soundEnabled: !state.settings.soundEnabled },
        };
      case 'start':
        return stateForPhase(state.settings, 'dealing');
      case 'advance':
        return stateForPhase(state.settings, nextPhase(state.phase));
      case 'chooseHiddenCard':
        return state.hiddenCards.some(
          (card) => card.positionToken === intent.positionToken && card.isSelectable,
        )
          ? pairFoundState(state.settings)
          : stateForPhase(state.settings, 'error');
      case 'rematch':
      case 'recover':
        return setupState(state.settings);
    }
  },
};
