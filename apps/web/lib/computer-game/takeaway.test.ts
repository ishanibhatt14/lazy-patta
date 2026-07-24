import { describe, expect, it } from 'vitest';

import { standingsTakeaway } from './takeaway';

describe('standingsTakeaway', () => {
  it('reports the winning margin over the runner-up when the human wins alone', () => {
    const takeaway = standingsTakeaway(
      [
        { totalScore: 21, isSelf: true },
        { totalScore: 15, isSelf: false },
        { totalScore: 9, isSelf: false },
      ],
      true,
    );
    expect(takeaway).toEqual({ key: 'result.takeaway.wonBy', values: { margin: 6 } });
  });

  it('calls a tie at the top a shared finish, not a zero margin', () => {
    const takeaway = standingsTakeaway(
      [
        { totalScore: 18, isSelf: true },
        { totalScore: 18, isSelf: false },
      ],
      true,
    );
    expect(takeaway).toEqual({ key: 'result.takeaway.sharedTop' });
  });

  it('reports how far behind the leader the human finished when they did not win', () => {
    const takeaway = standingsTakeaway(
      [
        { totalScore: 24, isSelf: false },
        { totalScore: 20, isSelf: true },
        { totalScore: 11, isSelf: false },
      ],
      false,
    );
    expect(takeaway).toEqual({ key: 'result.takeaway.behindLeader', values: { behind: 4 } });
  });

  it('treats a lone winner with no opponents as a shared finish', () => {
    const takeaway = standingsTakeaway([{ totalScore: 30, isSelf: true }], true);
    expect(takeaway).toEqual({ key: 'result.takeaway.sharedTop' });
  });

  it('returns null when the human is not in the standings', () => {
    expect(
      standingsTakeaway(
        [
          { totalScore: 12, isSelf: false },
          { totalScore: 8, isSelf: false },
        ],
        false,
      ),
    ).toBeNull();
  });

  it('returns null for an empty scoreboard', () => {
    expect(standingsTakeaway([], false)).toBeNull();
  });
});
