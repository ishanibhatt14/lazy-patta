import type { Card, PlayerId, Rank, Suit } from '@lazy-patta/game-contracts';

export type LalSattiPhase = 'in_progress' | 'completed';
export type LalSattiPlayerStatus = 'active' | 'finished';
export type LalSattiCompletionReason = 'hand_empty';
export type LalSattiOpeningRule = 'classic-seven-of-hearts' | 'all-sevens-open';

export interface LalSattiRulePack {
  readonly id: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly opening: LalSattiOpeningRule;
  readonly passRule: 'blocked-only';
  readonly blockedCycle: 'invariant-error';
  readonly scoring: 'win-only';
}

export interface LalSattiPlayerState {
  readonly id: PlayerId;
  readonly hand: readonly Card[];
  readonly status: LalSattiPlayerStatus;
  readonly isBot: boolean;
}

export type LalSattiTableau = Readonly<Record<Suit, readonly Card[]>>;

export interface LalSattiState {
  readonly rulePack: LalSattiRulePack;
  readonly players: readonly LalSattiPlayerState[];
  readonly currentPlayerIndex: number;
  readonly tableau: LalSattiTableau;
  readonly phase: LalSattiPhase;
  readonly stateVersion: number;
  readonly consecutivePasses: number;
  readonly winnerIds: readonly PlayerId[];
  readonly completionReason: LalSattiCompletionReason | null;
}

export type LalSattiAction =
  | { readonly type: 'PLAY_CARD'; readonly actor: PlayerId; readonly cardId: string }
  | { readonly type: 'PASS'; readonly actor: PlayerId };

export type LalSattiEvent =
  | {
      readonly type: 'CARD_PLAYED';
      readonly actor: PlayerId;
      readonly card: Card;
      readonly stateVersion: number;
    }
  | { readonly type: 'PLAYER_PASSED'; readonly actor: PlayerId; readonly stateVersion: number }
  | { readonly type: 'PLAYER_FINISHED'; readonly actor: PlayerId; readonly stateVersion: number }
  | {
      readonly type: 'TURN_ADVANCED';
      readonly actor: PlayerId | null;
      readonly stateVersion: number;
    }
  | {
      readonly type: 'GAME_COMPLETED';
      readonly winnerIds: readonly PlayerId[];
      readonly reason: LalSattiCompletionReason;
      readonly stateVersion: number;
    };

export interface LalSattiResult {
  readonly winnerIds: readonly PlayerId[];
  readonly reason: LalSattiCompletionReason;
  readonly remainingCards: Readonly<Record<PlayerId, number>>;
}

export interface LalSattiBlockedCycleDiagnostic {
  readonly code: 'BLOCKED_CYCLE';
  readonly stateVersion: number;
  readonly currentPlayerId: PlayerId;
  readonly activePlayerCount: number;
  readonly consecutivePasses: number;
  readonly openSuits: readonly Suit[];
}

export class LalSattiInvariantError extends Error {
  readonly diagnostic: LalSattiBlockedCycleDiagnostic;

  constructor(diagnostic: LalSattiBlockedCycleDiagnostic) {
    super(diagnostic.code);
    this.name = 'LalSattiInvariantError';
    this.diagnostic = diagnostic;
  }
}

export interface LalSattiTableauLane {
  readonly suit: Suit;
  readonly cards: readonly Card[];
  readonly lowRank: Rank;
  readonly highRank: Rank;
}
