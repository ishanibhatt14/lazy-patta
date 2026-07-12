import { describe, expect, it } from 'vitest';

import { toCssVariables } from './css';
import { primitives } from './primitives';
import { reactNativeTokens } from './react-native';
import { cssVarName, resolveColors } from './resolve';
import { semanticColorTokens } from './semantic';

const HEX = /^#[0-9A-Fa-f]{6}$/;

describe('design tokens', () => {
  it('every semantic token resolves to a defined primitive', () => {
    for (const primitiveKey of Object.values(semanticColorTokens)) {
      expect(primitives.color).toHaveProperty(primitiveKey);
    }
  });

  it('every resolved color is a valid hex value', () => {
    for (const value of Object.values(resolveColors())) {
      expect(value).toMatch(HEX);
    }
  });

  it('web (CSS) and native exports carry the same token set and values', () => {
    const resolved = resolveColors();
    // Native carries identical resolved values.
    expect(reactNativeTokens.color).toEqual(resolved);
    // CSS declares one custom property per semantic token, with matching values.
    const css = toCssVariables();
    for (const [token, value] of Object.entries(resolved)) {
      expect(css).toContain(`${cssVarName(token as keyof typeof resolved)}: ${value};`);
    }
  });

  it('exposes no raw hex under semantic names (roles reference primitives only)', () => {
    for (const value of Object.values(semanticColorTokens)) {
      expect(value).not.toMatch(HEX);
    }
  });
});
