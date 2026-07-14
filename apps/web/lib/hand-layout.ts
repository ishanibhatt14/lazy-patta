import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';

import type { PlayingCardSize } from '../components/PlayingCard';

/**
 * Shared responsive layout for the human hand fan, used by both Gadha Chor and
 * Lal Satti so the two modes fit their complete hand without a horizontal
 * scrollbar and without clipping a card's rank/suit. The algorithm is pure and
 * unit-testable; a thin hook measures the live container width.
 *
 * The lever that actually prevents page overflow is *layout width* — transforms
 * (scale/rotate) do not shrink `scrollWidth`, so we never rely on them to fit.
 * Instead we pick a real card size and a negative-margin overlap such that the
 * laid-out row is always <= the available width. Later cards paint on top of
 * earlier ones, so every card keeps its top-left rank/suit corner visible; the
 * final card is fully visible.
 */

/** Unscaled pixel footprint of each PlayingCard size (matches PlayingCard.tsx). */
const SIZE_PX: Record<PlayingCardSize, { readonly w: number; readonly h: number }> = {
  sm: { w: 48, h: 64 },
  md: { w: 64, h: 96 },
  lg: { w: 96, h: 144 },
};

/** Horizontal breathing room reserved on each side of the fan. */
const EDGE_PADDING = 12;
/** Never assume less than this usable width (keeps SSR + tiny cases sane). */
const MIN_AVAILABLE = 240;
/** Extra room past a full card before we stop overlapping (roomy, few cards). */
const COMFORT_GAP = 8;

/**
 * Minimum visible left sliver (px) that still shows a card's rank + suit corner.
 * Normal mode keeps a readable sliver per card. Large-card mode intentionally
 * allows a tighter sliver because the focused card is brought fully forward, so
 * the reader taps/keys to a card to read it rather than reading every sliver.
 */
const NORMAL_SLIVER = { ratio: 0.34, floor: 20 } as const;
const LARGE_SLIVER = { ratio: 0, floor: 22 } as const;

export interface HandLayout {
  readonly size: PlayingCardSize;
  /** Distance (px) between adjacent card left edges. Smaller = more overlap. */
  readonly step: number;
  /** Unscaled width (px) of the chosen card size. */
  readonly cardWidth: number;
  /** Degrees of rotation applied per card away from the fan centre. */
  readonly rotationStep: number;
  /** Downward arc (rem) applied per card away from the centre. */
  readonly arcUnit: number;
  /** Total laid-out width (px) of the fan. */
  readonly totalWidth: number;
}

export interface ComputeHandLayoutOptions {
  readonly containerWidth: number;
  readonly count: number;
  readonly largeCards: boolean;
}

function sliverFor(size: PlayingCardSize, largeCards: boolean): number {
  const spec = largeCards ? LARGE_SLIVER : NORMAL_SLIVER;
  return Math.max(SIZE_PX[size].w * spec.ratio, spec.floor);
}

/** Card sizes to try, largest first. Large mode reaches for bigger cards. */
function sizeLadder(largeCards: boolean): readonly PlayingCardSize[] {
  return largeCards ? (['lg', 'md'] as const) : (['md', 'sm'] as const);
}

function rotationAndArc(
  count: number,
  largeCards: boolean,
): {
  rotationStep: number;
  arcUnit: number;
} {
  if (count <= 1) return { rotationStep: 0, arcUnit: 0 };
  // Flatter, calmer fan as the hand grows; large mode flattens further so the
  // focused card reads cleanly against its neighbours.
  const rawStep = Math.min(5, 46 / count);
  const rotationStep = largeCards ? rawStep * 0.45 : rawStep;
  const arcUnit = largeCards ? 0.05 : 0.1;
  return { rotationStep, arcUnit };
}

/**
 * Pick the largest card size whose readable sliver fits the available width; if
 * none fits (an extreme hand on a tiny screen), fall back to the smallest size
 * and clamp the step so the row still fits — a partial rank remains visible and,
 * crucially, no horizontal scrollbar ever appears.
 */
export function computeHandLayout({
  containerWidth,
  count,
  largeCards,
}: ComputeHandLayoutOptions): HandLayout {
  // Respect the real container: a positive measurement is always the ceiling,
  // so we never assume more width than exists and never overflow the clipped
  // rail. The MIN_AVAILABLE floor only rescues the unmeasured (SSR / 0) case.
  const usable = containerWidth - EDGE_PADDING * 2;
  const available = usable > 0 ? usable : MIN_AVAILABLE;
  const ladder = sizeLadder(largeCards);
  const { rotationStep, arcUnit } = rotationAndArc(count, largeCards);

  if (count <= 1) {
    const size = ladder[0]!;
    const cardWidth = SIZE_PX[size].w;
    return { size, step: cardWidth, cardWidth, rotationStep: 0, arcUnit: 0, totalWidth: cardWidth };
  }

  const finalise = (size: PlayingCardSize, step: number): HandLayout => {
    const cardWidth = SIZE_PX[size].w;
    return {
      size,
      step,
      cardWidth,
      rotationStep,
      arcUnit,
      totalWidth: cardWidth + (count - 1) * step,
    };
  };

  for (const size of ladder) {
    const w = SIZE_PX[size].w;
    const stepFit = (available - w) / (count - 1);
    const minSliver = sliverFor(size, largeCards);
    if (stepFit >= minSliver) {
      const step = Math.min(w + COMFORT_GAP, stepFit);
      return finalise(size, step);
    }
  }

  // Nothing kept a readable sliver: use the smallest size and clamp to fit.
  const size = ladder[ladder.length - 1]!;
  const w = SIZE_PX[size].w;
  const stepFit = (available - w) / (count - 1);
  return finalise(size, Math.max(stepFit, 1));
}

/**
 * Measure the fan container and derive the responsive layout. Falls back to a
 * sensible width before the first measurement (SSR / first paint), then updates
 * on resize via ResizeObserver.
 */
export function useHandLayout(
  count: number,
  largeCards: boolean,
): { readonly ref: RefObject<HTMLDivElement | null>; readonly layout: HandLayout } {
  const ref = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(360);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const measure = (): void => {
      const width = node.clientWidth;
      if (width > 0) setContainerWidth(width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () => computeHandLayout({ containerWidth, count, largeCards }),
    [containerWidth, count, largeCards],
  );

  return { ref, layout };
}

/**
 * The resting style for a single fanned card: overlap via negative margin,
 * rotation + slight arc around the bottom pivot, and a paint-order z-index
 * exposed as `--card-z` so CSS interaction states can lift a card above its
 * neighbours.
 */
export function fanCardStyle(index: number, count: number, layout: HandLayout): CSSProperties {
  const mid = (count - 1) / 2;
  const angle = count <= 1 ? 0 : (index - mid) * layout.rotationStep;
  const arc = count <= 1 ? 0 : Math.abs(index - mid) * layout.arcUnit;
  const marginLeft = index === 0 ? 0 : -(layout.cardWidth - layout.step);
  return {
    marginLeft: `${marginLeft}px`,
    transform: `rotate(${angle}deg) translateY(${arc}rem)`,
    transformOrigin: 'bottom center',
    ['--card-z' as string]: index + 1,
  };
}
