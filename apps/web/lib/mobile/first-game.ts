import type { GameSlug } from './game-registry';

/**
 * Tracks which games a player has already been walked through, so the first time
 * they open a game the how-to-play steps appear automatically — and never
 * interrupt again afterwards. This is per-game and per-device: learning Kachuful
 * says nothing about whether they know Jhabbu. It is a teaching aid, not a gate;
 * the tutorial is always replayable from the game's own How to Play.
 */

const KEY = 'lazy-patta:mobile-seen-games:v1';

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readSeen(): Set<string> {
  const raw = storage()?.getItem(KEY) ?? null;
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

export function hasSeenFirstGame(slug: GameSlug): boolean {
  return readSeen().has(slug);
}

export function markFirstGameSeen(slug: GameSlug): void {
  const seen = readSeen();
  if (seen.has(slug)) return;
  seen.add(slug);
  try {
    storage()?.setItem(KEY, JSON.stringify([...seen]));
  } catch {
    // A missed "seen" flag only re-teaches once more; not worth surfacing.
  }
}
