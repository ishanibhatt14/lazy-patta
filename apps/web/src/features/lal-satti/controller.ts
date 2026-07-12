import { type Card, type Rng } from '@lazy-patta/game-contracts';
import {
  chooseLalSattiBotAction,
  createEmptyTableau,
  LalSattiEngine,
  toTableauLanes,
} from '@lazy-patta/lal-satti-engine';
import type { Locale, MessageKey, MessageValues } from '@lazy-patta/localization';

import { createCryptoRng } from '../../../lib/computer-game/rng';

import { buildLalSattiRoster, LAL_SATTI_HUMAN_ID, rosterName } from './players';
import type {
  LalSattiControllerState,
  LalSattiIntent,
  LalSattiSeatView,
  LalSattiViewEvent,
  LalSattiViewState,
} from './types';

const engine = new LalSattiEngine();
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 6;

export interface LalSattiController {
  readonly initialState: LalSattiControllerState;
  dispatch(state: LalSattiControllerState, intent: LalSattiIntent): LalSattiControllerState;
}

function clampPlayerCount(playerCount: number): number {
  return Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.round(playerCount)));
}

function setupState(locale: Locale, playerCount = 4): LalSattiControllerState {
  return {
    phase: 'setup',
    playerCount,
    locale,
    reducedMotion: false,
    game: null,
    events: [],
    lastEngineEvents: [],
    seq: 0,
  };
}

function currentPlayerId(state: LalSattiControllerState): string | null {
  if (!state.game || state.game.phase === 'completed') return null;
  return state.game.players[state.game.currentPlayerIndex]?.id ?? null;
}

function appendEvent(
  state: LalSattiControllerState,
  messageKey: MessageKey,
  values?: MessageValues,
): readonly LalSattiViewEvent[] {
  const event: LalSattiViewEvent = { id: `lal-satti-${state.seq}`, messageKey, values };
  return [event, ...state.events].slice(0, 6);
}

function startGame(state: LalSattiControllerState, rng: Rng): LalSattiControllerState {
  const roster = buildLalSattiRoster(state.playerCount);
  const game = engine.init(
    roster.map((entry) => entry.id),
    rng,
    undefined,
    roster.filter((entry) => entry.isBot).map((entry) => entry.id),
  );

  return {
    ...state,
    phase: 'playing',
    game,
    lastEngineEvents: [],
    seq: state.seq + 1,
    events: appendEvent({ ...state, seq: state.seq + 1 }, 'lalSatti.eventStarted'),
  };
}

function reduceEngineAction(
  state: LalSattiControllerState,
  action: ReturnType<LalSattiEngine['legalActions']>[number],
): LalSattiControllerState {
  if (!state.game) return state;

  const { state: nextGame, events: engineEvents } = engine.reduce(state.game, action);
  let seq = state.seq + 1;
  let viewEvents = appendEvent({ ...state, seq }, eventKey(action), eventValues(state, action));

  if (engineEvents.some((event) => event.type === 'GAME_COMPLETED')) {
    seq += 1;
    viewEvents = appendEvent({ ...state, seq, events: viewEvents }, 'lalSatti.eventResult');
  }

  return {
    ...state,
    phase: nextGame.phase === 'completed' ? 'result' : 'playing',
    game: nextGame,
    lastEngineEvents: engineEvents,
    seq,
    events: viewEvents,
  };
}

function eventKey(action: ReturnType<LalSattiEngine['legalActions']>[number]): MessageKey {
  if (action.type === 'PASS') {
    return action.actor === LAL_SATTI_HUMAN_ID ? 'lalSatti.eventYouPassed' : 'lalSatti.eventPassed';
  }
  return action.actor === LAL_SATTI_HUMAN_ID
    ? 'lalSatti.eventYouPlayed'
    : 'lalSatti.eventCardPlayed';
}

function eventValues(
  state: LalSattiControllerState,
  action: ReturnType<LalSattiEngine['legalActions']>[number],
): MessageValues {
  const roster = buildLalSattiRoster(state.playerCount);
  if (action.type === 'PASS') {
    return { name: rosterName(roster, action.actor) };
  }

  const actor = rosterName(roster, action.actor);
  const card = state.game?.players
    .find((player) => player.id === action.actor)
    ?.hand.find((candidate) => candidate.id === action.cardId);
  return { name: actor, card: card ? cardShortLabel(card) : action.cardId };
}

function cardShortLabel(card: Card): string {
  const rank =
    card.rank === 'jack'
      ? 'J'
      : card.rank === 'queen'
        ? 'Q'
        : card.rank === 'king'
          ? 'K'
          : card.rank === 'ace'
            ? 'A'
            : card.rank;
  const suit =
    card.suit === 'hearts'
      ? '♥'
      : card.suit === 'diamonds'
        ? '♦'
        : card.suit === 'clubs'
          ? '♣'
          : '♠';
  return `${rank}${suit}`;
}

