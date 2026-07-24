/**
 * The player's chosen display name, stored per-device in localStorage. There are
 * no accounts — this is a purely local convenience so the app can greet the
 * player by name instead of "Guest". A blank value means "no name set"; the UI
 * falls back to the guest greeting. Trimmed and length-capped so a stray paste
 * can never blow out the header layout.
 */

const DISPLAY_NAME_KEY = 'lazy-patta:mobile-display-name';
const MAX_LENGTH = 24;

export function normalizeDisplayName(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_LENGTH);
}

export function readDisplayName(): string {
  if (typeof window === 'undefined') return '';
  try {
    return normalizeDisplayName(window.localStorage.getItem(DISPLAY_NAME_KEY) ?? '');
  } catch {
    return '';
  }
}

export function saveDisplayName(value: string): void {
  if (typeof window === 'undefined') return;
  const next = normalizeDisplayName(value);
  try {
    if (next) {
      window.localStorage.setItem(DISPLAY_NAME_KEY, next);
    } else {
      window.localStorage.removeItem(DISPLAY_NAME_KEY);
    }
  } catch {
    // Private-mode / storage-disabled: a missing name just means "Guest".
  }
}
