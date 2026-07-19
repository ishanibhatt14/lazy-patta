import { type BotDifficulty, type Card, type Rng } from '@lazy-patta/game-contracts';
import {
  chooseKachufulBotAction,
  KachufulEngine,
  type KachufulAction,
  type KachufulState,
  type KachufulTrump,
} from '@lazy-patta/kachuful-engine';
import type { Locale, MessageKey, MessageValues } from '@lazy-patta/localization';

import { createCryptoRng } from '../../../lib/computer-game/rng';
import { createTranslator } from '../../../lib/i18n';

import { buildKachufulRoster, KACHUFUL_HUMAN_ID, rosterName } from './players';
import type {
  KachufulControllerState,
  KachufulIntent,
  KachufulScoreRow,
  KachufulSeatView,
  KachufulTrickCardView,
  KachufulViewEvent,
  KachufulViewPhase,
  KachufulViewState,
} from './types';

const engine = new KachufulEngine();
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 7;

export interface KachufulController {
  readonly initialState: KachufulControllerState;
  dispatch(state: KachufulControllerState, intent: KachufulIntent): KachufulControllerState;
}

function clampPlayerCount(playerCount: number): number {
  return Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.round(playerCount)));
}

function setupState(
  locale: Locale,
  playerCount = 4,
  difficulty: BotDifficulty = 'medium',
): KachufulControllerState {
  return {
    phase: 'setup',
    playerCount,
    humanName: '',
    difficulty,
    locale,
    reducedMotion: false,
    game: null,
    events: [],
    hasHydratedSession: false,
    seq: 0,
  };
}

function normalizeHumanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 24);
}

function playerDisplayName(state: KachufulControllerState, playerId: string): string {
  if (playerId === KACHUFUL_HUMAN_ID) {
    return (
      normalizeHumanName(state.humanName) || createTranslator(state.locale).t('computer.youName')
    );
  }
  return rosterName(buildKachufulRoster(state.playerCount), playerId);
}

function currentPlayerId(game: KachufulState | null): string | null {
  if (!game || game.phase === 'match_complete' || game.phase === 'round_scored') return null;
  return game.players[game.currentPlayerIndex]?.id ?? null;
}

function appendEvent(
  state: KachufulControllerState,
  messageKey: MessageKey,
  values?: MessageValues,
): readonly KachufulViewEvent[] {
  const event: KachufulViewEvent = { id: `kachuful-${state.seq}`, messageKey, values };
  return [event, ...state.events].slice(0, 8);
}

function startGame(state: KachufulControllerState, rng: Rng): KachufulControllerState {
  const roster = buildKachufulRoster(state.playerCount);
  const game = engine.init(
    roster.map((entry) => entry.id),
    rng,
    undefined,
    roster.filter((entry) => entry.isBot).map((entry) => entry.id),
  );
  const seq = state.seq + 1;
  return {
    ...state,
    phase: 'playing',
    game,
    seq,
    events: appendEvent({ ...state, seq }, 'kachuful.eventStarted'),
  };
}

function cardShortLabel(card: Card, locale: Locale): string {
  const { t, format } = createTranslator(locale);
  return format('card.accessibleFace', {
    rank: t(`rank.${card.rank}` as MessageKey),
    suit: t(`suit.${card.suit}` as MessageKey),
  });
}

function actionEvent(
  state: KachufulControllerState,
  action: KachufulAction,
): { key: MessageKey; values?: MessageValues } | null {
  const isSelf = action.actor === KACHUFUL_HUMAN_ID;
  const name = playerDisplayName(state, action.actor);
  if (action.type === 'PLACE_BID') {
    return {
      key: isSelf ? 'kachuful.eventYouBid' : 'kachuful.eventBid',
      values: { name, count: action.bid },
    };
  }
  if (action.type === 'PLAY_CARD') {
    const card = state.game?.players
      .find((player) => player.id === action.actor)
      ?.hand.find((candidate) => candidate.id === action.cardId);
    return {
      key: isSelf ? 'kachuful.eventYouPlayed' : 'kachuful.eventCardPlayed',
      values: { name, card: card ? cardShortLabel(card, state.locale) : action.cardId },
    };
  }
  return null;
}

function reduceEngineAction(
  state: KachufulControllerState,
  action: KachufulAction,
): KachufulControllerState {
  if (!state.game) return state;
  const { state: nextGame, events: engineEvents } = engine.reduce(state.game, action);

  let seq = state.seq;
  let events = state.events;
  const emit = (key: MessageKey, values?: MessageValues) => {
    seq += 1;
    events = appendEvent({ ...state, seq, events }, key, values);
  };

  const described = actionEvent(state, action);
  if (described) emit(described.key, described.values);

  for (const event of engineEvents) {
    if (event.type === 'TRICK_WON') {
      const isSelf = event.winner === KACHUFUL_HUMAN_ID;
      emit(isSelf ? 'kachuful.eventYouTrickWon' : 'kachuful.eventTrickWon', {
        name: playerDisplayName(state, event.winner),
      });
    } else if (event.type === 'ROUND_SCORED') {
      emit('kachuful.eventRoundScored', { round: event.roundNumber });
    } else if (event.type === 'MATCH_COMPLETE') {
      emit('kachuful.eventResult');
    }
  }

  const phase: KachufulControllerState['phase'] =
    nextGame.phase === 'match_complete' ? 'result' : 'playing';

  return { ...state, phase, game: nextGame, seq, events };
}

