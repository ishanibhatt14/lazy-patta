import { primitives } from './primitives';
import { cssVarName, resolveColors } from './resolve';
import { type SemanticColorToken } from './semantic';

/**
 * A Tailwind preset exposing semantic color roles as utilities backed by CSS
 * variables (e.g. `bg-canvas` → `var(--lp-background-canvas)`), so a theme swap
 * that re-declares the vars restyles the whole app with no class changes.
 */
function colorScale(): Record<string, string> {
  const colors = resolveColors();
  const out: Record<string, string> = {};
  for (const token of Object.keys(colors) as SemanticColorToken[]) {
    // "background.canvas" -> "background-canvas"
    out[token.replace(/\./g, '-')] = `var(${cssVarName(token)})`;
  }
  return out;
}

export const tailwindPreset = {
  theme: {
    extend: {
      colors: colorScale(),
      borderRadius: {
        sm: `${primitives.radius.sm}px`,
        md: `${primitives.radius.md}px`,
        lg: `${primitives.radius.lg}px`,
      },
    },
  },
};
