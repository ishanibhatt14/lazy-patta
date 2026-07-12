import type { RulePack } from '@lazy-patta/game-contracts';

/**
 * The production Gadha Chor rule pack for computer play. This is *data*, not
 * rule logic — the engine remains the sole rule authority (see
 * docs/04-games/gadha-chor.md §4, decisions D-10). One Jack (Gulam) is removed
 * before the deal, leaving the odd "gadha" card. `turnSeconds: 0` = untimed,
 * family-friendly local play; the pure engine does not enforce it.
 */
export const CLASSIC_GULAM_CHOR: RulePack = {
  id: 'classic-gulam-chor',
  minPlayers: 2,
  maxPlayers: 6,
  removedRank: 'jack',
  pairing: 'same-rank',
  direction: 'clockwise',
  autoRemovePairs: true,
  turnSeconds: 0,
};

export const MIN_TABLE_SIZE = CLASSIC_GULAM_CHOR.minPlayers;
export const MAX_TABLE_SIZE = CLASSIC_GULAM_CHOR.maxPlayers;
