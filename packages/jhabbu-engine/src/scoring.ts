import type { PlayerId } from '@lazy-patta/game-contracts';

import type { JhabbuPlayerState } from './types';

export function jhabbuFinishPenalty(finishPosition: number): number {
  if (finishPosition <= 1) return 0;
  if (finishPosition === 2) return 1;
  return 2;
}

export function jhabbuRoundPenalties(
  players: readonly JhabbuPlayerState[],
  finishOrder: readonly PlayerId[],
  loserId: PlayerId,
): Readonly<Record<PlayerId, number>> {
  const finishPenalty = new Map(
    finishOrder.map((playerId, index) => [playerId, jhabbuFinishPenalty(index + 1)]),
  );

  return Object.fromEntries(
    players.map((player) => [
      player.id,
      player.id === loserId ? 3 : (finishPenalty.get(player.id) ?? 2),
    ]),
  );
}
