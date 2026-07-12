import type { Rng } from '@lazy-patta/game-contracts';
import { describe, expect, it } from 'vitest';

import { botDelay, pacingFor } from './pacing';

function fixedRng(value: number): Rng {
  return { next: () => value };
}

describe('view-layer pacing', () => {
  it('collapses to short, non-zero delays under reduced motion', () => {
    const full = pacingFor(false);
    const reduced = pacingFor(true);
    expect(reduced.dealMs).toBeGreaterThan(0);
    expect(reduced.dealMs).toBeLessThan(full.dealMs);
    expect(reduced.botMaxMs).toBeLessThan(full.botMaxMs);
  });

  it('keeps the humanized bot delay within [min, max] at both rng extremes', () => {
    const profile = pacingFor(false);
    expect(botDelay(profile, fixedRng(0))).toBe(profile.botMinMs);
    expect(botDelay(profile, fixedRng(0.999999))).toBeLessThanOrEqual(profile.botMaxMs);
    expect(botDelay(profile, fixedRng(0.5))).toBeGreaterThanOrEqual(profile.botMinMs);
    expect(botDelay(profile, fixedRng(0.5))).toBeLessThanOrEqual(profile.botMaxMs);
  });
});
