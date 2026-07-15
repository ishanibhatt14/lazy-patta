import { type Card, type Rng } from '@lazy-patta/game-contracts';
import { chooseJhabbuBotAction, JhabbuEngine, type JhabbuAction } from '@lazy-patta/jhabbu-engine';
import type { Locale, MessageKey, MessageValues } from '@lazy-patta/localization';

import { createCryptoRng } from '../../../lib/computer-game/rng';
import { createTranslator } from '../../../lib/i18n';

import { buildJhabbuRoster, JHABBU_HUMAN_ID } from './players';
import type {
  JhabbuControllerState,
  JhabbuIntent,
  JhabbuSeatView,
  JhabbuViewEvent,
  JhabbuViewState,
} from './types';

const engine = new JhabbuEngine();
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 6;

export interface JhabbuController {
  readonly initialState: JhabbuControllerState;
  dispatch(state: JhabbuControllerState, intent: JhabbuIntent): JhabbuControllerState;
}

function clampPlayerCount(playerCount: number): number {
  return Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.round(playerCount)));
}

function setupState(locale: Locale, playerCount = 4): JhabbuControllerState {
  return {
    phase: 'setup',
    playerCount,
    humanName: '',
    locale,
    reducedMotion: false,
    game: null,
    events: [],
    lastEngineEvents: [],
    seq: 0,
  };
}

function normalizeHumanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 24);
}

function playerDisplayName(state: JhabbuControllerState, playerId: string): string {
  if (playerId === JHABBU_HUMAN_ID) {
    return (
      normalizeHumanName(state.humanName) || createTranslator(state.locale).t('computer.youName')
    );
  }

  const roster = buildJhabbuRoster(state.playerCount);
  const entry = roster.find((candidate) => candidate.id === playerId);
  return entry ? createTranslator(state.locale).t(entry.nameKey) : playerId;
}

function currentPlayerId(state: JhabbuControllerState): string | null {
  if (!state.game || state.game.phase === 'round_complete') return null;
  return state.game.players[state.game.currentPlayerIndex]?.id ?? null;
}

function humanHand(state: JhabbuControllerState): readonly Card[] {
  return state.game?.players.find((player) => player.id === JHABBU_HUMAN_ID)?.hand ?? [];
}

function appendEvent(
  state: JhabbuControllerState,
  messageKey: MessageKey,
  values?: MessageValues,
): readonly JhabbuViewEvent[] {
  const event: JhabbuViewEvent = { id: `jhabbu-${state.seq}`, messageKey, values };
  return [event, ...state.events].slice(0, 7);
}

function startGame(state: JhabbuControllerState, rng: Rng): JhabbuControllerState {
  const roster = buildJhabbuRoster(state.playerCount);
  const game = engine.init(
    roster.map((entry) => entry.id),
    rng,
    undefined,
    roster.filter((entry) => entry.isBot).map((entry) => entry.id),
  );
  const nextSeq = state.seq + 1;

  return {
    ...state,
    phase: 'playing',
    game,
    lastEngineEvents: [],
    seq: nextSeq,
    events: appendEvent({ ...state, seq: nextSeq }, 'jhabbu.eventStarted'),
  };
}

function actionEventValues(
  state: JhabbuControllerState,
  action: JhabbuAction,
): MessageValues | undefined {
  if (action.type === 'DRAW_FROM_WASTE') {
    return { name: playerDisplayName(state, action.actor) };
  }

  const actor = playerDisplayName(state, action.actor);
  const card = state.game?.players
    .find((player) => player.id === action.actor)
    ?.hand.find((candidate) => candidate.id === action.cardId);

  return { name: actor, card: card ? cardShortLabel(card) : action.cardId };
}

function baseEventKey(action: JhabbuAction): MessageKey {
  if (action.type === 'DRAW_FROM_WASTE') {
    return action.actor === JHABBU_HUMAN_ID ? 'jhabbu.eventYouDrewWaste' : 'jhabbu.eventWasteDraw';
  }

  return action.actor === JHABBU_HUMAN_ID ? 'jhabbu.eventYouPlayed' : 'jhabbu.eventCardPlayed';
}

