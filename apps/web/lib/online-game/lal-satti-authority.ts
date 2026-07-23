import type { Card, PlayerId, Rng } from '@lazy-patta/game-contracts';
import {
  chooseLalSattiBotAction,
  LalSattiEngine,
  LAL_SATTI_ALL_SEVENS_OPEN,
  LAL_SATTI_CLASSIC,
  type LalSattiAction,
  type LalSattiEvent,
  type LalSattiPlayerStatus,
  type LalSattiResult,
  type LalSattiRulePack,
  type LalSattiState,
  type LalSattiTableau,
} from '@lazy-patta/lal-satti-engine';
import type { SupabaseClient } from '@supabase/supabase-js';

import { botId, isBotId, VersionConflictError } from './authority';

const engine = new LalSattiEngine();

export interface LalSattiPublicPlayerView {
  readonly id: PlayerId;
  readonly handCount: number;
  readonly status: LalSattiPlayerStatus;
  readonly isBot: boolean;
}

export interface LalSattiPublicSnapshot {
  readonly gameKey: 'lal_satti';
  readonly rulePackId: string;
  readonly players: readonly LalSattiPublicPlayerView[];
  readonly currentPlayerId: PlayerId | null;
  readonly phase: LalSattiState['phase'];
  readonly stateVersion: number;
  readonly tableau: LalSattiTableau;
}

export type LalSattiClientAction =
  { readonly type: 'PLAY_CARD'; readonly cardId: string } | { readonly type: 'PASS' };

function cryptoRng(): Rng {
  return {
    next(): number {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      return buffer[0]! / 0x1_0000_0000;
    },
  };
}

function humanHands(state: LalSattiState): { user_id: string; hand: readonly Card[] }[] {
  return state.players.filter((p) => !isBotId(p.id)).map((p) => ({ user_id: p.id, hand: p.hand }));
}

function publicSnapshot(state: LalSattiState): LalSattiPublicSnapshot {
  return {
    gameKey: 'lal_satti',
    rulePackId: state.rulePack.id,
    players: state.players.map((player) => ({
      id: player.id,
      handCount: player.hand.length,
      status: player.status,
      isBot: player.isBot,
    })),
    currentPlayerId: currentLalSattiActor(state),
    phase: state.phase,
    stateVersion: state.stateVersion,
    tableau: state.tableau,
  };
}

function statusFor(state: LalSattiState): 'active' | 'complete' {
  return engine.isComplete(state) ? 'complete' : 'active';
}

function resultFor(state: LalSattiState): LalSattiResult | null {
  return engine.isComplete(state) ? engine.result(state) : null;
}

function withBotFlags(state: LalSattiState): LalSattiState {
  return {
    ...state,
    players: state.players.map((player) => ({ ...player, isBot: isBotId(player.id) })),
  };
}

function isVersionConflict(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === 'PT409' || (error.message ?? '').includes('version conflict');
}

const LAL_SATTI_RULE_PACKS: readonly LalSattiRulePack[] = [
  LAL_SATTI_CLASSIC,
  LAL_SATTI_ALL_SEVENS_OPEN,
];

/** Resolve a room's persisted preset id to a rule pack (default: classic). */
export function lalSattiRulePackFor(presetId: string | null | undefined): LalSattiRulePack {
  return LAL_SATTI_RULE_PACKS.find((pack) => pack.id === presetId) ?? LAL_SATTI_CLASSIC;
}

export function initialLalSattiState(
  playerIds: readonly PlayerId[],
  rulePack: LalSattiRulePack = LAL_SATTI_CLASSIC,
): LalSattiState {
  const botIds = playerIds.filter(isBotId);
  return withBotFlags(engine.init(playerIds, cryptoRng(), rulePack, botIds));
}

export async function persistLalSattiStart(
  admin: SupabaseClient,
  roomId: string,
  state: LalSattiState,
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
  nextState: LalSattiState,
  events: readonly LalSattiEvent[],
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

export function currentLalSattiActor(state: LalSattiState): PlayerId | null {
  if (engine.isComplete(state)) return null;
  return state.players[state.currentPlayerIndex]?.id ?? null;
}

function toEngineAction(actor: PlayerId, action: LalSattiClientAction): LalSattiAction {
  if (action.type === 'PASS') return { type: 'PASS', actor };
  return { type: 'PLAY_CARD', actor, cardId: action.cardId };
}

function sameAction(a: LalSattiAction, b: LalSattiAction): boolean {
  if (a.type !== b.type) return false;
  if (a.actor !== b.actor) return false;
  return a.type === 'PASS'
    ? true
    : a.cardId === (b as Extract<LalSattiAction, { type: 'PLAY_CARD' }>).cardId;
}

export async function applyHumanLalSattiAction(
  admin: SupabaseClient,
  gameId: string,
  state: LalSattiState,
  actor: PlayerId,
  clientAction: LalSattiClientAction,
  clientActionId: string,
): Promise<LalSattiState> {
  const action = toEngineAction(actor, clientAction);
  const legal = engine
    .legalActions(state, actor)
    .some((candidate) => sameAction(candidate, action));
  if (!legal) throw new Error('INVALID_LAL_SATTI_ACTION');

  const expected = state.stateVersion;
  const { state: next, events } = engine.reduce(state, action);
  const nextState = withBotFlags(next);
  await commitStep(admin, gameId, actor, clientActionId, expected, nextState, events);
  return nextState;
}

export async function advanceLalSattiBots(
  admin: SupabaseClient,
  gameId: string,
  state: LalSattiState,
): Promise<LalSattiState> {
  let current = state;
  for (let guard = 0; guard < 1000; guard += 1) {
    const actor = currentLalSattiActor(current);
    if (!actor || !isBotId(actor)) break;
    const decision = chooseLalSattiBotAction(current, actor);
    if (!decision) break;
    const expected = current.stateVersion;
    const { state: next, events } = engine.reduce(current, decision.action);
    const nextState = withBotFlags(next);
    await commitStep(
      admin,
      gameId,
      actor,
      `bot:lal-satti:v${nextState.stateVersion}`,
      expected,
      nextState,
      events,
    );
    current = nextState;
  }
  return current;
}

export { botId, LAL_SATTI_CLASSIC };
