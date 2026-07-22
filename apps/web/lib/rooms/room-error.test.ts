import { describe, expect, it } from 'vitest';

import { classifyRoomError } from './room-error';

describe('classifyRoomError', () => {
  it.each([
    ['room not found', 'not-found', false],
    ['room is full', 'full', false],
    ['room is not accepting players', 'closed', false],
    ['room is not in lobby', 'closed', false],
  ] as const)('maps "%s" to a distinct non-retryable reason', (message, reason, retryable) => {
    const classified = classifyRoomError(new Error(message));
    expect(classified.reason).toBe(reason);
    expect(classified.retryable).toBe(retryable);
    expect(classified.titleKey).not.toBe('rooms.errorGeneric');
  });

  it('treats transport failures as retryable connection errors', () => {
    expect(classifyRoomError(new Error('Failed to fetch')).reason).toBe('connection');
    expect(classifyRoomError(new Error('The user aborted a request.')).reason).toBe('connection');
    expect(classifyRoomError(undefined).reason).toBe('connection');
    expect(classifyRoomError(new Error('Failed to fetch')).retryable).toBe(true);
  });

  it('falls back to a retryable generic error for unknown messages', () => {
    const classified = classifyRoomError(new Error('some brand new database error'));
    expect(classified.reason).toBe('unknown');
    expect(classified.retryable).toBe(true);
    expect(classified.bodyKey).toBe('rooms.errorGeneric');
  });

  it('produces a stable telemetry code per reason', () => {
    expect(classifyRoomError(new Error('room is full')).code).toBe('room_full');
    expect(classifyRoomError(new Error('room not found')).code).toBe('room_not-found');
  });
});
