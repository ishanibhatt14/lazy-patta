import type { GameAction, GameEvent } from './actions';
import type { Rng } from './rng';
import type { RulePack } from './rule-pack';
import type {
  GameResult,
  GameState,
  PlayerId,
  PrivateView,
  PublicSnapshot,
} from './state';

/**
 * The pure, deterministic engine contract. Implemented in @lazy-patta/game-engine.
 * No I/O, no time, no Math.random — all randomness is injected via Rng.
 */
export interface Engine {
  init(rulePack: RulePack, players: readonly PlayerId[], rng: Rng): GameState;
  legalMoves(state: GameState, actor: PlayerId): GameAction[];
  reduce(state: GameState, action: GameAction): { state: GameState; events: GameEvent[] };
  isComplete(state: GameState): boolean;
  result(state: GameState): GameResult | null;
  botMove(state: GameState, actor: PlayerId, rng: Rng): GameAction | null;
  projectPublic(state: GameState): PublicSnapshot;
  projectPrivate(state: GameState, viewer: PlayerId): PrivateView;
}
