import type { Card } from '@lazy-patta/game-contracts';
import type {
  LalSattiEvent,
  LalSattiState,
  LalSattiTableauLane,
} from '@lazy-patta/lal-satti-engine';
import type { Locale, MessageKey, MessageValues } from '@lazy-patta/localization';

export type LalSattiComputerPhase = 'setup' | 'playing' | 'result';
export type LalSattiSavedScoreRule = 'card-count-v1' | 'rank-value-v2';

export const LAL_SATTI_CURRENT_SCORE_RULE: LalSattiSavedScoreRule = 'rank-value-v2';

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

export interface LalSattiLeftoverScore {
  readonly playerId: string;
  readonly playerName: string;
  readonly cardCount: number;
  readonly cardPoints: number;
  readonly cards?: readonly Card[];
}

export interface LalSattiRoundScore {
  readonly id: string;
  readonly roundNumber: number;
  readonly scoreRule: LalSattiSavedScoreRule;
  readonly winnerIds: readonly string[];
  readonly winnerNames: readonly string[];
  readonly leftovers: readonly LalSattiLeftoverScore[];
}

export interface LalSattiRunningScore {
  readonly playerId: string;
  readonly playerName: string;
  readonly totalPenaltyPoints: number;
  readonly roundsNotWon: number;
}

export interface LalSattiControllerState {
  readonly phase: LalSattiComputerPhase;
  readonly playerCount: number;
  readonly humanName: string;
  readonly locale: Locale;
  readonly reducedMotion: boolean;
  readonly game: LalSattiState | null;
  readonly events: readonly LalSattiViewEvent[];
  readonly roundScores: readonly LalSattiRoundScore[];
  readonly lastEngineEvents: readonly LalSattiEvent[];
  readonly hasHydratedSession: boolean;
  readonly seq: number;
}

export interface LalSattiViewState {
  readonly phase: LalSattiComputerPhase;
  readonly playerCount: number;
  readonly humanName: string;
  readonly canStart: boolean;
  readonly locale: Locale;
  readonly reducedMotion: boolean;
  readonly seats: readonly LalSattiSeatView[];
  readonly lanes: readonly LalSattiTableauLane[];
  readonly ownHand: readonly Card[];
  readonly playableCardIds: readonly string[];
  readonly currentPlayerName: string;
  readonly isHumanTurn: boolean;
  readonly canPass: boolean;
  readonly instructionKey: MessageKey;
  readonly instructionValues?: MessageValues;
  readonly statusKey: MessageKey;
  readonly statusValues?: MessageValues;
  readonly events: readonly LalSattiViewEvent[];
  readonly winnerNames: readonly string[];
  readonly roundScores: readonly LalSattiRoundScore[];
  readonly runningScores: readonly LalSattiRunningScore[];
}

export type LalSattiIntent =
  | { readonly type: 'setPlayerCount'; readonly playerCount: number }
  | { readonly type: 'setHumanName'; readonly humanName: string }
  | { readonly type: 'setLocale'; readonly locale: Locale }
  | {
      readonly type: 'hydrateSession';
      readonly humanName?: string;
      readonly roundScores?: readonly LalSattiRoundScore[];
    }
  | { readonly type: 'toggleReducedMotion' }
  | { readonly type: 'start' }
  | { readonly type: 'playCard'; readonly cardId: string }
  | { readonly type: 'pass' }
  | { readonly type: 'botStep' }
  | { readonly type: 'rematch' };
