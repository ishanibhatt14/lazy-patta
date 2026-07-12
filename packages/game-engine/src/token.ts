import type { PlayerId } from '@lazy-patta/game-contracts';

/** FNV-1a 32-bit hash → hex. Deterministic, dependency-free. */
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Mint an opaque position token for a hidden card slot. The token is a hash of
 * (stateVersion, fromPlayer, index) — it contains **no** card identity, hides
 * the raw index, and is bound to the current state version so it cannot be
 * replayed on a later turn (ADR-0008). Resolution is by recompute-and-match, so
 * the mapping never needs to be stored or sent.
 */
export function mintPositionToken(
  stateVersion: number,
  fromPlayer: PlayerId,
  index: number,
): string {
  return `pt_${fnv1a(`${stateVersion}:${fromPlayer}:${index}`)}`;
}

/**
 * Resolve a token back to a hand index for the given from-player and version by
 * matching against freshly-minted tokens for each slot. Returns -1 if no slot
 * matches (invalid or stale token).
 */
export function resolvePositionToken(
  token: string,
  stateVersion: number,
  fromPlayer: PlayerId,
  handSize: number,
): number {
  for (let i = 0; i < handSize; i++) {
    if (mintPositionToken(stateVersion, fromPlayer, i) === token) return i;
  }
  return -1;
}
