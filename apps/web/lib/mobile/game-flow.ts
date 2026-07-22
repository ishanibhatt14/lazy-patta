import type { ComputerGameConfig } from './computer-session';
import type { GameSlug } from './game-registry';

export type MobileGameFlowState =
  | { readonly status: 'idle' }
  | { readonly status: 'selecting-mode'; readonly gameSlug: GameSlug }
  | { readonly status: 'configuring'; readonly gameSlug: GameSlug; readonly mode: 'computer' }
  | {
      readonly status: 'initializing';
      readonly gameSlug: GameSlug;
      readonly mode: 'computer';
      readonly requestId: string;
    }
  | {
      readonly status: 'playing';
      readonly gameSlug: GameSlug;
      readonly mode: 'computer';
      readonly sessionId: string;
    }
  | {
      readonly status: 'round-complete';
      readonly gameSlug: GameSlug;
      readonly mode: 'computer';
      readonly sessionId: string;
      readonly roundId: string;
    }
  | {
      readonly status: 'starting-next-round';
      readonly gameSlug: GameSlug;
      readonly sessionId: string;
      readonly requestId: string;
    }
  | { readonly status: 'recovering'; readonly sessionId?: string; readonly roomCode?: string }
  | {
      readonly status: 'error';
      readonly recoverable: boolean;
      readonly code: string;
      readonly message: string;
      readonly previousState?: Exclude<MobileGameFlowState, { readonly status: 'error' }>;
    };

export type MobileGameFlowEvent =
  | { readonly type: 'GAME_SELECTED'; readonly gameSlug: GameSlug }
  | { readonly type: 'MODE_SELECTED'; readonly mode: 'computer' }
  | {
      readonly type: 'CONFIG_CONFIRMED';
      readonly config: ComputerGameConfig;
      readonly requestId: string;
    }
  | { readonly type: 'INITIALIZATION_SUCCEEDED'; readonly sessionId: string }
  | { readonly type: 'INITIALIZATION_FAILED'; readonly code: string; readonly message: string }
  | { readonly type: 'ROUND_COMPLETED'; readonly roundId: string }
  | { readonly type: 'PLAY_AGAIN_REQUESTED'; readonly requestId: string }
  | { readonly type: 'NEXT_ROUND_STARTED'; readonly sessionId: string }
  | { readonly type: 'LEAVE_REQUESTED' }
  | { readonly type: 'RECOVERY_STARTED'; readonly sessionId?: string; readonly roomCode?: string }
  | { readonly type: 'RECOVERY_SUCCEEDED'; readonly sessionId: string }
  | { readonly type: 'RECOVERY_FAILED'; readonly message: string }
  | { readonly type: 'BACK_REQUESTED' }
  | { readonly type: 'RESET' };

function invalid(state: MobileGameFlowState, event: MobileGameFlowEvent): MobileGameFlowState {
  const previousState = state.status === 'error' ? undefined : state;
  return {
    status: 'error',
    recoverable: true,
    code: 'INVALID_TRANSITION',
    message: `${state.status}:${event.type}`,
    previousState,
  };
}

export function transitionGameFlow(
  state: MobileGameFlowState,
  event: MobileGameFlowEvent,
): MobileGameFlowState {
  if (event.type === 'RESET' || event.type === 'LEAVE_REQUESTED') return { status: 'idle' };

  switch (state.status) {
    case 'idle':
      if (event.type === 'GAME_SELECTED') {
        return { status: 'selecting-mode', gameSlug: event.gameSlug };
      }
      if (event.type === 'RECOVERY_STARTED') {
        return { status: 'recovering', sessionId: event.sessionId, roomCode: event.roomCode };
      }
      return invalid(state, event);
    case 'selecting-mode':
      if (event.type === 'MODE_SELECTED') {
        return { status: 'configuring', gameSlug: state.gameSlug, mode: event.mode };
      }
      if (event.type === 'BACK_REQUESTED') return { status: 'idle' };
      return invalid(state, event);
    case 'configuring':
      if (event.type === 'CONFIG_CONFIRMED') {
        return {
          status: 'initializing',
          gameSlug: event.config.gameSlug,
          mode: 'computer',
          requestId: event.requestId,
        };
      }
      if (event.type === 'BACK_REQUESTED') {
        return { status: 'selecting-mode', gameSlug: state.gameSlug };
      }
      return invalid(state, event);
    case 'initializing':
      if (event.type === 'INITIALIZATION_SUCCEEDED') {
        return {
          status: 'playing',
          gameSlug: state.gameSlug,
          mode: state.mode,
          sessionId: event.sessionId,
        };
      }
      if (event.type === 'INITIALIZATION_FAILED') {
        return {
          status: 'error',
          recoverable: true,
          code: event.code,
          message: event.message,
          previousState: state,
        };
      }
      if (event.type === 'BACK_REQUESTED') {
        return { status: 'configuring', gameSlug: state.gameSlug, mode: state.mode };
      }
      return invalid(state, event);
    case 'playing':
      if (event.type === 'ROUND_COMPLETED') {
        return {
          status: 'round-complete',
          gameSlug: state.gameSlug,
          mode: state.mode,
          sessionId: state.sessionId,
          roundId: event.roundId,
        };
      }
      return invalid(state, event);
    case 'round-complete':
      if (event.type === 'PLAY_AGAIN_REQUESTED') {
        return {
          status: 'starting-next-round',
          gameSlug: state.gameSlug,
          sessionId: state.sessionId,
          requestId: event.requestId,
        };
      }
      if (event.type === 'BACK_REQUESTED') return state;
      return invalid(state, event);
    case 'starting-next-round':
      if (event.type === 'NEXT_ROUND_STARTED') {
        return {
          status: 'playing',
          gameSlug: state.gameSlug,
          mode: 'computer',
          sessionId: event.sessionId,
        };
      }
      return invalid(state, event);
    case 'recovering':
      if (event.type === 'RECOVERY_SUCCEEDED') {
        return {
          status: 'playing',
          gameSlug: 'gadha-chor',
          mode: 'computer',
          sessionId: event.sessionId,
        };
      }
      if (event.type === 'RECOVERY_FAILED') {
        return {
          status: 'error',
          recoverable: true,
          code: 'RECOVERY_FAILED',
          message: event.message,
          previousState: state,
        };
      }
      return invalid(state, event);
    case 'error':
      if (event.type === 'BACK_REQUESTED') return state.previousState ?? { status: 'idle' };
      return invalid(state, event);
  }
}
