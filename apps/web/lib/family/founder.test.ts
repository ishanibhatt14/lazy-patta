import { describe, expect, it } from 'vitest';

import { FOUNDER_WINDOW_CLOSES, isFounderFamily } from './founder';

describe('isFounderFamily', () => {
  it('treats a family created inside the window as a founder', () => {
    expect(isFounderFamily('2026-07-23T00:00:00Z')).toBe(true);
  });

  it('treats a family created after the window as a regular member', () => {
    expect(isFounderFamily('2027-01-01T00:00:00Z')).toBe(false);
  });

  it('includes the exact window boundary', () => {
    expect(isFounderFamily(FOUNDER_WINDOW_CLOSES)).toBe(true);
  });

  it('accepts a Date as well as an ISO string', () => {
    expect(isFounderFamily(new Date('2026-01-01T00:00:00Z'))).toBe(true);
  });

  it('returns false for missing or unparseable dates', () => {
    expect(isFounderFamily(undefined)).toBe(false);
    expect(isFounderFamily(null)).toBe(false);
    expect(isFounderFamily('not-a-date')).toBe(false);
  });

  it('honours a custom window', () => {
    const cutoff = new Date('2026-01-01T00:00:00Z');
    expect(isFounderFamily('2025-12-31T00:00:00Z', cutoff)).toBe(true);
    expect(isFounderFamily('2026-02-01T00:00:00Z', cutoff)).toBe(false);
  });
});
