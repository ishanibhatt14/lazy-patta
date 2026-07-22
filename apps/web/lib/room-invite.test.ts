import { describe, expect, it } from 'vitest';

import { buildRoomInviteUrl, isValidRoomCode, normalizeRoomCode } from './room-invite';
import { siteConfig } from './site-config';

describe('room-invite', () => {
  it('normalizes codes to trimmed uppercase', () => {
    expect(normalizeRoomCode('  lp57ab ')).toBe('LP57AB');
  });

  it('accepts valid codes and rejects malformed ones', () => {
    expect(isValidRoomCode('LP57AB')).toBe(true);
    expect(isValidRoomCode('lp57ab')).toBe(true);
    expect(isValidRoomCode('AB')).toBe(false); // too short
    expect(isValidRoomCode('LP 57AB')).toBe(false); // space
    expect(isValidRoomCode('LP/57AB')).toBe(false); // path injection
    expect(isValidRoomCode('LP?x=1')).toBe(false); // query injection
    expect(isValidRoomCode('IO0101')).toBe(false); // ambiguous characters
  });

  it('builds a canonical invite URL on the permanent domain', () => {
    const url = buildRoomInviteUrl('lp57ab');
    expect(url).toBe(`${siteConfig.canonicalOrigin}/join/LP57AB`);
    expect(url).toContain('lazypatta.com');
    expect(url).not.toContain('vercel.app');
    expect(url).not.toContain('localhost');
  });

  it('throws on unsafe codes rather than emitting an injectable URL', () => {
    expect(() => buildRoomInviteUrl('../evil')).toThrow();
    expect(() => buildRoomInviteUrl('')).toThrow();
  });
});
