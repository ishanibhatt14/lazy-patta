import { describe, expect, it } from 'vitest';

import { isTakingLonger, shouldStopLoading, timeoutState } from './async-view-state';

describe('async view state helpers', () => {
  it('warns at 8 seconds and times out at 12 seconds', () => {
    const loading = { status: 'loading' as const, startedAt: 1_000 };
    expect(isTakingLonger(loading, 8_999)).toBe(false);
    expect(isTakingLonger(loading, 9_000)).toBe(true);
    expect(shouldStopLoading(loading, 12_999)).toBe(false);
    expect(shouldStopLoading(loading, 13_000)).toBe(true);
  });

  it('creates a recoverable timeout error', () => {
    expect(timeoutState('abc')).toMatchObject({
      status: 'error',
      code: 'room_initialization_timeout',
      recoverable: true,
      correlationId: 'abc',
    });
  });
});
