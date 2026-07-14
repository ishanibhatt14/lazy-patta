import { describe, expect, it } from 'vitest';

import { jhabbuFinishPenalty } from './scoring';

describe('Jhabbu scoring', () => {
  it('scores finish positions as 0, 1, then middle-player 2 point penalties', () => {
    expect([1, 2, 3, 4, 5].map(jhabbuFinishPenalty)).toEqual([0, 1, 2, 2, 2]);
  });
});
