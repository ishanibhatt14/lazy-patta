import type { Card, PlayerId, Rank, Suit } from '@lazy-patta/game-contracts';

export type LalSattiPhase = 'in_progress' | 'completed';
export type LalSattiPlayerStatus = 'active' | 'finished';
export type LalSattiCompletionReason = 'hand_empty' | 'blocked';

export interface LalSattiRulePack {
  readonly id: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly opening: 'all-sevens';
  readonly passRule: 'blocked-only';
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

export interface LalSattiTableauLane {
  readonly suit: Suit;
  readonly cards: readonly Card[];
  readonly lowRank: Rank;
  readonly highRank: Rank;
}
