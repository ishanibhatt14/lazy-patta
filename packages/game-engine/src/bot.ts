import type { GameAction, GameState, PlayerId, Rng } from '@lazy-patta/game-contracts';

/**
 * Supported bot policies. MVP ships only `random-valid` — Gadha Chor is a
 * chance-driven game (see docs/04-games/gadha-chor.md §6), so the bot picks
 * uniformly among the server-issued legal actions rather than faking strategy.
 * New strategies (e.g. light card-counting) can be added here without changing
 * the decision boundary.
 */
export type BotStrategy = 'random-valid';

export const BOT_STRATEGIES: readonly BotStrategy[] = ['random-valid'];

/** Stable, typed error codes for an invalid bot turn. */
export type BotErrorCode =
  | 'GAME_COMPLETED'
  | 'NOT_ACTORS_TURN'
  | 'NO_VALID_ACTIONS'
  | 'INVALID_ACTION_ACTOR'
  | 'INVALID_TARGET'
  | 'UNKNOWN_STRATEGY';

/** A decision failure the orchestration layer can branch on by `code`. */
export class BotError extends Error {
  readonly code: BotErrorCode;
  constructor(code: BotErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'BotError';
    this.code = code;
  }
}

export function isBotError(value: unknown): value is BotError {
  return value instanceof BotError;
}

/**
 * Input for a single bot decision. `validActions` is the set of currently legal
 * actions (produced by the engine's `legalMoves`); the bot selects only from it.
 * `rng` is injected — the bot never touches `Math.random`, time, or I/O.
 */
export interface BotDecisionRequest {
  readonly gameState: GameState;
  readonly actorId: PlayerId;
  readonly validActions: readonly GameAction[];
  readonly rng: Rng;
  /** Defaults to `'random-valid'`. */
  readonly strategy?: BotStrategy;
}

/**
 * The chosen action plus the strategy that produced it. The engine/server
 * orchestration layer decides *when* to execute it (and applies humanized
 * pacing); the pure engine never schedules or delays.
 */
export interface BotDecision {
  readonly strategy: BotStrategy;
  readonly action: GameAction;
}

function activePlayer(state: GameState, id: PlayerId): boolean {
  return state.players.some((p) => p.id === id && p.status === 'active');
}

/**
 * Pick a valid action for a bot actor. Pure and deterministic under `rng`.
 *
 * Guarantees enforced here (defense in depth over the caller):
 * - throws unless it is genuinely `actorId`'s turn in an in-progress game;
 * - selects strictly from `validActions`;
 * - rejects any candidate whose `actor` is not the bot, or whose `from` is not
 *   an active opponent — so a bot can never act out of turn or target an
 *   unavailable position.
 */
export function chooseBotAction(request: BotDecisionRequest): BotDecision {
  const { gameState, actorId, validActions, rng } = request;
  const strategy = request.strategy ?? 'random-valid';

  if (strategy !== 'random-valid') {
    throw new BotError('UNKNOWN_STRATEGY', `Unknown bot strategy: ${String(strategy)}`);
  }
  if (gameState.phase === 'completed') {
    throw new BotError('GAME_COMPLETED', 'Cannot choose a bot action for a completed game');
  }

  const current = gameState.players[gameState.currentPlayerIndex];
  if (!current || current.id !== actorId || current.status !== 'active') {
    throw new BotError('NOT_ACTORS_TURN', `It is not ${actorId}'s turn`);
  }
  if (validActions.length === 0) {
    throw new BotError('NO_VALID_ACTIONS', `No valid actions for ${actorId}`);
  }

  for (const action of validActions) {
    if (action.actor !== actorId) {
      throw new BotError('INVALID_ACTION_ACTOR', `Action actor ${action.actor} is not ${actorId}`);
    }
    if (action.from === actorId || !activePlayer(gameState, action.from)) {
      throw new BotError('INVALID_TARGET', `Target ${action.from} is not an active opponent`);
    }
  }

  const index = Math.floor(rng.next() * validActions.length);
  return { strategy, action: validActions[index]! };
}
