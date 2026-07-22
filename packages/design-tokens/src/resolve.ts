import { primitives } from './primitives';
import { darkThemeOverrides, type SemanticColorToken, semanticColorTokens } from './semantic';

export type ThemeName = 'light' | 'dark';

/**
 * Resolve every semantic color token to its concrete hex value for a theme.
 * Defaults to `light` so existing callers are unaffected; `dark` layers
 * {@link darkThemeOverrides} on top of the light role map.
 */
export function resolveColors(theme: ThemeName = 'light'): Record<SemanticColorToken, string> {
  const overrides: Partial<Record<SemanticColorToken, keyof typeof primitives.color>> =
    theme === 'dark' ? darkThemeOverrides : {};
  const out = {} as Record<SemanticColorToken, string>;
  for (const token of Object.keys(semanticColorTokens) as SemanticColorToken[]) {
    const primitiveKey = overrides[token] ?? semanticColorTokens[token];
    out[token] = primitives.color[primitiveKey];
  }
  return out;
}

/** CSS custom-property name for a semantic token, e.g. `--lp-background-canvas`. */
export function cssVarName(token: SemanticColorToken): string {
  return `--lp-${token.replace(/\./g, '-')}`;
}
