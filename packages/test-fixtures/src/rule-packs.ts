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

/** Same rules, dealt/drawn counter-clockwise. */
export const COUNTER_CLOCKWISE_GULAM_CHOR: RulePack = {
  ...CLASSIC_GULAM_CHOR,
  id: 'gulam-chor-ccw',
  direction: 'counter-clockwise',
};

/** The odd card is a Queen instead of a Jack. */
export const RANI_CHOR: RulePack = {
  ...CLASSIC_GULAM_CHOR,
  id: 'rani-chor',
  removedRank: 'queen',
};

/** Ace as the odd card, drawn counter-clockwise. */
export const IKKA_CHOR_CCW: RulePack = {
  ...CLASSIC_GULAM_CHOR,
  id: 'ikka-chor-ccw',
  removedRank: 'ace',
  direction: 'counter-clockwise',
};

/**
 * Terminating rule-pack variants for property/simulation tests. All keep
 * `autoRemovePairs: true` (a game with auto-removal off never progresses).
 */
export const GULAM_CHOR_VARIANTS: readonly RulePack[] = [
  CLASSIC_GULAM_CHOR,
  COUNTER_CLOCKWISE_GULAM_CHOR,
  RANI_CHOR,
  IKKA_CHOR_CCW,
];
