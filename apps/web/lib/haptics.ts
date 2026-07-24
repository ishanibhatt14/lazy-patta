/**
 * Tiny, optional haptic cues for the computer table. Haptics are strictly
 * secondary: every buzz has a visible (and audible) equivalent, they only fire
 * on supporting hardware, and callers must gate them on user preference — a
 * reduced-motion table stays silent under the fingers as well as on screen
 * (see docs/02-design-system/accessibility.md).
 */
export type HapticCue = 'turn';

const PATTERNS: Record<HapticCue, number | readonly number[]> = {
  // A single soft tap: "your move" — never a long or repeating buzz.
  turn: 18,
};

/**
 * Fire a haptic cue when the device supports it and the caller allows it.
 * A no-op on the server, on hardware without the Vibration API, or when
 * `enabled` is false. Failures are swallowed — a buzz must never break play.
 */
export function playHaptic(cue: HapticCue, enabled: boolean): void {
  if (!enabled) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(PATTERNS[cue] as number | number[]);
  } catch {
    // Haptics are non-essential; never let a cue break gameplay.
  }
}
