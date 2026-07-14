import { siteConfig } from './site-config';

/**
 * Centralized room-invite URL generation. Share links must always point at the
 * canonical public domain — never `window.location.origin`, which would leak a
 * preview or localhost origin into a link a family member opens days later.
 *
 * Room codes are the short alphanumeric handles produced by the room RPCs. We
 * normalize (trim + uppercase) and validate the character set before building
 * the URL so a malformed code can never inject path segments or query strings.
 */

/** Uppercase letters and digits only — matches the server's room-code alphabet. */
const ROOM_CODE_PATTERN = /^[A-Z0-9]{4,12}$/;

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_PATTERN.test(normalizeRoomCode(code));
}

/**
 * Builds the canonical invite URL for a room, e.g.
 * `https://lazypatta.com/join/BA2026`. This is the path registered for mobile
 * Universal Links / App Links, so both web and installed apps resolve it.
 *
 * @throws if the code is not a valid room code after normalization.
 */
export function buildRoomInviteUrl(roomCode: string): string {
  const normalized = normalizeRoomCode(roomCode);
  if (!isValidRoomCode(normalized)) {
    throw new Error(`Invalid room code: "${roomCode}"`);
  }
  return new URL(`/join/${encodeURIComponent(normalized)}`, siteConfig.canonicalOrigin).toString();
}
