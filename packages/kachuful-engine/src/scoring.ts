import type { KachufulPlayerState, KachufulRulePack } from './types';

/**
 * Points for a single player in a round: hit your exact bid and you score the
 * flat bonus plus a per-trick bonus; miss by any amount and you score nothing.
 */
export function kachufulRoundScore(
  rulePack: KachufulRulePack,
  bid: number,
  tricksWon: number,
): number {
  if (bid !== tricksWon) return 0;
  return rulePack.exactBidBonus + bid * rulePack.perTrickBonus;
}

/** The round score for every player, keyed by id. */
export function kachufulRoundScores(
  rulePack: KachufulRulePack,
  players: readonly KachufulPlayerState[],
): Readonly<Record<string, number>> {
  return Object.fromEntries(
    players.map((player) => [
      player.id,
      kachufulRoundScore(rulePack, player.bid ?? 0, player.tricksWon),
    ]),
  );
}
