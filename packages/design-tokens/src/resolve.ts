import { primitives } from './primitives';
import { type SemanticColorToken, semanticColorTokens } from './semantic';

/** Resolve every semantic color token to its concrete hex value. */
export function resolveColors(): Record<SemanticColorToken, string> {
  const out = {} as Record<SemanticColorToken, string>;
  for (const token of Object.keys(semanticColorTokens) as SemanticColorToken[]) {
    out[token] = primitives.color[semanticColorTokens[token]];
  }
  return out;
}

/** CSS custom-property name for a semantic token, e.g. `--lp-background-canvas`. */
export function cssVarName(token: SemanticColorToken): string {
  return `--lp-${token.replace(/\./g, '-')}`;
}
