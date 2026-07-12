import type { Card } from '@lazy-patta/game-contracts';
import type { Locale, MessageKey } from '@lazy-patta/localization';

export type SeatPosition = 'bottom' | 'top' | 'left' | 'right';

export type ComputerGamePhase =
  'setup' | 'dealing' | 'initialPairs' | 'playing' | 'result' | 'error';

export interface ComputerGameSeat {
  readonly id: string;
  /** Bot proper noun; empty for the human seat (rendered as localized "You"). */
  readonly name: string;
  readonly avatarInitial: string;
  readonly cardCount: number;
  readonly isSelf: boolean;
  readonly isActive: boolean;
  readonly isFinished: boolean;
  readonly position: SeatPosition;
}

/** A face-down opponent card the human may draw on their turn. */
export interface HiddenCardSlot {
  readonly ownerId: string;
  readonly ownerName: string;
  /** Opaque server-style token — never a card identity (ADR-0008). */
  readonly positionToken: string;
  readonly displayIndex: number;
  readonly isSelectable: boolean;
}

/**
 * The most recent resolved draw, projected safe for the human viewer. Card
 * identities are populated ONLY when the human is the drawer (their own cards).
 * Bot draws never carry any card identity.
 */
export interface DrawReveal {
  readonly actorIsSelf: boolean;
  readonly actorName: string;
  readonly targetName: string;
  readonly pairRemoved: boolean;
  readonly drawnCard?: Card;
  readonly matchedCard?: Card;
}

export interface CurrentTurn {
  readonly isSelf: boolean;
  readonly name: string;
  readonly seatId: string | null;
}

export interface ComputerGameResult {
  readonly gadhaChorIsSelf: boolean;
  readonly gadhaChorName: string;
  readonly winnerNames: readonly string[];
}

export interface ComputerGameViewEvent {
  readonly id: string;
  readonly messageKey: MessageKey;
  readonly values?: Readonly<Record<string, string | number>>;
}

export interface ComputerGameSettings {
  /** Total seats including the human, in [2, 6]. */
  readonly playerCount: number;
  readonly locale: Locale;
  readonly reducedMotion: boolean;
  readonly soundEnabled: boolean;
}

/**
 * Render-safe projection of the game. Deliberately carries NO opponent hand
 * contents — the authoritative `GameState` never reaches the DOM (see
 * view-model.ts). Components format `*Key`/`*Values` through the active locale.
 */
export interface ComputerGameViewState {
  readonly phase: ComputerGamePhase;
  readonly settings: ComputerGameSettings;
  readonly seats: readonly ComputerGameSeat[];
  readonly ownHand: readonly Card[];
  readonly hiddenCards: readonly HiddenCardSlot[];
  readonly currentTurn: CurrentTurn;
  readonly draw?: DrawReveal;
  readonly result?: ComputerGameResult;
  readonly instructionKey: MessageKey;
  readonly instructionValues?: Readonly<Record<string, string | number>>;
  readonly statusKey: MessageKey;
  readonly statusValues?: Readonly<Record<string, string | number>>;
  readonly events: readonly ComputerGameViewEvent[];
  readonly recoverableError: boolean;
}

export type ComputerGameIntent =
  | { readonly type: 'setPlayerCount'; readonly playerCount: number }
  | { readonly type: 'setLocale'; readonly locale: Locale }
  | { readonly type: 'toggleReducedMotion' }
  | { readonly type: 'toggleSound' }
  | { readonly type: 'start' }
  | { readonly type: 'introAdvance' }
  | { readonly type: 'chooseHiddenCard'; readonly positionToken: string }
  | { readonly type: 'botStep' }
  | { readonly type: 'clearDraw' }
  | { readonly type: 'rematch' }
  | { readonly type: 'recover' };
