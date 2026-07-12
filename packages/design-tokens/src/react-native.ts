import { primitives } from './primitives';
import { resolveColors } from './resolve';

/**
 * The React Native token object. Expo/RN has no CSS variables, so it consumes
 * resolved values directly — the same values the web CSS vars point at.
 */
export const reactNativeTokens = {
  color: resolveColors(),
  space: primitives.space,
  radius: primitives.radius,
} as const;
