import { beforeEach, describe, expect, it } from 'vitest';

import {
  DAILY_GOAL,
  advance,
  dayKey,
  progressFor,
  readDailyProgress,
  recordGameLaunch,
  type DailyActivity,
} from './daily-activity';

describe('dayKey', () => {
  it('formats a local calendar day as YYYY-MM-DD with zero padding', () => {
    // Local (not UTC) fields, so construct with local time.
    expect(dayKey(new Date(2026, 0, 5, 9, 30))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});

describe('advance', () => {
  it('starts today at 1 when there is no stored value', () => {
    expect(advance(null, '2026-07-22')).toEqual({ date: '2026-07-22', count: 1 });
  });

  it('increments when the stored value is already today', () => {
    const stored: DailyActivity = { date: '2026-07-22', count: 2 };
    expect(advance(stored, '2026-07-22')).toEqual({ date: '2026-07-22', count: 3 });
  });

  it('resets to 1 on a new day, never carrying yesterday forward', () => {
    const stored: DailyActivity = { date: '2026-07-21', count: 9 };
    expect(advance(stored, '2026-07-22')).toEqual({ date: '2026-07-22', count: 1 });
  });
});

describe('progressFor', () => {
  it('reports zero when nothing is stored', () => {
    expect(progressFor(null, '2026-07-22')).toEqual({ played: 0, goal: DAILY_GOAL });
  });

  it('reports today’s count when the stored day matches', () => {
    const stored: DailyActivity = { date: '2026-07-22', count: 2 };
    expect(progressFor(stored, '2026-07-22')).toEqual({ played: 2, goal: DAILY_GOAL });
  });

  it('reads a previous day back as zero — a fresh start, not a loss', () => {
    const stored: DailyActivity = { date: '2026-07-21', count: 3 };
    expect(progressFor(stored, '2026-07-22')).toEqual({ played: 0, goal: DAILY_GOAL });
  });

  it('accepts a custom goal', () => {
    expect(progressFor(null, '2026-07-22', 5)).toEqual({ played: 0, goal: 5 });
  });
});

describe('recordGameLaunch / readDailyProgress round-trip', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts at zero, then counts launches on the same day', () => {
    const now = new Date(2026, 6, 22, 20, 0);
    expect(readDailyProgress(now)).toEqual({ played: 0, goal: DAILY_GOAL });

    recordGameLaunch(now);
    recordGameLaunch(now);
    expect(readDailyProgress(now)).toEqual({ played: 2, goal: DAILY_GOAL });
  });

  it('reads back as zero on the following day', () => {
    const today = new Date(2026, 6, 22, 20, 0);
    const tomorrow = new Date(2026, 6, 23, 8, 0);
    recordGameLaunch(today);
    expect(readDailyProgress(tomorrow)).toEqual({ played: 0, goal: DAILY_GOAL });
  });

  it('recovers from a corrupt stored value by treating today as empty', () => {
    window.localStorage.setItem('lazy-patta:mobile-daily-activity', '{not json');
    expect(readDailyProgress(new Date(2026, 6, 22))).toEqual({ played: 0, goal: DAILY_GOAL });
  });
});
