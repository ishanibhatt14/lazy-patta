import type { GameAccent } from '../../lib/mobile-catalog';

/**
 * Maps a catalog accent to semantic theme tokens only — never a hardcoded hex —
 * so a theme swap restyles every tile. `text` is chosen for contrast against the
 * solid accent fill (saffron is light, so it pairs with the ink text role).
 */
export const ACCENT_CLASSES: Record<GameAccent, { readonly fill: string; readonly text: string }> =
  {
    maroon: { fill: 'bg-action-primary', text: 'text-text-onBrand' },
    teal: { fill: 'bg-brand-accent', text: 'text-text-onBrand' },
    saffron: { fill: 'bg-action-secondary', text: 'text-text-primary' },
    indigo: { fill: 'bg-accent-indigo', text: 'text-text-onBrand' },
  };
