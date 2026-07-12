import type { Card } from './cards';
import type { RulePack } from './rule-pack';

export type PlayerId = string;

export type PlayerStatus = 'active' | 'finished';

export interface PlayerState {
  readonly id: PlayerId;
  readonly hand: readonly Card[];
  readonly status: PlayerStatus;
  readonly isBot: boolean;
}

export type GamePhase = 'in_progress' | 'completed';

/**
 * Full authoritative game state. Held server-side; never sent wholesale to a
 * client (clients receive a PublicSnapshot + their own PrivateView).
 */
export interface GameState {
  readonly rulePack: RulePack;
  readonly players: readonly PlayerState[];
  /** Index into `players` whose turn it is. */
  readonly currentPlayerIndex: number;
  readonly phase: GamePhase;
  readonly stateVersion: number;
}

/** Public, shareable projection — hand *contents* are hidden, counts are not. */
export interface PublicPlayerView {
  readonly id: PlayerId;
  readonly handCount: number;
  readonly status: PlayerStatus;
  readonly isBot: boolean;
}

export interface PublicSnapshot {
  readonly rulePackId: string;
  readonly players: readonly PublicPlayerView[];
  readonly currentPlayerId: PlayerId | null;
  readonly phase: GamePhase;
  readonly stateVersion: number;
}

/** Per-player projection: the viewer sees their own hand, others' counts only. */
export interface PrivateView {
  readonly viewer: PlayerId;
  readonly hand: readonly Card[];
  readonly opponents: readonly PublicPlayerView[];
  readonly currentPlayerId: PlayerId | null;
  readonly phase: GamePhase;
  readonly stateVersion: number;
}

export interface GameResult {
  /** Everyone who emptied their hand. */
  readonly winners: readonly PlayerId[];
  /** The last holder of the odd removed-rank card — the "Gadha Chor". */
  readonly loser: PlayerId;
}