function reduceEngineAction(
  state: JhabbuControllerState,
  action: JhabbuAction,
): JhabbuControllerState {
  if (!state.game) return state;

  const { state: nextGame, events: engineEvents } = engine.reduce(state.game, {
    ...action,
    expectedVersion: state.game.stateVersion,
  });
  let seq = state.seq + 1;
  let viewEvents = appendEvent(
    { ...state, seq },
    baseEventKey(action),
    actionEventValues(state, action),
  );

  engineEvents.forEach((event) => {
    if (event.type === 'THULLA_TRIGGERED') {
      seq += 1;
      viewEvents = appendEvent({ ...state, seq, events: viewEvents }, 'jhabbu.eventThulla', {
        name: playerDisplayName(state, event.actor),
        pickup: playerDisplayName(state, event.pickupPlayer),
        count: event.cardCount,
      });
    }
    if (event.type === 'PLAYER_PICKED_UP') {
      seq += 1;
      viewEvents = appendEvent({ ...state, seq, events: viewEvents }, 'jhabbu.eventPickup', {
        name: playerDisplayName(state, event.actor),
        count: event.cardCount,
      });
    }
    if (event.type === 'PLAYER_GOT_AWAY') {
      seq += 1;
      viewEvents = appendEvent({ ...state, seq, events: viewEvents }, 'jhabbu.eventGotAway', {
        name: playerDisplayName(state, event.actor),
        position: event.finishPosition,
      });
    }
    if (event.type === 'FIRST_TRICK_DISCARDED') {
      seq += 1;
      viewEvents = appendEvent({ ...state, seq, events: viewEvents }, 'jhabbu.eventFirstTrick', {
        name: playerDisplayName(state, event.leader),
        count: event.cardCount,
      });
    }
    if (event.type === 'TRICK_DISCARDED') {
      seq += 1;
      viewEvents = appendEvent({ ...state, seq, events: viewEvents }, 'jhabbu.eventTrickWon', {
        name: playerDisplayName(state, event.winner),
        count: event.cardCount,
      });
    }
    if (event.type === 'ROUND_COMPLETED') {
      seq += 1;
      viewEvents = appendEvent({ ...state, seq, events: viewEvents }, 'jhabbu.eventRoundComplete', {
        name: playerDisplayName(state, event.loser),
      });
    }
  });

  return {
    ...state,
    phase: nextGame.phase === 'round_complete' ? 'result' : 'playing',
    game: nextGame,
    lastEngineEvents: engineEvents,
    seq,
    events: viewEvents,
  };
}

