import type { RulePack } from '@lazy-patta/game-contracts';

/** The default Gadha Chor rule pack (see decisions-log D-10). */
export const CLASSIC_GULAM_CHOR: RulePack = {
  id: 'classic-gulam-chor',
  minPlayers: 2,
  maxPlayers: 6,
  removedRank: 'jack',
  pairing: 'same-rank',
  direction: 'clockwise',
  autoRemovePairs: true,
  turnSeconds: 20,
};
