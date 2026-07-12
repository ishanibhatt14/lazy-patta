import type { Card } from '@lazy-patta/game-contracts';
import type { MessageKey } from '@lazy-patta/localization';

export type ComputerGamePhase =
  | 'setup'
  | 'dealing'
  | 'initialPairs'
  | 'humanTurn'
  | 'botTurn'
  | 'pairFound'
  | 'playerFinished'
  | 'result'
  | 'error';

export interface ComputerGameSeat {
  readonly id: string;
  readonly name: string;
  readonly avatarInitial: string;
  readonly cardCount: number;
  readonly isSelf: boolean;
  readonly isActive: boolean;
  readonly isFinished: boolean;
  readonly position: 'bottom' | 'top' | 'left' | 'right';
}

export interface HiddenCardSlot {
  readonly ownerId: string;
  readonly ownerName: string;
  readonly positionToken: string;
  readonly displayIndex: number;
  readonly isSelectable: boolean;
}

export interface PairAnimation {
  readonly drawnCard: Card;
  readonly matchedCard: Card;
  readonly captionKey: MessageKey;
}

export interface ComputerGameViewEvent {
  readonly id: string;
  readonly type: 'deal' | 'initialPair' | 'draw' | 'pairFound' | 'finished' | 'result';
  readonly messageKey: MessageKey;
  readonly playerName?: string;
}

export interface ComputerGameSettings {
  readonly playerCount: number;
  readonly reducedMotion: boolean;
  readonly soundEnabled: boolean;
}

export interface ComputerGameViewState {
  readonly phase: ComputerGamePhase;
  readonly settings: ComputerGameSettings;
  readonly seats: readonly ComputerGameSeat[];
  readonly ownHand: readonly Card[];
  readonly hiddenCards: readonly HiddenCardSlot[];
  readonly pairAnimation?: PairAnimation;
  readonly winnerName?: string;
  readonly gadhaChorName?: string;
  readonly instructionKey: MessageKey;
  readonly instructionValues?: Readonly<Record<string, string | number>>;
  readonly statusKey: MessageKey;
  readonly statusValues?: Readonly<Record<string, string | number>>;
  readonly events: readonly ComputerGameViewEvent[];
  readonly recoverableErrorKey?: MessageKey;
}

export type ComputerGameIntent =
  | { readonly type: 'setPlayerCount'; readonly playerCount: number }
  | { readonly type: 'toggleReducedMotion' }
  | { readonly type: 'toggleSound' }
  | { readonly type: 'start' }
  | { readonly type: 'advance' }
  | { readonly type: 'chooseHiddenCard'; readonly positionToken: string }
  | { readonly type: 'rematch' }
  | { readonly type: 'recover' };

export interface ComputerGameController {
  readonly initialState: ComputerGameViewState;
  dispatch(state: ComputerGameViewState, intent: ComputerGameIntent): ComputerGameViewState;
}
