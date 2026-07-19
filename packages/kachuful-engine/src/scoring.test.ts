import { describe, expect, it } from 'vitest';

import { KACHUFUL_FAMILY_DESCENDING } from './rules';
import { kachufulRoundScore } from './scoring';

describe('kachufulRoundScore', () => {
  it('awards the flat bonus plus one point per trick on an exact bid', () => {
    expect(kachufulRoundScore(KACHUFUL_FAMILY_DESCENDING, 0, 0)).toBe(10);
    expect(kachufulRoundScore(KACHUFUL_FAMILY_DESCENDING, 3, 3)).toBe(13);
    expect(kachufulRoundScore(KACHUFUL_FAMILY_DESCENDING, 7, 7)).toBe(17);
  });

  it('awards nothing when the bid is missed in either direction', () => {
    expect(kachufulRoundScore(KACHUFUL_FAMILY_DESCENDING, 3, 2)).toBe(0);
    expect(kachufulRoundScore(KACHUFUL_FAMILY_DESCENDING, 3, 4)).toBe(0);
    expect(kachufulRoundScore(KACHUFUL_FAMILY_DESCENDING, 0, 1)).toBe(0);
  });
});
