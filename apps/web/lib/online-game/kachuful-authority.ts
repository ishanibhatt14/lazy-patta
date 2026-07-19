import type { Card, PlayerId, Rng, Suit } from '@lazy-patta/game-contracts';
import {
  chooseKachufulBotAction,
  KachufulEngine,
  KACHUFUL_FAMILY_DESCENDING,
  type KachufulAction,
  type KachufulEvent,
  type KachufulResult,
  type KachufulState,
  type KachufulTrickCard,
  type KachufulTrump,
} from '@lazy-patta/kachuful-engine';
import type { SupabaseClient } from '@supabase/supabase-js';

import { botId, isBotId, VersionConflictError } from './authority';

/**
 * Server-authoritative Kachuful (Judgement) runtime, mirroring the Gadha Chor,
 * Lal Satti, and Jhabbu authorities. The pure `KachufulEngine` is the sole rule
 * authority; this module runs it with a crypto RNG and commits each step through
 * the persistence RPCs (row lock, version guard, idempotency). Only public table
 * state (bids, tricks, whose turn, running scores) and a player's own hand ever
 * leave the server.
 *
 * Kachuful differs from the other online games in two ways the authority must
 * absorb: a per-round bidding phase, and a `round_scored` pause that needs a
 * player to trigger `START_NEXT_ROUND`. Bots only act while it is their turn to
 * bid or play; the `round_scored` pause is advanced by a human clicking
 * "next round" (every room has at least one human — the host), so the bot loop
 * stops there and the board shows the round scoreboard until then.
 */

const engine = new KachufulEngine();

export interface KachufulPublicPlayerView {
  readonly id: PlayerId;
  readonly seat: number;
  readonly handCount: number;
  readonly bid: number | null;
  readonly tricksWon: number;
  readonly roundScore: number;
  readonly totalScore: number;
  readonly isBot: boolean;
  readonly isDealer: boolean;
}

export interface KachufulPublicSnapshot {
  readonly gameKey: 'kachuful';
  readonly rulePackId: string;
  readonly players: readonly KachufulPublicPlayerView[];
  readonly currentPlayerId: PlayerId | null;
  readonly phase: KachufulState['phase'];
  readonly trump: KachufulTrump;
  readonly handSize: number;
  readonly roundNumber: number;
  readonly totalRounds: number;
  readonly ledSuit: Suit | null;
  readonly currentTrick: readonly KachufulTrickCard[];
  readonly matchWinnerIds: readonly PlayerId[];
  readonly stateVersion: number;
}

export type KachufulClientAction =
  | { readonly type: 'PLACE_BID'; readonly bid: number }
  | { readonly type: 'PLAY_CARD'; readonly cardId: string }
  | { readonly type: 'START_NEXT_ROUND' };

function cryptoRng(): Rng {
  return {
    next(): number {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      return buffer[0]! / 0x1_0000_0000;
    },
  };
}

function isComplete(state: KachufulState): boolean {
  return state.phase === 'match_complete';
}

function humanHands(state: KachufulState): { user_id: string; hand: readonly Card[] }[] {
  return state.players.filter((p) => !isBotId(p.id)).map((p) => ({ user_id: p.id, hand: p.hand }));
}

function publicSnapshot(state: KachufulState): KachufulPublicSnapshot {
  return {
    gameKey: 'kachuful',
    rulePackId: state.rulePack.id,
    players: state.players.map((player, index) => ({
      id: player.id,
      seat: player.seat,
      handCount: player.hand.length,
      bid: player.bid,
      tricksWon: player.tricksWon,
      roundScore: player.roundScore,
      totalScore: player.totalScore,
      isBot: player.isBot,
      isDealer: index === state.dealerIndex,
    })),
    currentPlayerId: currentKachufulActor(state),
    phase: state.phase,
    trump: state.trump,
    handSize: state.handSize,
    roundNumber: state.roundNumber,
    totalRounds: state.totalRounds,
    ledSuit: state.ledSuit,
    currentTrick: state.currentTrick,
    matchWinnerIds: state.matchWinnerIds,
    stateVersion: state.stateVersion,
  };
}

function statusFor(state: KachufulState): 'active' | 'complete' {
  return isComplete(state) ? 'complete' : 'active';
}

function resultFor(state: KachufulState): KachufulResult | null {
  return engine.result(state);
}

function withBotFlags(state: KachufulState): KachufulState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player, isBot: isBotId(player.id) })),
  };
}

function isVersionConflict(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === 'PT409' || (error.message ?? '').includes('version conflict');
}

