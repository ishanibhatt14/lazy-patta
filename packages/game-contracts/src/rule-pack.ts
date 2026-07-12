import type { Rank } from './cards';

export type TurnDirection = 'clockwise' | 'counter-clockwise';

/**
 * A versioned, typed rule pack. Behavior is data, not code branches (ADR-0006).
 * The default Gadha Chor pack is `classic-gulam-chor`.
 */
export interface RulePack {
  readonly id: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  /** One card of this rank is removed before the deal, leaving an odd one out. */
  readonly removedRank: Rank;
  readonly pairing: 'same-rank';
  readonly direction: TurnDirection;
  readonly autoRemovePairs: boolean;
  /** Per-turn time budget for live play; not enforced by the pure engine. */
  readonly turnSeconds: number;
}
