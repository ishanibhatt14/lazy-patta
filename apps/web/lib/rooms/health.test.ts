import { describe, expect, it } from 'vitest';

import { parseRoomServiceHealth } from './health';

describe('room health parsing', () => {
  it('preserves a valid degraded response', () => {
    const parsed = parseRoomServiceHealth({
      status: 'degraded',
      capabilities: {
        createRoom: true,
        joinRoom: true,
        realtime: false,
        reconnect: false,
        rematch: false,
      },
      checkedAt: '2026-07-22T00:00:00.000Z',
      publicMessageKey: 'rooms.healthDegraded',
    });
    expect(parsed.status).toBe('degraded');
    expect(parsed.capabilities.createRoom).toBe(true);
    expect(parsed.capabilities.realtime).toBe(false);
  });

  it('falls back to unavailable for malformed responses', () => {
    expect(parseRoomServiceHealth({ status: 'ok' }).status).toBe('unavailable');
    expect(parseRoomServiceHealth(null).capabilities.createRoom).toBe(false);
  });
});
