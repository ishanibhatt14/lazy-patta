import type { ReactElement } from 'react';

/**
 * A faint, tiled card-suit texture for headers and hero panels. Drawn as an
 * inline SVG <pattern> using `currentColor`, so the caller tints it with a text
 * token (e.g. `text-action-secondary`) at low opacity and it re-themes with the
 * app. Absolutely fills its positioned parent; decorative and `aria-hidden`.
 */
export function PatternBackground({
  className,
  opacity = 0.06,
}: {
  readonly className?: string;
  readonly opacity?: number;
}): ReactElement {
  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ''}`}
      style={{ opacity }}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="lp-suits" width="56" height="56" patternUnits="userSpaceOnUse">
          <text x="8" y="24" fontSize="20" fill="currentColor">
            ♠
          </text>
          <text x="36" y="24" fontSize="20" fill="currentColor">
            ♥
          </text>
          <text x="8" y="52" fontSize="20" fill="currentColor">
            ♦
          </text>
          <text x="36" y="52" fontSize="20" fill="currentColor">
            ♣
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lp-suits)" />
    </svg>
  );
}
