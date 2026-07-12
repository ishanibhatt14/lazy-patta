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
} as const satisfies Record<string, ColorPrimitive>;

export type SemanticColorToken = keyof typeof semanticColorTokens;
