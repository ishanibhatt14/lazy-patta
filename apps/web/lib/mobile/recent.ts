import { findCatalogItem, type MobileCatalogItem } from '../mobile-catalog';

/**
 * The last game the player actually launched from the mobile app, so Home can
 * offer a one-tap "play again". Stored per-device in localStorage — there is no
 * account, and this is a convenience hint, not authoritative state. Only a known
 * catalog id is ever returned, so a stale or tampered value can never link to a
 * broken route.
 */

const RECENT_GAME_KEY = 'lazy-patta:mobile-recent-game';

export function rememberRecentGame(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENT_GAME_KEY, id);
  } catch {
    // Private-mode / storage-disabled: a missing hint is not worth surfacing.
  }
}

export function readRecentGame(): MobileCatalogItem | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const id = window.localStorage.getItem(RECENT_GAME_KEY);
    return id ? findCatalogItem(id) : undefined;
  } catch {
    return undefined;
  }
}
