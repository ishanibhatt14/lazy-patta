import type { Rng } from '@lazy-patta/game-contracts';

/**
 * Production randomness for computer play. Crypto-backed, never a predictable
 * seed (the engine forbids `Math.random`; RNG is injected — see ADR-0003 and
 * docs/04-games/gadha-chor.md §3). Tests inject their own deterministic `Rng`
 * instead of using this factory.
 */
export function createCryptoRng(): Rng {
  return {
    next(): number {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      return buffer[0]! / 0x1_0000_0000;
    },
  };
}

/**
 * Deterministic RNG (mulberry32) for reproducible deals in visual-regression
 * tests. Never used in normal play — the client only selects this when an
 * explicit `?seed=` is present. The engine still receives an injected `Rng`, so
 * game rules, bot behavior, and contracts are unchanged.
 */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 0x1_0000_0000;
    },
  };
}
