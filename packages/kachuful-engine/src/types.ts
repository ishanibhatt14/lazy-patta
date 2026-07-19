import type { Card, PlayerId, Suit } from '@lazy-patta/game-contracts';

/** The trump for a round is a suit, or `no-trump` when no suit trumps. */
export type KachufulTrump = Suit | 'no-trump';

export type KachufulPhase = 'bidding' | 'playing' | 'round_scored' | 'match_complete';

export interface KachufulRulePack {
  readonly id: 'family-descending-v1';
  readonly minPlayers: number;
  readonly maxPlayers: number;
  /**
   * Hand size for round `i` (0-based) is `handSizeSchedule[i]`. The schedule
   * length is the number of rounds in a match. It is generated per player count
   * so the deck always fits (see {@link buildHandSizeSchedule}).
   */
  readonly maxHandSize: number;
  /** Trump for round `i` is `trumpRotation[i % trumpRotation.length]`. */
  readonly trumpRotation: readonly KachufulTrump[];
  /**
   * When true, the dealer (last bidder) may not choose a bid that makes the
   * table's total bids equal the number of tricks — the classic "hook" rule.
   */
  readonly hookRule: boolean;
  /** Points awarded for an exact bid, before the per-trick bonus. */
  readonly exactBidBonus: number;
  /** Extra points per trick bid, awarded only on an exact bid. */
  readonly perTrickBonus: number;
}

export interface KachufulPlayerState {
  readonly id: PlayerId;
  readonly seat: number;
  readonly hand: readonly Card[];
  readonly isBot: boolean;
  /** Tricks this player predicted for the current round; null until bid. */
  readonly bid: number | null;
  readonly tricksWon: number;
  readonly roundScore: number;
  readonly totalScore: number;
}

export interface KachufulTrickCard {
  readonly playerId: PlayerId;
  readonly card: Card;
  readonly sequence: number;
}

export interface KachufulRoundSummary {
  readonly roundNumber: number;
  readonly handSize: number;
  readonly trump: KachufulTrump;
  readonly bids: Readonly<Record<PlayerId, number>>;
  readonly tricksWon: Readonly<Record<PlayerId, number>>;
  readonly roundScores: Readonly<Record<PlayerId, number>>;
  readonly totalScores: Readonly<Record<PlayerId, number>>;
}

export interface KachufulState {
  readonly rulePack: KachufulRulePack;
  readonly players: readonly KachufulPlayerState[];
  /**
   * All hands for every round, dealt once at init: `deals[roundIndex][seat]`.
   * Keeps `reduce` pure — no rng is needed to advance to the next round.
   */
  readonly deals: readonly (readonly (readonly Card[])[])[];
  readonly handSizeSchedule: readonly number[];
  readonly roundNumber: number;
  readonly totalRounds: number;
  readonly handSize: number;
  readonly trump: KachufulTrump;
  readonly dealerIndex: number;
  readonly currentPlayerIndex: number;
  readonly ledSuit: Suit | null;
  readonly currentTrick: readonly KachufulTrickCard[];
  /** Cards played into resolved tricks this round (for conservation checks). */
  readonly playedPile: readonly Card[];
  readonly tricksPlayed: number;
  readonly phase: KachufulPhase;
  readonly stateVersion: number;
  readonly roundHistory: readonly KachufulRoundSummary[];
  readonly matchWinnerIds: readonly PlayerId[];
}

export type KachufulAction =
  | {
      readonly type: 'PLACE_BID';
      readonly actor: PlayerId;
      readonly bid: number;
      readonly expectedVersion?: number;
      readonly clientActionId?: string;
    }
  | {
      readonly type: 'PLAY_CARD';
      readonly actor: PlayerId;
      readonly cardId: string;
      readonly expectedVersion?: number;
      readonly clientActionId?: string;
    }
  | {
      readonly type: 'START_NEXT_ROUND';
      readonly actor: PlayerId;
      readonly expectedVersion?: number;
      readonly clientActionId?: string;
    };

export type KachufulEvent =
  | {
      readonly type: 'BID_PLACED';
      readonly actor: PlayerId;
      readonly bid: number;
      readonly stateVersion: number;
    }
  | {
      readonly type: 'BIDDING_COMPLETE';
      readonly leader: PlayerId;
      readonly stateVersion: number;
    }
  | {
      readonly type: 'CARD_PLAYED';
      readonly actor: PlayerId;
      readonly card: Card;
      readonly stateVersion: number;
    }
  | {
      readonly type: 'TRICK_WON';
      readonly winner: PlayerId;
      readonly cardCount: number;
      readonly stateVersion: number;
    }
  | {
      readonly type: 'TURN_ADVANCED';
      readonly actor: PlayerId | null;
      readonly stateVersion: number;
    }
  | {
      readonly type: 'ROUND_SCORED';
      readonly roundNumber: number;
      readonly stateVersion: number;
    }
  | {
      readonly type: 'ROUND_DEALT';
      readonly roundNumber: number;
      readonly handSize: number;
      readonly trump: KachufulTrump;
      readonly leader: PlayerId;
      readonly stateVersion: number;
    }
  | {
      readonly type: 'MATCH_COMPLETE';
      readonly winners: readonly PlayerId[];
      readonly stateVersion: number;
    };

export interface KachufulResult {
  readonly winnerIds: readonly PlayerId[];
  readonly totalScores: Readonly<Record<PlayerId, number>>;
  readonly rounds: readonly KachufulRoundSummary[];
}
