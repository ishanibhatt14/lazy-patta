import type {
  GameAction,
  GameEvent,
  GameResult,
  GameState,
  PlayerId,
  Rng,
} from '@lazy-patta/game-contracts';
import { GadhaChorEngine } from '@lazy-patta/game-engine';
import type { SupabaseClient } from '@supabase/supabase-js';

import { CLASSIC_GULAM_CHOR } from '../computer-game/rule-pack';

/**
 * Server-authoritative Gadha Chor runtime (ADR-0010). The pure engine is the
 * sole rule authority; this module runs it with a crypto RNG and commits each
 * step through the `SECURITY DEFINER` persistence RPCs (migration 0006), which
 * hold the row lock, version guard, and idempotency. Nothing here trusts client
 * input beyond an opaque position token, and no hidden card ever leaves the
 * server except as a player's own private hand (written by the RPC, read via RLS).
 */

const engine = new GadhaChorEngine();
const BOT_PREFIX = 'bot:';

/** Player ids: a human's is their auth user uuid; a bot's is `bot:<seatIndex>`. */
export function botId(seatIndex: number): string {
  return `${BOT_PREFIX}${seatIndex}`;
}

export function isBotId(id: PlayerId): boolean {
  return id.startsWith(BOT_PREFIX);
}

/** Crypto-backed randomness for the deal and bot moves (never Math.random). */
function cryptoRng(): Rng {
  return {
    next(): number {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      return buffer[0]! / 0x1_0000_0000;
    },
  };
}

/**
 * `engine.init` marks every player `isBot: false`; re-derive the flag from the id
 * convention so bot detection survives a reload from persisted state. Bots hold
 * no `game_private_hands` row (no user id), so their hands live only in the
 * server-only authority state.
 */
function withBotFlags(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, isBot: isBotId(p.id) })),
  };
}

function humanHands(state: GameState): { user_id: string; hand: readonly unknown[] }[] {
  return state.players.filter((p) => !isBotId(p.id)).map((p) => ({ user_id: p.id, hand: p.hand }));
}

function statusFor(state: GameState): 'active' | 'complete' {
  return engine.isComplete(state) ? 'complete' : 'active';
}

function resultFor(state: GameState): GameResult | null {
  return engine.isComplete(state) ? engine.result(state) : null;
}

/**
 * Raised when a concurrent action already advanced the version. The RPC signals
 * this with SQLSTATE 'PT409' (PostgREST status-override → HTTP 409). We
 * deliberately avoid 40001 there: PostgREST auto-retries serialization failures,
 * and this deterministic conflict would otherwise loop until timeout.
 */
export class VersionConflictError extends Error {
  constructor(message = 'version conflict') {
    super(message);
    this.name = 'VersionConflictError';
  }
}

function isVersionConflict(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === 'PT409' || (error.message ?? '').includes('version conflict');
}

/** Build the initial authoritative state for an ordered set of player ids. */
export function initialState(playerIds: readonly PlayerId[]): GameState {
  return withBotFlags(engine.init(CLASSIC_GULAM_CHOR, playerIds, cryptoRng()));
}

/**
 * Persist the opening deal atomically (flip room to in_progress, seed the game,
 * hands, and events). Returns the new game id.
 */
export async function persistStart(
  admin: SupabaseClient,
  roomId: string,
  state: GameState,
): Promise<string> {
  const { data, error } = await admin.rpc('start_game', {
    p_room_id: roomId,
    p_public_snapshot: engine.projectPublic(state),
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
  nextState: GameState,
  events: readonly GameEvent[],
): Promise<void> {
  const { error } = await admin.rpc('commit_game_action', {
    p_game_id: gameId,
    p_actor: actor,
    p_client_action_id: clientActionId,
    p_expected_version: expectedVersion,
    p_public_snapshot: engine.projectPublic(nextState),
    p_authority_state: nextState,
    p_hands: humanHands(nextState),
    p_events: events,
    p_status: statusFor(nextState),
    p_result: resultFor(nextState),
  });
  if (isVersionConflict(error)) throw new VersionConflictError();
  if (error) throw error;
}

/** Whose turn it is, or null if the game is over. */
export function currentActor(state: GameState): PlayerId | null {
  if (engine.isComplete(state)) return null;
  return state.players[state.currentPlayerIndex]?.id ?? null;
}

/**
 * Apply a validated human draw and commit it. Throws on an unknown/stale token
 * (caller maps to 400) or a version conflict (caller maps to 409).
 */
export async function applyHumanDraw(
  admin: SupabaseClient,
  gameId: string,
  state: GameState,
  actor: PlayerId,
  positionToken: string,
): Promise<GameState> {
  const action = engine
    .legalMoves(state, actor)
    .find((candidate: GameAction) => candidate.positionToken === positionToken);
  if (!action) throw new Error('INVALID_POSITION_TOKEN');

  const expected = state.stateVersion;
  const { state: next, events } = engine.reduce(state, action);
  const nextState = withBotFlags(next);
  await commitStep(admin, gameId, actor, `pt:${positionToken}`, expected, nextState, events);
  return nextState;
}

/**
 * Play out consecutive bot turns server-side until it is a human's turn again or
 * the game ends. Each bot step is its own committed, version-bumped action —
 * same authority path as a human draw (multiplayer-authority.md §Bots).
 */
export async function advanceBots(
  admin: SupabaseClient,
  gameId: string,
  state: GameState,
): Promise<GameState> {
  const rng = cryptoRng();
  let current = state;
  // Hard bound: a 6-hand game empties in far fewer steps; this only guards bugs.
  for (let guard = 0; guard < 1000; guard += 1) {
    const actor = currentActor(current);
    if (!actor || !isBotId(actor)) break;
    const action = engine.botMove(current, actor, rng);
    if (!action) break;
    const expected = current.stateVersion;
    const { state: next, events } = engine.reduce(current, action);
    const nextState = withBotFlags(next);
    await commitStep(
      admin,
      gameId,
      actor,
      `bot:v${nextState.stateVersion}`,
      expected,
      nextState,
      events,
    );
    current = nextState;
  }
  return current;
}
