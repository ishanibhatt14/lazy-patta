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
  LalSattiRoundScore,
  LalSattiRunningScore,
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
    humanName: '',
    locale,
    reducedMotion: false,
    game: null,
    events: [],
    roundScores: [],
    lastEngineEvents: [],
    hasHydratedSession: false,
    seq: 0,
  };
}

function normalizeHumanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 24);
}

function canStart(state: LalSattiControllerState): boolean {
  return normalizeHumanName(state.humanName).length > 0;
}

function playerDisplayName(state: LalSattiControllerState, playerId: string): string {
  if (playerId === LAL_SATTI_HUMAN_ID) {
    return normalizeHumanName(state.humanName) || LAL_SATTI_HUMAN_ID;
  }

  return rosterName(buildLalSattiRoster(state.playerCount), playerId);
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
  const completedRound = nextGame.phase === 'completed' ? roundScoreFor(state, nextGame) : null;

  return {
    ...state,
    phase: nextGame.phase === 'completed' ? 'result' : 'playing',
    game: nextGame,
    lastEngineEvents: engineEvents,
    roundScores: completedRound ? [...state.roundScores, completedRound] : state.roundScores,
    seq,
    events: viewEvents,
  };
}

function roundScoreFor(
  state: LalSattiControllerState,
  completedGame: NonNullable<LalSattiControllerState['game']>,
): LalSattiRoundScore {
  const winnerIds = new Set(completedGame.winnerIds);
  return {
    id: `lal-satti-round-${state.roundScores.length + 1}`,
    roundNumber: state.roundScores.length + 1,
    winnerNames: completedGame.winnerIds.map((id) => playerDisplayName(state, id)),
    leftovers: completedGame.players
      .filter((player) => !winnerIds.has(player.id))
      .map((player) => ({
        playerId: player.id,
        playerName: playerDisplayName(state, player.id),
        cardCount: player.hand.length,
      })),
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
  if (action.type === 'PASS') {
    return { name: playerDisplayName(state, action.actor) };
  }

  const actor = playerDisplayName(state, action.actor);
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
    case 'setHumanName':
      if (state.phase !== 'setup') return state;
      return { ...state, humanName: intent.humanName.slice(0, 32) };
    case 'setLocale':
      return { ...state, locale: intent.locale };
    case 'hydrateSession':
      if (state.hasHydratedSession) return state;
      return {
        ...state,
        humanName: intent.humanName?.slice(0, 32) ?? state.humanName,
        roundScores: intent.roundScores ?? state.roundScores,
        hasHydratedSession: true,
      };
    case 'toggleReducedMotion':
      return { ...state, reducedMotion: !state.reducedMotion };
    case 'start':
      if (state.phase !== 'setup' || !canStart(state)) return state;
      return startGame({ ...state, humanName: normalizeHumanName(state.humanName) }, rng);
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
      return startGame(
        {
          ...setupState(state.locale, state.playerCount),
          humanName: state.humanName,
          reducedMotion: state.reducedMotion,
          roundScores: state.roundScores,
          hasHydratedSession: state.hasHydratedSession,
        },
        rng,
      );
  }
}

function seatsFor(state: LalSattiControllerState): readonly LalSattiSeatView[] {
  const roster = buildLalSattiRoster(state.playerCount);
  const current = currentPlayerId(state);

  return roster.map((entry) => {
    const player = state.game?.players.find((candidate) => candidate.id === entry.id);
    return {
      id: entry.id,
      name: playerDisplayName(state, entry.id),
      avatarInitial:
        entry.id === LAL_SATTI_HUMAN_ID
          ? (normalizeHumanName(state.humanName)[0]?.toUpperCase() ?? 'Y')
          : entry.avatarInitial,
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
  return state.game?.winnerIds.map((id) => playerDisplayName(state, id)) ?? [];
}

function runningScoresFor(state: LalSattiControllerState): readonly LalSattiRunningScore[] {
  return buildLalSattiRoster(state.playerCount).map((entry) => {
    const leftovers = state.roundScores.flatMap((round) =>
      round.leftovers.filter((leftover) => leftover.playerId === entry.id),
    );
    return {
      playerId: entry.id,
      playerName: playerDisplayName(state, entry.id),
      totalLeftoverCards: leftovers.reduce((total, leftover) => total + leftover.cardCount, 0),
      roundsNotWon: leftovers.length,
    };
  });
}

export function selectLalSattiViewState(state: LalSattiControllerState): LalSattiViewState {
  const actions = state.game ? engine.legalActions(state.game, LAL_SATTI_HUMAN_ID) : [];
  const playableCardIds = actions
    .filter((action) => action.type === 'PLAY_CARD')
    .map((action) => action.cardId);
  const current = currentPlayerId(state);
  const currentPlayerName =
    current === LAL_SATTI_HUMAN_ID
      ? playerDisplayName(state, LAL_SATTI_HUMAN_ID)
      : current
        ? playerDisplayName(state, current)
        : '';

  return {
    phase: state.phase,
    playerCount: state.playerCount,
    humanName: state.humanName,
    canStart: canStart(state),
    locale: state.locale,
    reducedMotion: state.reducedMotion,
    seats: seatsFor(state),
    lanes: toTableauLanes(state.game ? state.game.tableau : createEmptyTableau()),
    ownHand: humanHand(state),
    playableCardIds,
    currentPlayerName,
    isHumanTurn: current === LAL_SATTI_HUMAN_ID,
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
    roundScores: state.roundScores,
    runningScores: runningScoresFor(state),
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
