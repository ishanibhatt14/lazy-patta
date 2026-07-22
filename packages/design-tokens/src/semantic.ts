import type { ColorPrimitive } from './primitives';

/**
 * Semantic color roles (tier-2). This is the ONLY color layer components may
 * reference. Theming = remapping these to different primitives (ADR-0007).
 * Names follow the Phase 0 convention (background/surface/text/action/game/
 * status); the design-system docs' older aliases are reconciled to these (UQ-2).
 */
export const semanticColorTokens = {
  'background.canvas': 'cream',
  'surface.primary': 'white',
  'text.primary': 'ink',
  'text.onBrand': 'cream',
  'action.primary': 'maroon',
  'action.secondary': 'saffron',
  'brand.accent': 'teal',
  'game.table': 'feltGreen',
  'status.error': 'errorRed',
  // Playing-card face roles. Cards are a first-class surface in this product, so
  // their colors are named semantically rather than reaching for status/text
  // roles. Red/black suit inks reuse existing primitives; a theme can remap them.
  'card.face': 'white',
  'card.back': 'maroon',
  'card.suitRed': 'errorRed',
  'card.suitBlack': 'ink',
  // Immersive scene roles (Gadha Chor courtyard). The scene is a first-class
  // surface: an evening sky, a peacock-green felt inside a wooden rim, with
  // kumkum/indigo festive accents. A theme can remap these like any other role.
  'scene.skyTop': 'duskTop',
  'scene.skyBottom': 'duskBottom',
  'scene.rim': 'wood',
  'scene.rimEdge': 'woodDark',
  'scene.feltDeep': 'peacockDeep',
  'accent.indigo': 'indigo',
  'accent.kumkum': 'kumkum',
  // Always-light ink for text/artwork sitting on a saturated game-identity tile
  // or on the felt table. Stays ivory in both themes (never remapped), because a
  // crimson/emerald/plum surface needs light text regardless of light/dark mode.
  'text.onAccent': 'ivory',
  // Per-game identity fills (theme-stable). A game's tile, mode-sheet header and
  // in-game chrome adopt its accent so the whole flow feels like one product.
  'game.gadha': 'gadhaCrimson',
  'game.lalSatti': 'lalEmerald',
  'game.jhabbu': 'jhabbuSapphire',
  'game.kachuful': 'kachufulPlum',
} as const satisfies Record<string, ColorPrimitive>;

export type SemanticColorToken = keyof typeof semanticColorTokens;

/**
 * Dark-theme role overrides (tier-2). Theming = remapping semantic roles to
 * different primitives (ADR-0007); the dark theme changes only the roles listed
 * here and inherits every other role from the light map above. Note the deliberate
 * flip of `action.primary` to saffron and `text.onBrand` to ink: on a plum-black
 * canvas the primary role must read both as heading text on dark surfaces AND as a
 * filled button with legible text on top, which a warm saffron + ink pairing gives.
 */
export const darkThemeOverrides = {
  'background.canvas': 'plumBlack',
  'surface.primary': 'plumRaised',
  'text.primary': 'ivory',
  'text.onBrand': 'ink',
  'action.primary': 'saffron',
  'action.secondary': 'gold',
  'brand.accent': 'tealLight',
  'status.error': 'coralLight',
} as const satisfies Partial<Record<SemanticColorToken, ColorPrimitive>>;
