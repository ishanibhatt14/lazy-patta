import type { Card, PlayerId, Suit } from '@lazy-patta/game-contracts';

export type JhabbuPhase = 'first_trick' | 'in_progress' | 'round_complete';
export type JhabbuPlayerStatus = 'active' | 'got_away';
export type JhabbuCompletionReason = 'last_player_with_cards';

export interface JhabbuRulePack {
  readonly id: 'gujarati-family-v1' | 'classic-bhabho-v1';
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly aceOfSpadesStarts: boolean;
  readonly firstTrickAlwaysDiscarded: boolean;
  readonly thullaEndsTrickImmediately: boolean;
  readonly pickupRule: 'highest-led-suit' | 'off-suit-player';
  readonly powerPlayerMustDrawIfEmpty: boolean;
  readonly allowTakeLeftPlayersHand: boolean;
  readonly twoPlayerShootout: boolean;
  readonly scoring: 'finish-order-0-1-2-3' | 'rounds-only';
  readonly matchEnd: {
    readonly type: 'penalty-limit' | 'round-count';
    readonly value: number;
  };
}

export interface JhabbuPlayerState {
  readonly id: PlayerId;
  readonly seat: number;
  readonly hand: readonly Card[];
  readonly status: JhabbuPlayerStatus;
  readonly isBot: boolean;
  readonly finishPosition: number | null;
  readonly penaltyPoints: number;
}

export interface JhabbuTrickCard {
  readonly playerId: PlayerId;
  readonly card: Card;
  readonly sequence: number;
  readonly isThulla: boolean;
}

export interface JhabbuState {
  readonly rulePack: JhabbuRulePack;
  readonly players: readonly JhabbuPlayerState[];
  readonly currentPlayerIndex: number;
  readonly powerPlayerId: PlayerId;
  readonly ledSuit: Suit | null;
  readonly currentTrick: readonly JhabbuTrickCard[];
  readonly wastePile: readonly Card[];
  readonly finishOrder: readonly PlayerId[];
  readonly roundNumber: number;
  readonly phase: JhabbuPhase;
  readonly stateVersion: number;
  readonly loserId: PlayerId | null;
  readonly completionReason: JhabbuCompletionReason | null;
}

export type JhabbuAction =
  | {
      readonly type: 'PLAY_CARD';
      readonly actor: PlayerId;
      readonly cardId: string;
      readonly expectedVersion?: number;
      readonly clientActionId?: string;
    }
  | {
      readonly type: 'DRAW_FROM_WASTE';
      readonly actor: PlayerId;
      readonly expectedVersion?: number;
      readonly clientActionId?: string;
    };

export type JhabbuEvent =
  | {
      readonly type: 'CARD_PLAYED';
      readonly actor: PlayerId;
      readonly card: Card;
      readonly isThulla: boolean;
      readonly stateVersion: number;
    }
  | {
      readonly type: 'FIRST_TRICK_DISCARDED';
      readonly leader: PlayerId;
      readonly cardCount: number;
      readonly stateVersion: number;
    }
  | {
      readonly type: 'TRICK_DISCARDED';
      readonly winner: PlayerId;
      readonly cardCount: number;
      readonly stateVersion: number;
    }
  | {
      readonly type: 'THULLA_TRIGGERED';
      readonly actor: PlayerId;
      readonly pickupPlayer: PlayerId;
      readonly cardCount: number;
      readonly stateVersion: number;
    }
  | {
      readonly type: 'PLAYER_PICKED_UP';
      readonly actor: PlayerId;
      readonly cardCount: number;
      readonly stateVersion: number;
    }
  | {
      readonly type: 'PLAYER_GOT_AWAY';
      readonly actor: PlayerId;
      readonly finishPosition: number;
      readonly stateVersion: number;
    }
  | {
      readonly type: 'WASTE_DRAWN';
      readonly actor: PlayerId;
      readonly card: Card;
      readonly stateVersion: number;
    }
  | {
      readonly type: 'TURN_ADVANCED';
      readonly actor: PlayerId | null;
      readonly stateVersion: number;
    }
  | {
      readonly type: 'ROUND_COMPLETED';
      readonly loser: PlayerId;
      readonly stateVersion: number;
    };

export interface JhabbuResult {
  readonly loserId: PlayerId;
  readonly finishOrder: readonly PlayerId[];
  readonly penaltyPoints: Readonly<Record<PlayerId, number>>;
  readonly remainingCards: Readonly<Record<PlayerId, number>>;
}
