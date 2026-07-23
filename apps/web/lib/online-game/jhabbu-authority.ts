import type { Card, PlayerId, Rng, Suit } from '@lazy-patta/game-contracts';
import {
  chooseJhabbuBotAction,
  JhabbuEngine,
  JHABBU_CLASSIC_BHABHO,
  JHABBU_GUJARATI_FAMILY,
  type JhabbuAction,
  type JhabbuEvent,
  type JhabbuPlayerStatus,
  type JhabbuResult,
  type JhabbuRulePack,
  type JhabbuState,
  type JhabbuTrickCard,
} from '@lazy-patta/jhabbu-engine';
import type { SupabaseClient } from '@supabase/supabase-js';

import { botId, isBotId, VersionConflictError } from './authority';

/**
 * Server-authoritative Jhabbu runtime, mirroring the Gadha Chor and Lal Satti
 * authorities. The pure `JhabbuEngine` is the sole rule authority; this module
 * runs it with a crypto RNG and commits each step through the persistence RPCs
 * (row lock, version guard, idempotency). Only public table state (trick,
 * counts, whose turn) and a player's own hand ever leave the server.
 */

const engine = new JhabbuEngine();

export interface JhabbuPublicPlayerView {
  readonly id: PlayerId;
  readonly seat: number;
  readonly handCount: number;
  readonly status: JhabbuPlayerStatus;
  readonly isBot: boolean;
  readonly isPower: boolean;
  readonly finishPosition: number | null;
  readonly penaltyPoints: number;
}

export interface JhabbuPublicSnapshot {
  readonly gameKey: 'jhabbu';
  readonly rulePackId: string;
  readonly players: readonly JhabbuPublicPlayerView[];
  readonly currentPlayerId: PlayerId | null;
  readonly powerPlayerId: PlayerId;
  readonly ledSuit: Suit | null;
  readonly currentTrick: readonly JhabbuTrickCard[];
  readonly wasteCount: number;
  readonly phase: JhabbuState['phase'];
  readonly stateVersion: number;
}

export type JhabbuClientAction =
  { readonly type: 'PLAY_CARD'; readonly cardId: string } | { readonly type: 'DRAW_FROM_WASTE' };

function cryptoRng(): Rng {
  return {
    next(): number {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      return buffer[0]! / 0x1_0000_0000;
    },
  };
}

function isComplete(state: JhabbuState): boolean {
  return state.phase === 'round_complete';
}

function humanHands(state: JhabbuState): { user_id: string; hand: readonly Card[] }[] {
  return state.players.filter((p) => !isBotId(p.id)).map((p) => ({ user_id: p.id, hand: p.hand }));
}

function publicSnapshot(state: JhabbuState): JhabbuPublicSnapshot {
  return {
    gameKey: 'jhabbu',
    rulePackId: state.rulePack.id,
    players: state.players.map((player) => ({
      id: player.id,
      seat: player.seat,
      handCount: player.hand.length,
      status: player.status,
      isBot: player.isBot,
      isPower: player.id === state.powerPlayerId,
      finishPosition: player.finishPosition,
      penaltyPoints: player.penaltyPoints,
    })),
    currentPlayerId: currentJhabbuActor(state),
    powerPlayerId: state.powerPlayerId,
    ledSuit: state.ledSuit,
    currentTrick: state.currentTrick,
    wasteCount: state.wastePile.length,
    phase: state.phase,
    stateVersion: state.stateVersion,
  };
}

function statusFor(state: JhabbuState): 'active' | 'complete' {
  return isComplete(state) ? 'complete' : 'active';
}

function resultFor(state: JhabbuState): JhabbuResult | null {
  return isComplete(state) ? engine.result(state) : null;
}

function withBotFlags(state: JhabbuState): JhabbuState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player, isBot: isBotId(player.id) })),
  };
}

function isVersionConflict(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === 'PT409' || (error.message ?? '').includes('version conflict');
}

const JHABBU_RULE_PACKS: readonly JhabbuRulePack[] = [
  JHABBU_GUJARATI_FAMILY,
  JHABBU_CLASSIC_BHABHO,
];

/** Resolve a room's persisted preset id to a rule pack (default: gujarati family). */
export function jhabbuRulePackFor(presetId: string | null | undefined): JhabbuRulePack {
  return JHABBU_RULE_PACKS.find((pack) => pack.id === presetId) ?? JHABBU_GUJARATI_FAMILY;
}

export function initialJhabbuState(
  playerIds: readonly PlayerId[],
  rulePack: JhabbuRulePack = JHABBU_GUJARATI_FAMILY,
): JhabbuState {
  const botIds = playerIds.filter(isBotId);
  return withBotFlags(engine.init(playerIds, cryptoRng(), rulePack, botIds));
}

export async function persistJhabbuStart(
  admin: SupabaseClient,
  roomId: string,
  state: JhabbuState,
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
  nextState: JhabbuState,
  events: readonly JhabbuEvent[],
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

export function currentJhabbuActor(state: JhabbuState): PlayerId | null {
  if (isComplete(state)) return null;
  return state.players[state.currentPlayerIndex]?.id ?? null;
}

function toEngineAction(actor: PlayerId, action: JhabbuClientAction): JhabbuAction {
  if (action.type === 'DRAW_FROM_WASTE') return { type: 'DRAW_FROM_WASTE', actor };
  return { type: 'PLAY_CARD', actor, cardId: action.cardId };
}

function sameAction(a: JhabbuAction, b: JhabbuAction): boolean {
  if (a.type !== b.type) return false;
  if (a.actor !== b.actor) return false;
  return a.type === 'DRAW_FROM_WASTE'
    ? true
    : a.cardId === (b as Extract<JhabbuAction, { type: 'PLAY_CARD' }>).cardId;
}

export async function applyHumanJhabbuAction(
  admin: SupabaseClient,
  gameId: string,
  state: JhabbuState,
  actor: PlayerId,
  clientAction: JhabbuClientAction,
  clientActionId: string,
): Promise<JhabbuState> {
  const action = toEngineAction(actor, clientAction);
  const legal = engine
    .legalActions(state, actor)
    .some((candidate) => sameAction(candidate, action));
  if (!legal) throw new Error('INVALID_JHABBU_ACTION');

  const expected = state.stateVersion;
  const { state: next, events } = engine.reduce(state, action);
  const nextState = withBotFlags(next);
  await commitStep(admin, gameId, actor, clientActionId, expected, nextState, events);
  return nextState;
}

export async function advanceJhabbuBots(
  admin: SupabaseClient,
  gameId: string,
  state: JhabbuState,
): Promise<JhabbuState> {
  let current = state;
  for (let guard = 0; guard < 1000; guard += 1) {
    const actor = currentJhabbuActor(current);
    if (!actor || !isBotId(actor)) break;
    const decision = chooseJhabbuBotAction(current, actor);
    if (!decision) break;
    const expected = current.stateVersion;
    const { state: next, events } = engine.reduce(current, decision.action);
    const nextState = withBotFlags(next);
    await commitStep(
      admin,
      gameId,
      actor,
      `bot:jhabbu:v${nextState.stateVersion}`,
      expected,
      nextState,
      events,
    );
    current = nextState;
  }
  return current;
}

export { botId, JHABBU_GUJARATI_FAMILY };
