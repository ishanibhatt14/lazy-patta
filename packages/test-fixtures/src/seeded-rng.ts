import type { Rng } from '@lazy-patta/game-contracts';

/**
 * mulberry32 — a small, fast, deterministic PRNG for reproducible test shuffles.
 * NOT for production: production randomness is crypto-backed on the server.
 */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next(): number {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}
