export type AsyncViewState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading'; readonly startedAt: number }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'empty' }
  | {
      readonly status: 'error';
      readonly code: string;
      readonly recoverable: boolean;
      readonly correlationId?: string;
    }
  | { readonly status: 'unavailable'; readonly reasonKey: string };

export const SLOW_LOADING_MS = 8_000;
export const LOADING_TIMEOUT_MS = 12_000;

export function isTakingLonger<T>(state: AsyncViewState<T>, now: number): boolean {
  return state.status === 'loading' && now - state.startedAt >= SLOW_LOADING_MS;
}

export function shouldStopLoading<T>(state: AsyncViewState<T>, now: number): boolean {
  return state.status === 'loading' && now - state.startedAt >= LOADING_TIMEOUT_MS;
}

export function timeoutState(correlationId?: string): AsyncViewState<never> {
  return {
    status: 'error',
    code: 'room_initialization_timeout',
    recoverable: true,
    ...(correlationId ? { correlationId } : {}),
  };
}
