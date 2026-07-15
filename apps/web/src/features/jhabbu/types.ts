import type { Card } from '@lazy-patta/game-contracts';
import type {
  JhabbuEvent,
  JhabbuResult,
  JhabbuState,
  JhabbuTrickCard,
} from '@lazy-patta/jhabbu-engine';
import type { Locale, MessageKey, MessageValues } from '@lazy-patta/localization';

export type JhabbuComputerPhase = 'setup' | 'playing' | 'result';

export interface JhabbuSeatView {
  readonly id: string;
  readonly name: string;
  readonly avatarInitial: string;
  readonly isSelf: boolean;
  readonly isActive: boolean;
  readonly isFinished: boolean;
  readonly finishPosition: number | null;
  readonly isPower: boolean;
  readonly cardCount: number;
  readonly penaltyPoints: number;
}

export interface JhabbuViewEvent {
  readonly id: string;
  readonly messageKey: MessageKey;
  readonly values?: MessageValues;
}

export interface JhabbuControllerState {
  readonly phase: JhabbuComputerPhase;
  readonly playerCount: number;
  readonly humanName: string;
  readonly locale: Locale;
  readonly reducedMotion: boolean;
  readonly game: JhabbuState | null;
  readonly events: readonly JhabbuViewEvent[];
  readonly lastEngineEvents: readonly JhabbuEvent[];
  readonly seq: number;
}

export interface JhabbuViewState {
  readonly phase: JhabbuComputerPhase;
  readonly playerCount: number;
  readonly humanName: string;
  readonly canStart: boolean;
  readonly locale: Locale;
  readonly reducedMotion: boolean;
  readonly seats: readonly JhabbuSeatView[];
  readonly ownHand: readonly Card[];
  readonly playableCardIds: readonly string[];
  readonly canDrawFromWaste: boolean;
  readonly currentTrick: readonly JhabbuTrickCard[];
  readonly wasteCount: number;
  readonly ledSuit: string | null;
  readonly powerPlayerName: string;
  readonly currentPlayerName: string;
  readonly isHumanTurn: boolean;
  readonly instructionKey: MessageKey;
  readonly instructionValues?: MessageValues;
  readonly statusKey: MessageKey;
  readonly statusValues?: MessageValues;
  readonly events: readonly JhabbuViewEvent[];
  readonly result: JhabbuResult | null;
  readonly finishOrderNames: readonly string[];
  readonly loserName: string;
}

export type JhabbuIntent =
  | { readonly type: 'setPlayerCount'; readonly playerCount: number }
  | { readonly type: 'setHumanName'; readonly humanName: string }
  | { readonly type: 'setLocale'; readonly locale: Locale }
  | { readonly type: 'toggleReducedMotion' }
  | { readonly type: 'start' }
  | { readonly type: 'playCard'; readonly cardId: string }
  | { readonly type: 'drawFromWaste' }
  | { readonly type: 'botStep' }
  | { readonly type: 'rematch' };
