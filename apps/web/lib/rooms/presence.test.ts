import { describe, expect, it } from 'vitest';

import {
  PRESENCE_ABANDON_MS,
  PRESENCE_GRACE_MS,
  seatPresence,
  type SeatPresence,
} from './presence';

const NOW = Date.parse('2026-07-23T12:00:00.000Z');

function ago(ms: number): string {
  return new Date(NOW - ms).toISOString();
}

describe('seatPresence', () => {
  it('treats a recently seen seat as present', () => {
    expect(seatPresence(ago(0), NOW)).toBe('present');
    expect(seatPresence(ago(PRESENCE_GRACE_MS - 1), NOW)).toBe('present');
    expect(seatPresence(ago(PRESENCE_GRACE_MS), NOW)).toBe('present');
  });

  it('marks a seat reconnecting once it passes the grace window', () => {
    expect(seatPresence(ago(PRESENCE_GRACE_MS + 1), NOW)).toBe('reconnecting');
    expect(seatPresence(ago(PRESENCE_ABANDON_MS), NOW)).toBe('reconnecting');
  });

  it('marks a seat gone after a long silence', () => {
    expect(seatPresence(ago(PRESENCE_ABANDON_MS + 1), NOW)).toBe('gone');
    expect(seatPresence(ago(10 * PRESENCE_ABANDON_MS), NOW)).toBe('gone');
  });

  it('never alarms when the timestamp is missing or unparseable', () => {
    const safe: SeatPresence = 'present';
    expect(seatPresence(null, NOW)).toBe(safe);
    expect(seatPresence(undefined, NOW)).toBe(safe);
    expect(seatPresence('not-a-date', NOW)).toBe(safe);
  });

  it('honours custom grace and abandon windows', () => {
    expect(seatPresence(ago(5_000), NOW, 1_000, 10_000)).toBe('reconnecting');
    expect(seatPresence(ago(50_000), NOW, 1_000, 10_000)).toBe('gone');
    expect(seatPresence(ago(500), NOW, 1_000, 10_000)).toBe('present');
  });
});
