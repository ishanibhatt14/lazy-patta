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
} as const satisfies Record<string, ColorPrimitive>;

export type SemanticColorToken = keyof typeof semanticColorTokens;
