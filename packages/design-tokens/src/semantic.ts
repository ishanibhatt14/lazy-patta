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
  // Mehfil Table is teal-led: the primary action/heading role is the deep peacock
  // teal, with marigold saffron as the small warm accent (`action.secondary`).
  // Maroon steps back to a heritage role on card backs (card.back) rather than
  // leading the UI. Cream text on teal passes AA (see color.md). `brand.accent`
  // stays teal: it drives focus rings, and with the components' outline-offset the
  // teal ring reads on the cream canvas (~5.6:1) even around teal buttons — a
  // marigold ring would fail contrast on cream/white.
  'action.primary': 'teal',
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
 * here and inherits every other role from the light map above. The dark theme stays
 * teal-led to match Mehfil Table: `action.primary` maps to the brighter `tealLight`
 * so it reads both as heading text on the plum-black canvas AND as a filled button
 * with dark `text.onBrand` (ink) on top. `action.secondary` is marigold `gold`;
 * `brand.accent` (focus rings) stays `tealLight`, high-contrast on the plum canvas.
 */
export const darkThemeOverrides = {
  'background.canvas': 'plumBlack',
  'surface.primary': 'plumRaised',
  'text.primary': 'ivory',
  'text.onBrand': 'ink',
  'action.primary': 'tealLight',
  'action.secondary': 'gold',
  'brand.accent': 'tealLight',
  'status.error': 'coralLight',
} as const satisfies Partial<Record<SemanticColorToken, ColorPrimitive>>;
