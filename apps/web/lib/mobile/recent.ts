import { findCatalogItem, type MobileCatalogItem } from '../mobile-catalog';

/**
 * The last game the player actually launched from the mobile app, so Home can
 * offer a one-tap "play again" and an honest "when". Stored per-device in
 * localStorage — there is no account, and this is a convenience hint, not
 * authoritative state. Only a known catalog id is ever returned, so a stale or
 * tampered value can never link to a broken route.
 *
 * The stored shape is `{ id, at }` (game id + launch timestamp). A bare string
 * from an older build is still read as the id with no timestamp, so upgrading
 * never loses the last-played hint.
 */

const RECENT_GAME_KEY = 'lazy-patta:mobile-recent-game';

export interface RecentPlay {
  readonly item: MobileCatalogItem;
  /** Epoch ms when the game was launched, or undefined for a pre-timestamp value. */
  readonly playedAt: number | undefined;
}

interface StoredRecent {
  readonly id: string;
  readonly at: number;
}

export function rememberRecentGame(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: StoredRecent = { id, at: Date.now() };
    window.localStorage.setItem(RECENT_GAME_KEY, JSON.stringify(payload));
  } catch {
    // Private-mode / storage-disabled: a missing hint is not worth surfacing.
  }
}

/** Parse the stored value, tolerating both the `{id, at}` shape and a bare id. */
function parseStored(raw: string): { id: string; at: number | undefined } | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<StoredRecent>;
      if (typeof parsed.id !== 'string') return undefined;
      return { id: parsed.id, at: typeof parsed.at === 'number' ? parsed.at : undefined };
    } catch {
      return undefined;
    }
  }
  return { id: trimmed, at: undefined };
}

function readStored(): { id: string; at: number | undefined } | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(RECENT_GAME_KEY);
    return raw ? parseStored(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function readRecentPlay(): RecentPlay | undefined {
  const stored = readStored();
  if (!stored) return undefined;
  const item = findCatalogItem(stored.id);
  return item ? { item, playedAt: stored.at } : undefined;
}
