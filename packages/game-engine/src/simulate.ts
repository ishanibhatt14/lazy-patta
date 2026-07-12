import type {
  GameEvent,
  GameResult,
  GameState,
  PlayerId,
  PublicSnapshot,
  Rng,
  RulePack,
} from '@lazy-patta/game-contracts';

import { chooseBotAction, type BotStrategy } from './bot';
import { GadhaChorEngine } from './gadha-chor-engine';

/** Default safety bound on accepted actions before a run is declared stuck. */
export const DEFAULT_MAX_TURNS = 10_000;

/** Mixed into `seed` to derive an independent bot-decision RNG stream. */
const BOT_STREAM_SALT = 0x9e3779b9;

/**
 * Options for a full-game simulation. The PRNG is injected via `createRng` so
 * the engine stays pure and boundary-clean: production callers pass a
 * crypto-backed factory, tests pass a seeded one. `seed` deterministically
 * derives two independent streams — one for the shuffle, one for bot decisions.
 */
export interface SimulateGameOptions {
  readonly playerCount: number;
  readonly seed: number;
  readonly rulePack: RulePack;
  /** Builds a fresh Rng for a given stream seed. Must be deterministic in seed. */
  readonly createRng: (streamSeed: number) => Rng;
  /** Safety bound on accepted actions (default {@link DEFAULT_MAX_TURNS}). */
  readonly maxTurns?: number;
  /** When true, the full ordered event trace is returned for debugging. */
  readonly captureEvents?: boolean;
  /** Bot policy for every seat (default `'random-valid'`). */
  readonly strategy?: BotStrategy;
  /** Optional explicit player ids; defaults to `p1..pN`. */
  readonly players?: readonly PlayerId[];
}

/** Terminal (or turn-limited) outcome of a simulated game. */
export interface SimulationResult {
  readonly seed: number;
  readonly rulePackId: string;
  readonly playerCount: number;
  readonly players: readonly PlayerId[];
  /** Number of accepted actions applied (one `reduce` each). */
  readonly turns: number;
  /** True if the game reached a terminal state within `maxTurns`. */
  readonly completed: boolean;
  /** True if the run stopped because it hit the `maxTurns` safety bound. */
  readonly reachedTurnLimit: boolean;
  readonly result: GameResult | null;
  readonly finalState: GameState;
  readonly publicSnapshot: PublicSnapshot;
  /** Present only when `captureEvents` was set. */
  readonly events?: readonly GameEvent[];
}

function defaultPlayers(count: number): PlayerId[] {
  return Array.from({ length: count }, (_, i) => `p${i + 1}`);
}

/**
 * Run a complete Gadha Chor game with all-bot play and return the terminal
 * result. Deterministic: identical options yield an identical result. No real
 * delays, no I/O — the caller owns pacing and persistence.
 */
export function simulateGame(options: SimulateGameOptions): SimulationResult {
  const {
    playerCount,
    seed,
    rulePack,
    createRng,
    maxTurns = DEFAULT_MAX_TURNS,
    captureEvents = false,
    strategy = 'random-valid',
  } = options;

  const players = options.players ?? defaultPlayers(playerCount);
  const engine = new GadhaChorEngine();
  const shuffleRng = createRng(seed);
  const botRng = createRng((seed ^ BOT_STREAM_SALT) >>> 0);

  let state = engine.init(rulePack, players, shuffleRng);
  const trace: GameEvent[] = [];

  let turns = 0;
  while (!engine.isComplete(state) && turns < maxTurns) {
    const actorId = state.players[state.currentPlayerIndex]!.id;
    const validActions = engine.legalMoves(state, actorId);
    const { action } = chooseBotAction({
      gameState: state,
      actorId,
      validActions,
      rng: botRng,
      strategy,
    });
    const { state: next, events } = engine.reduce(state, action);
    if (captureEvents) trace.push(...events);
    state = next;
    turns += 1;
  }

  const completed = engine.isComplete(state);
  const result: SimulationResult = {
    seed,
    rulePackId: rulePack.id,
    playerCount: players.length,
    players,
    turns,
    completed,
    reachedTurnLimit: !completed && turns >= maxTurns,
    result: engine.result(state),
    finalState: state,
    publicSnapshot: engine.projectPublic(state),
  };
  return captureEvents ? { ...result, events: trace } : result;
}
