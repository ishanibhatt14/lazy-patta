import { cssVarName, resolveColors } from './resolve';
import { type SemanticColorToken } from './semantic';

/**
 * Generate the theme CSS custom-property blocks. `:root` carries the default
 * (Classic Cream) light theme; `[data-theme="dark"]` re-declares only the roles
 * the dark theme changes. Web components read `var(--lp-...)`, so flipping the
 * `data-theme` attribute on the document restyles the whole app with no class
 * changes.
 */
export function toCssVariables(): string {
  const light = resolveColors('light');
  const dark = resolveColors('dark');
  const tokens = Object.keys(light) as SemanticColorToken[];

  const rootLines = tokens.map((token) => `  ${cssVarName(token)}: ${light[token]};`).join('\n');
  const darkLines = tokens
    .filter((token) => dark[token] !== light[token])
    .map((token) => `  ${cssVarName(token)}: ${dark[token]};`)
    .join('\n');

  return `:root {\n${rootLines}\n}\n\n[data-theme="dark"] {\n${darkLines}\n}\n`;
}
