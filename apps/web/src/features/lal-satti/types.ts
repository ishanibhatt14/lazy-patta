import type { Card } from '@lazy-patta/game-contracts';
import type {
  LalSattiEvent,
  LalSattiState,
  LalSattiTableauLane,
} from '@lazy-patta/lal-satti-engine';
import type { Locale, MessageKey, MessageValues } from '@lazy-patta/localization';

export type LalSattiComputerPhase = 'setup' | 'playing' | 'result';

export interface LalSattiSeatView {
  readonly id: string;
  readonly name: string;
  readonly avatarInitial: string;
  readonly isSelf: boolean;
  readonly isActive: boolean;
  readonly isFinished: boolean;
  readonly cardCount: number;
}

export interface LalSattiViewEvent {
  readonly id: string;
  readonly messageKey: MessageKey;
  readonly values?: MessageValues;
}

export interface LalSattiControllerState {
  readonly phase: LalSattiComputerPhase;
  readonly playerCount: number;
  readonly locale: Locale;
  readonly reducedMotion: boolean;
  readonly game: LalSattiState | null;
  readonly events: readonly LalSattiViewEvent[];
  readonly lastEngineEvents: readonly LalSattiEvent[];
  readonly seq: number;
}

export interface LalSattiViewState {
  readonly phase: LalSattiComputerPhase;
  readonly playerCount: number;
  readonly locale: Locale;
  readonly reducedMotion: boolean;
  readonly seats: readonly LalSattiSeatView[];
  readonly lanes: readonly LalSattiTableauLane[];
  readonly ownHand: readonly Card[];
  readonly playableCardIds: readonly string[];
  readonly currentPlayerName: string;
  readonly canPass: boolean;
  readonly instructionKey: MessageKey;
  readonly instructionValues?: MessageValues;
  readonly statusKey: MessageKey;
  readonly statusValues?: MessageValues;
  readonly events: readonly LalSattiViewEvent[];
  readonly winnerNames: readonly string[];
  readonly blockedResult: boolean;
}

export type LalSattiIntent =
  | { readonly type: 'setPlayerCount'; readonly playerCount: number }
  | { readonly type: 'setLocale'; readonly locale: Locale }
  | { readonly type: 'toggleReducedMotion' }
  | { readonly type: 'start' }
  | { readonly type: 'playCard'; readonly cardId: string }
  | { readonly type: 'pass' }
  | { readonly type: 'botStep' }
  | { readonly type: 'rematch' };
