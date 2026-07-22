import { describe, expect, it } from 'vitest';

import { resolveApplied } from './theme';

describe('resolveApplied', () => {
  it('honours an explicit light or dark choice regardless of the OS preference', () => {
    expect(resolveApplied('light', true)).toBe('light');
    expect(resolveApplied('light', false)).toBe('light');
    expect(resolveApplied('dark', false)).toBe('dark');
    expect(resolveApplied('dark', true)).toBe('dark');
  });

  it('follows the OS preference when the choice is "system"', () => {
    expect(resolveApplied('system', true)).toBe('dark');
    expect(resolveApplied('system', false)).toBe('light');
  });
});