function dispatchWithRng(
  rng: Rng,
  state: JhabbuControllerState,
  intent: JhabbuIntent,
): JhabbuControllerState {
  switch (intent.type) {
    case 'setPlayerCount':
      if (state.phase !== 'setup') return state;
      return { ...state, playerCount: clampPlayerCount(intent.playerCount) };
    case 'setHumanName':
      if (state.phase !== 'setup') return state;
      return { ...state, humanName: intent.humanName.slice(0, 32) };
    case 'setLocale':
      return { ...state, locale: intent.locale };
    case 'toggleReducedMotion':
      return { ...state, reducedMotion: !state.reducedMotion };
    case 'start':
      if (state.phase !== 'setup') return state;
      return startGame({ ...state, humanName: normalizeHumanName(state.humanName) }, rng);
    case 'playCard': {
      if (!state.game || currentPlayerId(state) !== JHABBU_HUMAN_ID) return state;
      const action = engine
        .legalActions(state.game, JHABBU_HUMAN_ID)
        .find((candidate) => candidate.type === 'PLAY_CARD' && candidate.cardId === intent.cardId);
      return action ? reduceEngineAction(state, action) : state;
    }
    case 'drawFromWaste': {
      if (!state.game || currentPlayerId(state) !== JHABBU_HUMAN_ID) return state;
      const action = engine
        .legalActions(state.game, JHABBU_HUMAN_ID)
        .find((candidate) => candidate.type === 'DRAW_FROM_WASTE');
      return action ? reduceEngineAction(state, action) : state;
    }
    case 'botStep': {
      const actor = currentPlayerId(state);
      if (!state.game || !actor || actor === JHABBU_HUMAN_ID) return state;
      const decision = chooseJhabbuBotAction(state.game, actor);
      return decision ? reduceEngineAction(state, decision.action) : state;
    }
    case 'rematch':
      if (state.phase !== 'result') return state;
      return startGame(
        {
          ...setupState(state.locale, state.playerCount),
          humanName: state.humanName,
          reducedMotion: state.reducedMotion,
        },
        rng,
      );
  }
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

function seatsFor(state: JhabbuControllerState): readonly JhabbuSeatView[] {
  const roster = buildJhabbuRoster(state.playerCount);
  const current = currentPlayerId(state);

  return roster.map((entry) => {
    const player = state.game?.players.find((candidate) => candidate.id === entry.id);
    const name = playerDisplayName(state, entry.id);
    return {
      id: entry.id,
      name,
      avatarInitial:
        entry.id === JHABBU_HUMAN_ID
          ? (normalizeHumanName(state.humanName)[0]?.toUpperCase() ?? 'Y')
          : entry.avatarInitial,
      isSelf: entry.id === JHABBU_HUMAN_ID,
      isActive: current === entry.id,
      isFinished: player?.status === 'got_away',
      finishPosition: player?.finishPosition ?? null,
      isPower: state.game?.powerPlayerId === entry.id,
      cardCount: player?.hand.length ?? 0,
      penaltyPoints: player?.penaltyPoints ?? 0,
    };
  });
}

function suitLabel(suit: string | null): string | null {
  if (!suit) return null;
  return suit === 'hearts'
    ? '♥ Hearts'
    : suit === 'diamonds'
      ? '♦ Diamonds'
      : suit === 'clubs'
        ? '♣ Clubs'
        : '♠ Spades';
}

export function selectJhabbuViewState(state: JhabbuControllerState): JhabbuViewState {
  const actions = state.game ? engine.legalActions(state.game, JHABBU_HUMAN_ID) : [];
  const playableCardIds = actions
    .filter((action) => action.type === 'PLAY_CARD')
    .map((action) => action.cardId);
  const canDrawFromWaste = actions.some((action) => action.type === 'DRAW_FROM_WASTE');
  const current = currentPlayerId(state);
  const currentPlayerName =
    current === JHABBU_HUMAN_ID
      ? playerDisplayName(state, JHABBU_HUMAN_ID)
      : current
        ? playerDisplayName(state, current)
        : '';
  const result = state.game ? engine.result(state.game) : null;

  return {
    phase: state.phase,
    playerCount: state.playerCount,
    humanName: state.humanName,
    canStart: state.phase === 'setup',
    locale: state.locale,
    reducedMotion: state.reducedMotion,
    seats: seatsFor(state),
    ownHand: humanHand(state),
    playableCardIds,
    canDrawFromWaste,
    currentTrick: state.game?.currentTrick ?? [],
    wasteCount: state.game?.wastePile.length ?? 0,
    ledSuit: suitLabel(state.game?.ledSuit ?? null),
    powerPlayerName: state.game?.powerPlayerId
      ? playerDisplayName(state, state.game.powerPlayerId)
      : '',
    currentPlayerName,
    isHumanTurn: current === JHABBU_HUMAN_ID,
    instructionKey:
      state.phase === 'setup'
        ? 'jhabbu.setupDescription'
        : state.phase === 'result'
          ? 'jhabbu.resultInstruction'
          : current === JHABBU_HUMAN_ID
            ? canDrawFromWaste
              ? 'jhabbu.drawWasteInstruction'
              : playableCardIds.length > 0
                ? state.game?.ledSuit
                  ? 'jhabbu.followSuitInstruction'
                  : 'jhabbu.yourTurnInstruction'
                : 'jhabbu.noPlayInstruction'
            : 'jhabbu.waitingInstruction',
    instructionValues: current ? { name: currentPlayerName } : undefined,
    statusKey:
      state.phase === 'setup'
        ? 'jhabbu.modeLabel'
        : state.phase === 'result'
          ? 'jhabbu.roundComplete'
          : current === JHABBU_HUMAN_ID
            ? 'turn.yours'
            : 'turn.waiting',
    statusValues: current ? { name: currentPlayerName } : undefined,
    events: state.events,
    result,
    finishOrderNames: result?.finishOrder.map((id) => playerDisplayName(state, id)) ?? [],
    loserName: result?.loserId ? playerDisplayName(state, result.loserId) : '',
  };
}

export function createJhabbuController(
  rng: Rng = createCryptoRng(),
  locale: Locale = 'en',
): JhabbuController {
  return {
    initialState: setupState(locale),
    dispatch: (state, intent) => dispatchWithRng(rng, state, intent),
  };
}