function dispatchWithRng(
  rng: Rng,
  state: LalSattiControllerState,
  intent: LalSattiIntent,
): LalSattiControllerState {
  switch (intent.type) {
    case 'setPlayerCount':
      if (state.phase !== 'setup') return state;
      return { ...state, playerCount: clampPlayerCount(intent.playerCount) };
    case 'setLocale':
      return { ...state, locale: intent.locale };
    case 'toggleReducedMotion':
      return { ...state, reducedMotion: !state.reducedMotion };
    case 'start':
      if (state.phase !== 'setup') return state;
      return startGame(state, rng);
    case 'playCard': {
      if (!state.game || currentPlayerId(state) !== LAL_SATTI_HUMAN_ID) return state;
      const action = engine
        .legalActions(state.game, LAL_SATTI_HUMAN_ID)
        .find((candidate) => candidate.type === 'PLAY_CARD' && candidate.cardId === intent.cardId);
      return action ? reduceEngineAction(state, action) : state;
    }
    case 'pass': {
      if (!state.game || currentPlayerId(state) !== LAL_SATTI_HUMAN_ID) return state;
      const action = engine
        .legalActions(state.game, LAL_SATTI_HUMAN_ID)
        .find((candidate) => candidate.type === 'PASS');
      return action ? reduceEngineAction(state, action) : state;
    }
    case 'botStep': {
      const actor = currentPlayerId(state);
      if (!state.game || !actor || actor === LAL_SATTI_HUMAN_ID) return state;
      const decision = chooseLalSattiBotAction(state.game, actor);
      return decision ? reduceEngineAction(state, decision.action) : state;
    }
    case 'rematch':
      if (state.phase !== 'result') return state;
      return startGame(setupState(state.locale, state.playerCount), rng);
  }
}

function seatsFor(state: LalSattiControllerState): readonly LalSattiSeatView[] {
  const roster = buildLalSattiRoster(state.playerCount);
  const current = currentPlayerId(state);

  return roster.map((entry) => {
    const player = state.game?.players.find((candidate) => candidate.id === entry.id);
    return {
      id: entry.id,
      name: entry.name,
      avatarInitial: entry.avatarInitial,
      isSelf: entry.id === LAL_SATTI_HUMAN_ID,
      isActive: current === entry.id,
      isFinished: player?.status === 'finished',
      cardCount: player?.hand.length ?? 0,
    };
  });
}

function humanHand(state: LalSattiControllerState): readonly Card[] {
  return state.game?.players.find((player) => player.id === LAL_SATTI_HUMAN_ID)?.hand ?? [];
}

function winnerNames(state: LalSattiControllerState): readonly string[] {
  const roster = buildLalSattiRoster(state.playerCount);
  return (
    state.game?.winnerIds.map((id) =>
      id === LAL_SATTI_HUMAN_ID ? LAL_SATTI_HUMAN_ID : rosterName(roster, id),
    ) ?? []
  );
}

export function selectLalSattiViewState(state: LalSattiControllerState): LalSattiViewState {
  const actions = state.game ? engine.legalActions(state.game, LAL_SATTI_HUMAN_ID) : [];
  const playableCardIds = actions
    .filter((action) => action.type === 'PLAY_CARD')
    .map((action) => action.cardId);
  const current = currentPlayerId(state);
  const currentPlayerName =
    current === LAL_SATTI_HUMAN_ID
      ? LAL_SATTI_HUMAN_ID
      : current
        ? rosterName(buildLalSattiRoster(state.playerCount), current)
        : '';

  return {
    phase: state.phase,
    playerCount: state.playerCount,
    locale: state.locale,
    reducedMotion: state.reducedMotion,
    seats: seatsFor(state),
    lanes: toTableauLanes(state.game ? state.game.tableau : createEmptyTableau()),
    ownHand: humanHand(state),
    playableCardIds,
    currentPlayerName,
    canPass: actions.some((action) => action.type === 'PASS'),
    instructionKey:
      state.phase === 'setup'
        ? 'lalSatti.setupDescription'
        : state.phase === 'result'
          ? 'lalSatti.resultInstruction'
          : current === LAL_SATTI_HUMAN_ID
            ? playableCardIds.length > 0
              ? 'lalSatti.yourTurnInstruction'
              : 'lalSatti.passInstruction'
            : 'lalSatti.waitingInstruction',
    instructionValues: current ? { name: currentPlayerName } : undefined,
    statusKey:
      state.phase === 'setup'
        ? 'lalSatti.modeLabel'
        : state.phase === 'result'
          ? 'lalSatti.roundComplete'
          : current === LAL_SATTI_HUMAN_ID
            ? 'turn.yours'
            : 'turn.waiting',
    statusValues: current ? { name: currentPlayerName } : undefined,
    events: state.events,
    winnerNames: winnerNames(state),
  };
}

export function createLalSattiController(
  rng: Rng = createCryptoRng(),
  locale: Locale = 'en',
): LalSattiController {
  return {
    initialState: setupState(locale),
    dispatch: (state, intent) => dispatchWithRng(rng, state, intent),
  };
}
