/**
 * A gentle, honest "how much have we played today" counter for the mobile Home.
 *
 * Deliberately NOT a casino retention device: there is no streak that punishes a
 * missed day, no countdown timer, no currency, and no reward to claim. It simply
 * reflects games the player actually launched today and offers a small, warm
 * acknowledgement — a family game-night nicety, not an engagement trap. State is
 * per-device in localStorage; a new calendar day naturally reads back as zero
 * because yesterday's entry no longer matches today's key (no "you lost it!"
 * framing, just a fresh start).
 */

const STORAGE_KEY = 'lazy-patta:mobile-daily-activity';

/** A relaxed target — enough to feel like a game night, low enough to be easy. */
export const DAILY_GOAL = 3;

export interface DailyActivity {
  /** Local calendar day, `YYYY-MM-DD`. */
  readonly date: string;
  readonly count: number;
}

export interface DailyProgress {
  readonly played: number;
  readonly goal: number;
}

/** Local calendar day key. Local (not UTC) so "today" matches the player's day. */
export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Pure: the next stored value after launching one game on `today`. */
export function advance(stored: DailyActivity | null, today: string): DailyActivity {
  if (stored && stored.date === today) {
    return { date: today, count: stored.count + 1 };
  }
  return { date: today, count: 1 };
}

/** Pure: today's progress. Stale (previous-day) state reads back as zero. */
export function progressFor(
  stored: DailyActivity | null,
  today: string,
  goal: number = DAILY_GOAL,
): DailyProgress {
  const played = stored && stored.date === today ? stored.count : 0;
  return { played, goal };
}

function read(): DailyActivity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as DailyActivity).date === 'string' &&
      typeof (parsed as DailyActivity).count === 'number'
    ) {
      return { date: (parsed as DailyActivity).date, count: (parsed as DailyActivity).count };
    }
    return null;
  } catch {
    return null;
  }
}

/** Record that the player launched a game. Safe to call anywhere client-side. */
export function recordGameLaunch(now: Date = new Date()): void {
  if (typeof window === 'undefined') return;
  try {
    const next = advance(read(), dayKey(now));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage disabled: the counter is a convenience, not worth surfacing.
  }
}

/** Read today's progress for display. Returns zero-progress on any failure. */
export function readDailyProgress(now: Date = new Date()): DailyProgress {
  return progressFor(read(), dayKey(now));
}