function dispatchWithRng(
  rng: Rng,
  state: KachufulControllerState,
  intent: KachufulIntent,
): KachufulControllerState {
  switch (intent.type) {
    case 'setPlayerCount':
      if (state.phase !== 'setup') return state;
      return { ...state, playerCount: clampPlayerCount(intent.playerCount) };
    case 'setHumanName':
      if (state.phase !== 'setup') return state;
      return { ...state, humanName: intent.humanName.slice(0, 32) };
    case 'setDifficulty':
      if (state.phase !== 'setup') return state;
      return { ...state, difficulty: intent.difficulty };
    case 'setLocale':
      return { ...state, locale: intent.locale };
    case 'hydrateSession':
      if (state.hasHydratedSession) return state;
      return {
        ...state,
        humanName: intent.humanName?.slice(0, 32) ?? state.humanName,
        hasHydratedSession: true,
      };
    case 'toggleReducedMotion':
      return { ...state, reducedMotion: !state.reducedMotion };
    case 'start':
      if (state.phase !== 'setup') return state;
      return startGame({ ...state, humanName: normalizeHumanName(state.humanName) }, rng);
    case 'placeBid': {
      if (!state.game || currentPlayerId(state.game) !== KACHUFUL_HUMAN_ID) return state;
      const action = engine
        .legalActions(state.game, KACHUFUL_HUMAN_ID)
        .find((candidate) => candidate.type === 'PLACE_BID' && candidate.bid === intent.bid);
      return action ? reduceEngineAction(state, action) : state;
    }
    case 'playCard': {
      if (!state.game || currentPlayerId(state.game) !== KACHUFUL_HUMAN_ID) return state;
      const action = engine
        .legalActions(state.game, KACHUFUL_HUMAN_ID)
        .find((candidate) => candidate.type === 'PLAY_CARD' && candidate.cardId === intent.cardId);
      return action ? reduceEngineAction(state, action) : state;
    }
    case 'nextRound': {
      if (!state.game || state.game.phase !== 'round_scored') return state;
      const action = engine
        .legalActions(state.game, KACHUFUL_HUMAN_ID)
        .find((candidate) => candidate.type === 'START_NEXT_ROUND');
      return action ? reduceEngineAction(state, action) : state;
    }
    case 'botStep': {
      const actor = currentPlayerId(state.game);
      if (!state.game || !actor || actor === KACHUFUL_HUMAN_ID) return state;
      const decision = chooseKachufulBotAction(state.game, actor, {
        difficulty: state.difficulty,
        rng,
      });
      return decision ? reduceEngineAction(state, decision.action) : state;
    }
    case 'rematch':
      if (state.phase !== 'result') return state;
      return startGame(
        {
          ...setupState(state.locale, state.playerCount, state.difficulty),
          humanName: state.humanName,
          reducedMotion: state.reducedMotion,
          hasHydratedSession: state.hasHydratedSession,
        },
        rng,
      );
  }
}

function trumpLabelKey(trump: KachufulTrump): MessageKey {
  return trump === 'no-trump' ? 'kachuful.noTrump' : (`suit.${trump}` as MessageKey);
}

function viewPhase(state: KachufulControllerState): KachufulViewPhase {
  if (!state.game) return 'setup';
  switch (state.game.phase) {
    case 'bidding':
      return 'bidding';
    case 'playing':
      return 'playing';
    case 'round_scored':
      return 'roundScored';
    case 'match_complete':
      return 'result';
  }
}

function seatsFor(state: KachufulControllerState): readonly KachufulSeatView[] {
  const roster = buildKachufulRoster(state.playerCount);
  const active = currentPlayerId(state.game);
  return roster.map((entry) => {
    const player = state.game?.players.find((candidate) => candidate.id === entry.id);
    const seatIndex = player?.seat ?? -1;
    return {
      id: entry.id,
      name: playerDisplayName(state, entry.id),
      avatarInitial:
        entry.id === KACHUFUL_HUMAN_ID
          ? (normalizeHumanName(state.humanName)[0]?.toUpperCase() ?? '★')
          : entry.avatarInitial,
      isSelf: entry.id === KACHUFUL_HUMAN_ID,
      isActive: active === entry.id,
      isDealer: state.game ? state.game.dealerIndex === seatIndex : false,
      bid: player?.bid ?? null,
      tricksWon: player?.tricksWon ?? 0,
      totalScore: player?.totalScore ?? 0,
      cardCount: player?.hand.length ?? 0,
    };
  });
}

