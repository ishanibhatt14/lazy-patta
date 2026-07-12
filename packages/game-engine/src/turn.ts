import type { PlayerState, TurnDirection } from '@lazy-patta/game-contracts';

/**
 * Index of the next active player from `fromIndex` (exclusive) in the given
 * direction, skipping finished players. Returns -1 if no other active player.
 */
export function nextActiveIndex(
  players: readonly PlayerState[],
  fromIndex: number,
  direction: TurnDirection,
): number {
  const n = players.length;
  const step = direction === 'clockwise' ? 1 : -1;
  for (let i = 1; i < n; i++) {
    const idx = (((fromIndex + step * i) % n) + n) % n;
    if (players[idx]!.status === 'active') return idx;
  }
  return -1;
}

export function activeCount(players: readonly PlayerState[]): number {
  return players.reduce((acc, p) => acc + (p.status === 'active' ? 1 : 0), 0);
}
