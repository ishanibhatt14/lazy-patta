import type { Rng } from '@lazy-patta/game-contracts';

/**
 * Fisher–Yates shuffle using the injected Rng. Pure: returns a new array,
 * never mutates the input, never touches Math.random.
 */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}
