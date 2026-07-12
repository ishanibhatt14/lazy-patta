import type { GameAction, GameEvent, GameState, Rng } from '@lazy-patta/game-contracts';
import { GadhaChorEngine, resolvePositionToken } from '@lazy-patta/game-engine';

import { buildRoster, clampPlayerCount, HUMAN_ID, rosterName, type RosterEntry } from './players';
import { createCryptoRng } from './rng';
import { CLASSIC_GULAM_CHOR } from './rule-pack';
import type {
  ComputerGameIntent,
  ComputerGameSettings,
  ComputerGameViewEvent,
  DrawReveal,
} from './types';

/**
 * Internal controller state. Holds the authoritative `GameState` (the engine is
 * the rule authority even in computer mode); the render layer never sees this
 * directly — `selectViewState` projects a card-safe view (see view-model.ts).
 */
export interface ControllerState {
  readonly phase: 'setup' | 'dealing' | 'initialPairs' | 'playing' | 'result' | 'error';
  readonly settings: ComputerGameSettings;
  readonly roster: readonly RosterEntry[];
  readonly game: GameState | null;
  readonly draw: DrawReveal | null;
  readonly events: readonly ComputerGameViewEvent[];
  readonly recoverableError: boolean;
  /** Monotonic counter for stable event ids. */
  readonly seq: number;
}

export interface ComputerGameController {
  readonly initialState: ControllerState;
  dispatch(state: ControllerState, intent: ComputerGameIntent): ControllerState;
}

const DEFAULT_SETTINGS: ComputerGameSettings = {
  playerCount: 4,
  locale: 'en',
  reducedMotion: false,
  soundEnabled: true,
};

const engine = new GadhaChorEngine();

function currentPlayerId(game: GameState): string | null {
  if (game.phase === 'completed') return null;
  return game.players[game.currentPlayerIndex]?.id ?? null;
}

function pairRemoved(events: readonly GameEvent[]): boolean {
  return events.some((event) => event.type === 'PAIR_REMOVED');
}

function playerFinished(events: readonly GameEvent[]): boolean {
  return events.some((event) => event.type === 'PLAYER_FINISHED');
}

function setupState(settings: ComputerGameSettings): ControllerState {
  return {
    phase: 'setup',
    settings,
    roster: buildRoster(settings.playerCount),
    game: null,
    draw: null,
    events: [],
    recoverableError: false,
    seq: 0,
  };
}

function appendEvent(
  state: ControllerState,
  messageKey: ComputerGameViewEvent['messageKey'],
  values?: ComputerGameViewEvent['values'],
): readonly ComputerGameViewEvent[] {
  const event: ComputerGameViewEvent = { id: `evt-${state.seq}`, messageKey, values };
  // Keep the running log short — the newest updates matter most for family play.
  return [event, ...state.events].slice(0, 6);
}

function startGame(state: ControllerState, rng: Rng): ControllerState {
  const roster = buildRoster(state.settings.playerCount);
  const game = engine.init(
    CLASSIC_GULAM_CHOR,
    roster.map((entry) => entry.id),
    rng,
  );
  return {
    ...state,
    roster,
    game,
    draw: null,
    recoverableError: false,
    phase: 'dealing',
    seq: state.seq + 1,
    events: [{ id: `evt-${state.seq}`, messageKey: 'computer.eventDealing' }],
  };
}

function applyDraw(
  state: ControllerState,
  action: GameAction,
  drawnDetails: Pick<DrawReveal, 'actorIsSelf' | 'actorName' | 'targetName'> & {
    readonly drawnCard?: DrawReveal['drawnCard'];
    readonly matchedCard?: DrawReveal['matchedCard'];
  },
): ControllerState {
  const game = state.game!;
  const { state: nextGame, events } = engine.reduce(game, action);
  const foundPair = pairRemoved(events);

  const draw: DrawReveal = {
    actorIsSelf: drawnDetails.actorIsSelf,
    actorName: drawnDetails.actorName,
    targetName: drawnDetails.targetName,
    pairRemoved: foundPair,
    drawnCard: drawnDetails.drawnCard,
    matchedCard: foundPair ? drawnDetails.matchedCard : undefined,
  };

  let seq = state.seq + 1;
  let events2 = appendEvent(
    { ...state, seq },
    drawnDetails.actorIsSelf ? 'computer.eventHumanDrew' : 'computer.eventBotDrew',
    { name: drawnDetails.actorIsSelf ? drawnDetails.targetName : drawnDetails.actorName },
  );
  if (foundPair) {
    seq += 1;
    events2 = appendEvent(
      { ...state, seq, events: events2 },
      drawnDetails.actorIsSelf ? 'game.youFoundPair' : 'computer.botFoundPair',
      { name: drawnDetails.actorName },
    );
  }
  if (playerFinished(events)) {
    seq += 1;
    events2 = appendEvent({ ...state, seq, events: events2 }, 'computer.eventPlayerFinished');
  }

  return { ...state, game: nextGame, draw, phase: 'playing', seq, events: events2 };
}

