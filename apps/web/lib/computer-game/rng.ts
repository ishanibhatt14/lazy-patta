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