export function initialKachufulState(playerIds: readonly PlayerId[]): KachufulState {
  const botIds = playerIds.filter(isBotId);
  return withBotFlags(engine.init(playerIds, cryptoRng(), KACHUFUL_FAMILY_DESCENDING, botIds));
}

export async function persistKachufulStart(
  admin: SupabaseClient,
  roomId: string,
  state: KachufulState,
): Promise<string> {
  const { data, error } = await admin.rpc('start_game', {
    p_room_id: roomId,
    p_public_snapshot: publicSnapshot(state),
    p_authority_state: state,
    p_hands: humanHands(state),
    p_events: [],
  });
  if (error) throw error;
  const game = data as { id: string } | null;
  if (!game?.id) throw new Error('start_game returned no game');
  return game.id;
}

async function commitStep(
  admin: SupabaseClient,
  gameId: string,
  actor: PlayerId,
  clientActionId: string,
  expectedVersion: number,
  nextState: KachufulState,
  events: readonly KachufulEvent[],
): Promise<void> {
  const { error } = await admin.rpc('commit_game_action', {
    p_game_id: gameId,
    p_actor: actor,
    p_client_action_id: clientActionId,
    p_expected_version: expectedVersion,
    p_public_snapshot: publicSnapshot(nextState),
    p_authority_state: nextState,
    p_hands: humanHands(nextState),
    p_events: events,
    p_status: statusFor(nextState),
    p_result: resultFor(nextState),
  });
  if (isVersionConflict(error)) throw new VersionConflictError();
  if (error) throw error;
}

/**
 * Whose move the authority is waiting on. During bidding/playing that is the
 * seated player at `currentPlayerIndex`; the `round_scored` and `match_complete`
 * phases have no per-seat actor (round advancement is any-player, match end is
 * terminal), so they report `null`.
 */
export function currentKachufulActor(state: KachufulState): PlayerId | null {
  if (state.phase === 'bidding' || state.phase === 'playing') {
    return state.players[state.currentPlayerIndex]?.id ?? null;
  }
  return null;
}

function toEngineAction(actor: PlayerId, action: KachufulClientAction): KachufulAction {
  if (action.type === 'PLACE_BID') return { type: 'PLACE_BID', actor, bid: action.bid };
  if (action.type === 'PLAY_CARD') return { type: 'PLAY_CARD', actor, cardId: action.cardId };
  return { type: 'START_NEXT_ROUND', actor };
}

function sameAction(a: KachufulAction, b: KachufulAction): boolean {
  if (a.type !== b.type) return false;
  if (a.actor !== b.actor) return false;
  if (a.type === 'PLACE_BID') {
    return a.bid === (b as Extract<KachufulAction, { type: 'PLACE_BID' }>).bid;
  }
  if (a.type === 'PLAY_CARD') {
    return a.cardId === (b as Extract<KachufulAction, { type: 'PLAY_CARD' }>).cardId;
  }
  return true;
}

export async function applyHumanKachufulAction(
  admin: SupabaseClient,
  gameId: string,
  state: KachufulState,
  actor: PlayerId,
  clientAction: KachufulClientAction,
  clientActionId: string,
): Promise<KachufulState> {
  const action = toEngineAction(actor, clientAction);
  const legal = engine
    .legalActions(state, actor)
    .some((candidate) => sameAction(candidate, action));
  if (!legal) throw new Error('INVALID_KACHUFUL_ACTION');

  const expected = state.stateVersion;
  const { state: next, events } = engine.reduce(state, action);
  const nextState = withBotFlags(next);
  await commitStep(admin, gameId, actor, clientActionId, expected, nextState, events);
  return nextState;
}

export async function advanceKachufulBots(
  admin: SupabaseClient,
  gameId: string,
  state: KachufulState,
): Promise<KachufulState> {
  let current = state;
  for (let guard = 0; guard < 1000; guard += 1) {
    const actor = currentKachufulActor(current);
    if (!actor || !isBotId(actor)) break;
    const decision = chooseKachufulBotAction(current, actor);
    if (!decision) break;
    const expected = current.stateVersion;
    const { state: next, events } = engine.reduce(current, decision.action);
    const nextState = withBotFlags(next);
    await commitStep(
      admin,
      gameId,
      actor,
      `bot:kachuful:v${nextState.stateVersion}`,
      expected,
      nextState,
      events,
    );
    current = nextState;
  }
  return current;
}

export { botId, KACHUFUL_FAMILY_DESCENDING };