function humanDraw(state: ControllerState, positionToken: string): ControllerState {
  const game = state.game;
  if (!game || state.phase !== 'playing' || state.draw) return state;
  if (currentPlayerId(game) !== HUMAN_ID) return state;

  const action = engine
    .legalMoves(game, HUMAN_ID)
    .find((candidate) => candidate.positionToken === positionToken);
  // A stale/unknown token is ignored rather than surfaced as an error — the UI
  // only ever offers currently-legal tokens.
  if (!action) return state;

  const target = game.players.find((player) => player.id === action.from)!;
  const handIndex = resolvePositionToken(
    action.positionToken,
    game.stateVersion,
    action.from,
    target.hand.length,
  );
  const drawnCard = handIndex === -1 ? undefined : target.hand[handIndex];
  const human = game.players.find((player) => player.id === HUMAN_ID)!;
  const matchedCard = drawnCard
    ? human.hand.find((card) => card.rank === drawnCard.rank)
    : undefined;

  return applyDraw(state, action, {
    actorIsSelf: true,
    actorName: '',
    targetName: rosterName(state.roster, action.from),
    drawnCard,
    matchedCard,
  });
}

function botStep(state: ControllerState, rng: Rng): ControllerState {
  const game = state.game;
  if (!game || state.phase !== 'playing' || state.draw) return state;
  const actorId = currentPlayerId(game);
  if (!actorId || actorId === HUMAN_ID) return state;

  const action = engine.botMove(game, actorId, rng);
  if (!action) return state;

  return applyDraw(state, action, {
    actorIsSelf: false,
    actorName: rosterName(state.roster, actorId),
    targetName: rosterName(state.roster, action.from),
  });
}

function clearDraw(state: ControllerState): ControllerState {
  if (!state.game || !state.draw) return state;
  const complete = engine.isComplete(state.game);
  return { ...state, draw: null, phase: complete ? 'result' : 'playing' };
}

function reduce(state: ControllerState, intent: ComputerGameIntent, rng: Rng): ControllerState {
  switch (intent.type) {
    case 'setPlayerCount': {
      if (state.phase !== 'setup') return state;
      const playerCount = clampPlayerCount(intent.playerCount);
      return setupState({ ...state.settings, playerCount });
    }
    case 'setLocale':
      return { ...state, settings: { ...state.settings, locale: intent.locale } };
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
      if (state.phase !== 'setup') return state;
      return startGame(state, rng);
    case 'introAdvance': {
      if (state.phase === 'dealing') {
        return {
          ...state,
          phase: 'initialPairs',
          events: appendEvent({ ...state, seq: state.seq + 1 }, 'computer.eventInitialPairs'),
          seq: state.seq + 1,
        };
      }
      if (state.phase === 'initialPairs' && state.game) {
        const complete = engine.isComplete(state.game);
        return { ...state, phase: complete ? 'result' : 'playing' };
      }
      return state;
    }
    case 'chooseHiddenCard':
      return humanDraw(state, intent.positionToken);
    case 'botStep':
      return botStep(state, rng);
    case 'clearDraw':
      return clearDraw(state);
    case 'rematch':
      if (state.phase !== 'result') return state;
      return startGame(setupState(state.settings), rng);
    case 'recover':
      return setupState(state.settings);
  }
}

/**
 * Create a controller bound to an injected `Rng`. Production uses a crypto RNG;
 * tests pass a deterministic seeded `Rng` for reproducible games. The reducer
 * itself is pure given the RNG sequence — all timing/pacing lives in the view.
 */
export function createComputerGameController(
  rng: Rng = createCryptoRng(),
  settings: ComputerGameSettings = DEFAULT_SETTINGS,
): ComputerGameController {
  return {
    initialState: setupState(settings),
    dispatch(state: ControllerState, intent: ComputerGameIntent): ControllerState {
      try {
        return reduce(state, intent, rng);
      } catch {
        // Any unexpected engine failure becomes a recoverable UI state rather
        // than a crash — the player can safely return to setup.
        return { ...state, phase: 'error', draw: null, recoverableError: true };
      }
    },
  };
}
