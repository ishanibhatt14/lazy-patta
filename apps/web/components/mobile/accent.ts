import type { GameAccent } from '../../lib/mobile-catalog';

/**
 * Maps a game's identity accent to semantic theme tokens only — never a hardcoded
 * hex. Each game owns a saturated, theme-stable fill (crimson/emerald/sapphire/
 * plum) so its tile, mode sheet and in-game chrome read as one identity in both
 * light and dark. `text` is always the light `onAccent` ink because every fill is
 * a deep, saturated colour. `soft` is a low-opacity wash for chips/labels.
 */
export interface AccentStyle {
  /** Solid identity fill, e.g. `bg-game-gadha`. */
  readonly fill: string;
  /** Matching border/ring, e.g. `border-game-gadha`. */
  readonly ring: string;
  /** Low-opacity wash of the identity colour for chips and glows. */
  readonly soft: string;
  /** Text/artwork ink that stays legible on the fill (always light). */
  readonly text: string;
  /** Gradient `from-` stop for a richer tile background. */
  readonly from: string;
}

export const ACCENT_CLASSES: Record<GameAccent, AccentStyle> = {
  gadha: {
    fill: 'bg-game-gadha',
    ring: 'border-game-gadha',
    soft: 'bg-game-gadha/15',
    text: 'text-text-onAccent',
    from: 'from-game-gadha',
  },
  lalSatti: {
    fill: 'bg-game-lalSatti',
    ring: 'border-game-lalSatti',
    soft: 'bg-game-lalSatti/15',
    text: 'text-text-onAccent',
    from: 'from-game-lalSatti',
  },
  jhabbu: {
    fill: 'bg-game-jhabbu',
    ring: 'border-game-jhabbu',
    soft: 'bg-game-jhabbu/15',
    text: 'text-text-onAccent',
    from: 'from-game-jhabbu',
  },
  kachuful: {
    fill: 'bg-game-kachuful',
    ring: 'border-game-kachuful',
    soft: 'bg-game-kachuful/15',
    text: 'text-text-onAccent',
    from: 'from-game-kachuful',
  },
};
