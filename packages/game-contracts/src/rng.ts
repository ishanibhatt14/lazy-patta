/**
 * Injected randomness. Seeded PRNG in tests (reproducible), crypto-backed on the
 * server in production. The engine never calls Math.random() directly (ADR-0003).
 */
export interface Rng {
  /** Returns a float in [0, 1). */
  next(): number;
}