function ownHand(state: KachufulControllerState): readonly Card[] {
  return state.game?.players.find((player) => player.id === KACHUFUL_HUMAN_ID)?.hand ?? [];
}

function currentTrickFor(state: KachufulControllerState): readonly KachufulTrickCardView[] {
  return (
    state.game?.currentTrick.map((entry) => ({
      playerId: entry.playerId,
      playerName: playerDisplayName(state, entry.playerId),
      card: entry.card,
    })) ?? []
  );
}

function scoreboardFor(state: KachufulControllerState): readonly KachufulScoreRow[] {
  const roster = buildKachufulRoster(state.playerCount);
  return roster
    .map((entry) => {
      const player = state.game?.players.find((candidate) => candidate.id === entry.id);
      return {
        playerId: entry.id,
        playerName: playerDisplayName(state, entry.id),
        totalScore: player?.totalScore ?? 0,
        isSelf: entry.id === KACHUFUL_HUMAN_ID,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore || a.playerName.localeCompare(b.playerName));
}

function resultFor(state: KachufulControllerState): KachufulViewState['result'] {
  if (!state.game || state.game.phase !== 'match_complete') return null;
  const winnerIds = state.game.matchWinnerIds;
  return {
    winnerIds,
    winnerNames: winnerIds.map((id) => playerDisplayName(state, id)),
    isSelfWinner: winnerIds.includes(KACHUFUL_HUMAN_ID),
    scoreboard: scoreboardFor(state),
  };
}

export function selectKachufulViewState(state: KachufulControllerState): KachufulViewState {
  const phase = viewPhase(state);
  const game = state.game;
  const active = currentPlayerId(game);
  const isHumanTurn = active === KACHUFUL_HUMAN_ID;
  const actions = game && isHumanTurn ? engine.legalActions(game, KACHUFUL_HUMAN_ID) : [];

  const legalBids = actions
    .filter((action) => action.type === 'PLACE_BID')
    .map((action) => (action as Extract<KachufulAction, { type: 'PLACE_BID' }>).bid);
  const playableCardIds = actions
    .filter((action) => action.type === 'PLAY_CARD')
    .map((action) => (action as Extract<KachufulAction, { type: 'PLAY_CARD' }>).cardId);

  const allBids = new Set<number>();
  if (game && phase === 'bidding') {
    for (let bid = 0; bid <= game.handSize; bid += 1) allBids.add(bid);
  }
  const forbiddenBid =
    phase === 'bidding' && isHumanTurn
      ? ([...allBids].find((bid) => !legalBids.includes(bid)) ?? null)
      : null;

  const currentPlayerName = active ? playerDisplayName(state, active) : '';

  const instructionKey: MessageKey =
    phase === 'roundScored'
      ? 'kachuful.roundScoredInstruction'
      : phase === 'result'
        ? 'kachuful.matchCompleteInstruction'
        : isHumanTurn
          ? phase === 'bidding'
            ? 'kachuful.yourTurnBid'
            : 'kachuful.yourTurnPlay'
          : 'kachuful.waitingInstruction';

  const statusKey: MessageKey =
    phase === 'roundScored'
      ? 'kachuful.roundComplete'
      : phase === 'result'
        ? 'kachuful.matchComplete'
        : isHumanTurn
          ? 'turn.yours'
          : 'turn.waiting';

  return {
    phase,
    playerCount: state.playerCount,
    humanName: state.humanName,
    difficulty: state.difficulty,
    canStart: state.phase === 'setup',
    locale: state.locale,
    reducedMotion: state.reducedMotion,
    roundNumber: game?.roundNumber ?? 1,
    totalRounds: game?.totalRounds ?? 7,
    handSize: game?.handSize ?? 0,
    trump: game?.trump ?? 'spades',
    trumpLabelKey: trumpLabelKey(game?.trump ?? 'spades'),
    seats: seatsFor(state),
    ownHand: ownHand(state),
    ledSuit: game?.ledSuit ?? null,
    currentTrick: currentTrickFor(state),
    isHumanTurn,
    legalBids,
    forbiddenBid,
    playableCardIds,
    currentPlayerName,
    instructionKey,
    instructionValues: active ? { name: currentPlayerName } : undefined,
    statusKey,
    statusValues: active ? { name: currentPlayerName } : undefined,
    events: state.events,
    scoreboard: scoreboardFor(state),
    result: resultFor(state),
  };
}

export function createKachufulController(
  rng: Rng = createCryptoRng(),
  locale: Locale = 'en',
  // Defaults to `hard` so seeded/programmatic callers (tests, the online
  // authority) stay deterministic; the interactive UI opts into `medium`.
  difficulty: BotDifficulty = 'hard',
): KachufulController {
  return {
    initialState: setupState(locale, 4, difficulty),
    dispatch: (state, intent) => dispatchWithRng(rng, state, intent),
  };
}
