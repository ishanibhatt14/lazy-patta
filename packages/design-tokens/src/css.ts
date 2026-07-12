import { cssVarName, resolveColors } from './resolve';
import { type SemanticColorToken } from './semantic';

/**
 * Generate the `:root` CSS custom-property block for the default (Classic Cream)
 * theme. Web components read `var(--lp-...)`; a theme swap re-declares this block.
 */
export function toCssVariables(): string {
  const colors = resolveColors();
  const lines = (Object.keys(colors) as SemanticColorToken[])
    .map((token) => `  ${cssVarName(token)}: ${colors[token]};`)
    .join('\n');
  return `:root {\n${lines}\n}\n`;
}
