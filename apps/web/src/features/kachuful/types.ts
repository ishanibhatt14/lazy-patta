import type { BotDifficulty, Card, Suit } from '@lazy-patta/game-contracts';
import type { KachufulState, KachufulTrump } from '@lazy-patta/kachuful-engine';
import type { Locale, MessageKey, MessageValues } from '@lazy-patta/localization';

/** Coarse controller phase; the fine engine sub-phase is derived in the view. */
export type KachufulComputerPhase = 'setup' | 'playing' | 'result';

/** Fine-grained phase surfaced to the UI. */
export type KachufulViewPhase = 'setup' | 'bidding' | 'playing' | 'roundScored' | 'result';

export interface KachufulSeatView {
  readonly id: string;
  readonly name: string;
  readonly avatarInitial: string;
  readonly isSelf: boolean;
  readonly isActive: boolean;
  readonly isDealer: boolean;
  readonly bid: number | null;
  readonly tricksWon: number;
  readonly totalScore: number;
  readonly cardCount: number;
}

export interface KachufulTrickCardView {
  readonly playerId: string;
  readonly playerName: string;
  readonly card: Card;
}

export interface KachufulScoreRow {
  readonly playerId: string;
  readonly playerName: string;
  readonly totalScore: number;
  readonly isSelf: boolean;
}

export interface KachufulViewEvent {
  readonly id: string;
  readonly messageKey: MessageKey;
  readonly values?: MessageValues;
}

export interface KachufulResultView {
  readonly winnerIds: readonly string[];
  readonly winnerNames: readonly string[];
  readonly isSelfWinner: boolean;
  readonly scoreboard: readonly KachufulScoreRow[];
}

export interface KachufulControllerState {
  readonly phase: KachufulComputerPhase;
  readonly playerCount: number;
  readonly humanName: string;
  readonly difficulty: BotDifficulty;
  readonly locale: Locale;
  readonly reducedMotion: boolean;
  readonly game: KachufulState | null;
  readonly events: readonly KachufulViewEvent[];
  readonly hasHydratedSession: boolean;
  readonly seq: number;
}

export interface KachufulViewState {
  readonly phase: KachufulViewPhase;
  readonly playerCount: number;
  readonly humanName: string;
  readonly difficulty: BotDifficulty;
  readonly canStart: boolean;
  readonly locale: Locale;
  readonly reducedMotion: boolean;
  readonly roundNumber: number;
  readonly totalRounds: number;
  readonly handSize: number;
  readonly trump: KachufulTrump;
  readonly trumpLabelKey: MessageKey;
  readonly seats: readonly KachufulSeatView[];
  readonly ownHand: readonly Card[];
  readonly ledSuit: Suit | null;
  readonly currentTrick: readonly KachufulTrickCardView[];
  readonly isHumanTurn: boolean;
  readonly legalBids: readonly number[];
  readonly forbiddenBid: number | null;
  readonly playableCardIds: readonly string[];
  readonly currentPlayerName: string;
  readonly instructionKey: MessageKey;
  readonly instructionValues?: MessageValues;
  readonly statusKey: MessageKey;
  readonly statusValues?: MessageValues;
  readonly events: readonly KachufulViewEvent[];
  readonly scoreboard: readonly KachufulScoreRow[];
  readonly result: KachufulResultView | null;
}

export type KachufulIntent =
  | { readonly type: 'setPlayerCount'; readonly playerCount: number }
  | { readonly type: 'setHumanName'; readonly humanName: string }
  | { readonly type: 'setDifficulty'; readonly difficulty: BotDifficulty }
  | { readonly type: 'setLocale'; readonly locale: Locale }
  | { readonly type: 'hydrateSession'; readonly humanName?: string }
  | { readonly type: 'toggleReducedMotion' }
  | { readonly type: 'start' }
  | { readonly type: 'placeBid'; readonly bid: number }
  | { readonly type: 'playCard'; readonly cardId: string }
  | { readonly type: 'nextRound' }
  | { readonly type: 'botStep' }
  | { readonly type: 'rematch' };
