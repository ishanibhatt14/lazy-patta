import type { MessageKey } from '@lazy-patta/localization';

/**
 * The one warm, useful observation a result screen leaves the player with —
 * never a coin balance or a payout, always a "here's how your table went" note
 * (see docs/audits/2026-07-23-mehfil-table-ux-plan.md, Slice R). Returns a
 * message key plus its values so the caller can format it in the active locale.
 */
export interface ResultTakeaway {
  readonly key: MessageKey;
  readonly values?: Readonly<Record<string, number>>;
}

/** The minimum a scored, ranked game must expose for a standings takeaway. */
export interface StandingsRow {
  readonly totalScore: number;
  readonly isSelf: boolean;
}

/**
 * Derive the human's takeaway from a final, best-first scoreboard:
 * - sole winner  → "ahead by {margin}"
 * - shared top   → "a shared finish"
 * - anyone else  → "just {behind} behind the leader"
 *
 * Returns null when the human has no seat in the standings (nothing honest to
 * say). Pure and locale-free so it can be unit-tested without a translator.
 */
export function standingsTakeaway(
  scoreboard: readonly StandingsRow[],
  isSelfWinner: boolean,
): ResultTakeaway | null {
  const self = scoreboard.find((row) => row.isSelf);
  const leader = scoreboard[0];
  if (!self || !leader) return null;

  if (isSelfWinner) {
    const bestOther = scoreboard
      .filter((row) => !row.isSelf)
      .reduce<number | null>(
        (best, row) => (best === null ? row.totalScore : Math.max(best, row.totalScore)),
        null,
      );
    // No opponents, or level at the very top: a shared finish, not a margin.
    if (bestOther === null || self.totalScore - bestOther <= 0) {
      return { key: 'result.takeaway.sharedTop' };
    }
    return { key: 'result.takeaway.wonBy', values: { margin: self.totalScore - bestOther } };
  }

  return {
    key: 'result.takeaway.behindLeader',
    values: { behind: leader.totalScore - self.totalScore },
  };
}
