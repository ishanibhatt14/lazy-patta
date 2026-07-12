import type { Rng } from '@lazy-patta/game-contracts';

/**
 * View-layer pacing. The pure engine never delays or schedules — these values
 * only shape how the React layer *presents* transitions. Reduced motion collapses
 * every delay to a short, non-zero tick so play still advances predictably.
 */
export interface PacingProfile {
  readonly dealMs: number;
  readonly initialPairsMs: number;
  readonly drawRevealMs: number;
  readonly pairRevealMs: number;
  readonly botMinMs: number;
  readonly botMaxMs: number;
}

const FULL: PacingProfile = {
  dealMs: 1100,
  initialPairsMs: 1200,
  drawRevealMs: 950,
  pairRevealMs: 1500,
  botMinMs: 500,
  botMaxMs: 1200,
};

const REDUCED: PacingProfile = {
  dealMs: 300,
  initialPairsMs: 300,
  drawRevealMs: 350,
  pairRevealMs: 500,
  botMinMs: 250,
  botMaxMs: 350,
};

export function pacingFor(reducedMotion: boolean): PacingProfile {
  return reducedMotion ? REDUCED : FULL;
}

/** Humanized bot delay in [min, max] (docs/04-games/gadha-chor.md §6). */
export function botDelay(profile: PacingProfile, rng: Rng): number {
  const span = profile.botMaxMs - profile.botMinMs;
  return Math.round(profile.botMinMs + rng.next() * span);
}
