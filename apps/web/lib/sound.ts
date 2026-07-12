/**
 * Tiny, optional sound cues for the computer table. Sound is strictly secondary:
 * it is muted through settings, never autoplays before a user gesture, and every
 * cue has a visible equivalent in the UI (see docs/02-design-system/accessibility.md).
 */
export type SoundCue = 'deal' | 'draw' | 'pair' | 'finish' | 'result';

const TONES: Record<SoundCue, { readonly frequency: number; readonly durationMs: number }> = {
  deal: { frequency: 320, durationMs: 90 },
  draw: { frequency: 440, durationMs: 110 },
  pair: { frequency: 660, durationMs: 180 },
  finish: { frequency: 520, durationMs: 160 },
  result: { frequency: 392, durationMs: 260 },
};

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioContext ??= new Ctor();
  return audioContext;
}

export function playCue(cue: SoundCue, enabled: boolean): void {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx) return;
  try {
    const { frequency, durationMs } = TONES[cue];
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // Audio is non-essential; never let a cue break gameplay.
  }
}
