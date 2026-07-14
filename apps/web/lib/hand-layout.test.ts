import { describe, expect, it } from 'vitest';

import { computeHandLayout, fanCardStyle } from './hand-layout';

/** Widths that mirror the tested device tiers (CSS px of the hand rail). */
const WIDTHS = [280, 320, 360, 390, 430, 768, 1440] as const;
/** Gadha Chor and Lal Satti both top out at 13 cards. */
const COUNTS = Array.from({ length: 13 }, (_, i) => i + 1);

/** The usable width the algorithm lays cards into (mirrors the module constant). */
function availableFor(containerWidth: number): number {
  return Math.max(containerWidth - 24, 240);
}

describe('computeHandLayout', () => {
  it('never lays out wider than the available width (no horizontal scroll)', () => {
    for (const largeCards of [false, true]) {
      for (const containerWidth of WIDTHS) {
        for (const count of COUNTS) {
          const layout = computeHandLayout({ containerWidth, count, largeCards });
          // A half-pixel tolerance absorbs floating-point rounding only.
          expect(layout.totalWidth).toBeLessThanOrEqual(availableFor(containerWidth) + 0.5);
        }
      }
    }
  });

  it('keeps every card at least a 1px left sliver (later cards paint on top)', () => {
    for (const largeCards of [false, true]) {
      for (const containerWidth of WIDTHS) {
        for (const count of COUNTS) {
          const layout = computeHandLayout({ containerWidth, count, largeCards });
          if (count > 1) expect(layout.step).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('shrinks the card size as the hand grows on a narrow phone', () => {
    const few = computeHandLayout({ containerWidth: 320, count: 3, largeCards: false });
    const many = computeHandLayout({ containerWidth: 320, count: 13, largeCards: false });
    expect(few.size).toBe('md');
    expect(many.size).toBe('sm');
  });

  it('large mode reaches for a bigger card than normal mode at the same width', () => {
    const normal = computeHandLayout({ containerWidth: 768, count: 5, largeCards: false });
    const large = computeHandLayout({ containerWidth: 768, count: 5, largeCards: true });
    const order = { sm: 0, md: 1, lg: 2 } as const;
    expect(order[large.size]).toBeGreaterThanOrEqual(order[normal.size]);
    expect(large.size).toBe('lg');
  });

  it('keeps large mode visibly larger for a full mobile hand', () => {
    const normal = computeHandLayout({ containerWidth: 390, count: 13, largeCards: false });
    const large = computeHandLayout({ containerWidth: 390, count: 13, largeCards: true });
    const order = { sm: 0, md: 1, lg: 2 } as const;
    expect(order[large.size]).toBeGreaterThan(order[normal.size]);
  });

  it('never overlaps a single card and reports its full width', () => {
    const layout = computeHandLayout({ containerWidth: 390, count: 1, largeCards: false });
    expect(layout.step).toBe(layout.cardWidth);
    expect(layout.totalWidth).toBe(layout.cardWidth);
    expect(layout.rotationStep).toBe(0);
  });

  it('flattens the fan (less rotation) in large-card mode', () => {
    const normal = computeHandLayout({ containerWidth: 390, count: 8, largeCards: false });
    const large = computeHandLayout({ containerWidth: 390, count: 8, largeCards: true });
    expect(large.rotationStep).toBeLessThan(normal.rotationStep);
  });
});

describe('fanCardStyle', () => {
  it('anchors the first card flush and overlaps the rest with negative margin', () => {
    const layout = computeHandLayout({ containerWidth: 320, count: 10, largeCards: false });
    const first = fanCardStyle(0, 10, layout);
    const second = fanCardStyle(1, 10, layout);
    expect(first.marginLeft).toBe('0px');
    // Overlap == cardWidth - step, expressed as a negative margin.
    expect(second.marginLeft).toBe(`${-(layout.cardWidth - layout.step)}px`);
  });

  it('assigns an increasing paint order so later cards sit above earlier ones', () => {
    const layout = computeHandLayout({ containerWidth: 320, count: 5, largeCards: false });
    const zs = Array.from(
      { length: 5 },
      (_, i) => (fanCardStyle(i, 5, layout) as Record<string, unknown>)['--card-z'],
    );
    expect(zs).toEqual([1, 2, 3, 4, 5]);
  });

  it('pivots rotation around the bottom center', () => {
    const layout = computeHandLayout({ containerWidth: 390, count: 6, largeCards: false });
    expect(fanCardStyle(0, 6, layout).transformOrigin).toBe('bottom center');
  });
});
