/**
 * Pure rematch-voting state — no React, no transport. The server stays the
 * authority for actually starting the next round; this module only derives what
 * the UI should show from a list of votes and the game's player limits, and owns
 * the countdown gating rules. Keeping it pure makes every rule unit-testable and
 * lets the same derivation run on the client (optimistic) and be reconciled with
 * server events later.
 *
 * BACKEND LIMITATION: there is no `room_rematch` table or RPC yet (migrations end
 * at 0012). Wiring `RematchVote` to real players needs a new migration exposing
 * `rematch:vote` / `rematch:start` events. Until then the component drives this
 * model locally so the interaction and rules are real and reviewable.
 */

export type RematchVote = 'pending' | 'ready' | 'declined' | 'left' | 'disconnected';

export interface PlayerRematchState {
  readonly playerId: string;
  readonly displayName: string;
  readonly vote: RematchVote;
  readonly votedAt?: string;
}

export interface RematchDerived {
  /** Players still eligible to join the next round (not gone/declined). */
  readonly eligible: readonly PlayerRematchState[];
  /** Eligible players who have pressed "I'm in". */
  readonly ready: readonly PlayerRematchState[];
  readonly readyCount: number;
  readonly eligibleCount: number;
  /** Enough ready players to legally deal the next round. */
  readonly minimumPlayersMet: boolean;
  /** Every remaining eligible player is ready (and there are enough). */
  readonly everyoneReady: boolean;
}

const GONE: ReadonlySet<RematchVote> = new Set<RematchVote>(['left', 'declined']);

export function deriveRematch(
  players: readonly PlayerRematchState[],
  minPlayers: number,
): RematchDerived {
  const eligible = players.filter((p) => !GONE.has(p.vote));
  const ready = eligible.filter((p) => p.vote === 'ready');
  const minimumPlayersMet = ready.length >= minPlayers;
  const everyoneReady = eligible.length >= minPlayers && ready.length === eligible.length;
  return {
    eligible,
    ready,
    readyCount: ready.length,
    eligibleCount: eligible.length,
    minimumPlayersMet,
    everyoneReady,
  };
}

/**
 * Whether the automatic countdown to the next round may run. It starts only when
 * every eligible player is ready (and the minimum is met). A ready player leaving
 * or changing their vote flips `everyoneReady` false, which stops the countdown.
 */
export function shouldRunCountdown(derived: RematchDerived): boolean {
  return derived.everyoneReady;
}

/**
 * Whether the host may force-start with only the currently-ready players. Allowed
 * once the minimum is met, a grace period has elapsed, and no auto-countdown is
 * already running (so we never double-fire a start).
 */
export function hostCanForceStart(
  derived: RematchDerived,
  waitingPeriodExpired: boolean,
  countdownActive: boolean,
): boolean {
  return (
    derived.minimumPlayersMet && waitingPeriodExpired && !countdownActive && !derived.everyoneReady
  );
}

/** Applies a single vote change, stamping the time so ordering stays stable. */
export function applyVote(
  players: readonly PlayerRematchState[],
  playerId: string,
  vote: RematchVote,
  now: string = new Date().toISOString(),
): readonly PlayerRematchState[] {
  return players.map((p) => (p.playerId === playerId ? { ...p, vote, votedAt: now } : p));
}

export const REMATCH_COUNTDOWN_SECONDS = 5;
