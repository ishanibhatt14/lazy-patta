import { describe, expect, it } from 'vitest';

import { buildRoomInviteUrl, isValidRoomCode, normalizeRoomCode } from './room-invite';
import { siteConfig } from './site-config';

describe('room-invite', () => {
  it('normalizes codes to trimmed uppercase', () => {
    expect(normalizeRoomCode('  ba2026 ')).toBe('BA2026');
  });

  it('accepts valid codes and rejects malformed ones', () => {
    expect(isValidRoomCode('BA2026')).toBe(true);
    expect(isValidRoomCode('ba2026')).toBe(true);
    expect(isValidRoomCode('AB')).toBe(false); // too short
    expect(isValidRoomCode('BA 2026')).toBe(false); // space
    expect(isValidRoomCode('BA/2026')).toBe(false); // path injection
    expect(isValidRoomCode('BA?x=1')).toBe(false); // query injection
  });

  it('builds a canonical invite URL on the permanent domain', () => {
    const url = buildRoomInviteUrl('ba2026');
    expect(url).toBe(`${siteConfig.canonicalOrigin}/join/BA2026`);
    expect(url).toContain('lazypatta.com');
    expect(url).not.toContain('vercel.app');
    expect(url).not.toContain('localhost');
  });

  it('throws on unsafe codes rather than emitting an injectable URL', () => {
    expect(() => buildRoomInviteUrl('../evil')).toThrow();
    expect(() => buildRoomInviteUrl('')).toThrow();
  });
});
