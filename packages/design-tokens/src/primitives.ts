/**
 * Primitive design values — raw, role-free. Components must NEVER reference
 * primitives directly; they reference semantic tokens (see semantic.ts).
 * Palette per docs/02-design-system/color.md.
 */
export const primitives = {
  color: {
    cream: '#FFF7E8',
    white: '#FFFFFF',
    maroon: '#7A1F2B',
    saffron: '#F6A623',
    teal: '#0F766E',
    feltGreen: '#1F6B4F',
    ink: '#1F1B16',
    errorRed: '#C62828',
  },
  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 20,
    pill: 999,
  },
} as const;

export type ColorPrimitive = keyof typeof primitives.color;
