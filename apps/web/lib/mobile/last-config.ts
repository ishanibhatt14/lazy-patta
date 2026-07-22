import {
  normalizeComputerGameConfig,
  validateComputerGameConfig,
  type ComputerGameConfig,
} from './computer-session';
import { findGameDefinition, type GameSlug } from './game-registry';

/**
 * Remembers the last computer-setup a player confirmed for a given game so the
 * next launch is a single tap ("Quick Play") instead of re-choosing player
 * count and difficulty every time. This is deliberately per-game: a player's
 * ideal Jhabbu table (7 players, hard) has nothing to do with their Gadha Chor
 * table. Reads are fail-safe — a corrupt or stale blob yields `null` and the
 * caller falls back to the game's default config.
 */

const KEY_PREFIX = 'lazy-patta:mobile-last-config:v1:';

function keyFor(slug: GameSlug): string {
  return `${KEY_PREFIX}${slug}`;
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readLastConfig(slug: GameSlug): ComputerGameConfig | null {
  const raw = storage()?.getItem(keyFor(slug)) ?? null;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ComputerGameConfig>;
    if (parsed.gameSlug !== slug) return null;
    if (!findGameDefinition(slug)) return null;
    const normalized = normalizeComputerGameConfig({
      gameSlug: slug,
      humanName: typeof parsed.humanName === 'string' ? parsed.humanName : '',
      playerCount: typeof parsed.playerCount === 'number' ? parsed.playerCount : 0,
      difficulty: parsed.difficulty,
      reducedMotion: parsed.reducedMotion === true,
      confirmBeforePlay: parsed.confirmBeforePlay === true,
    });
    validateComputerGameConfig(normalized);
    return normalized;
  } catch {
    return null;
  }
}

export function writeLastConfig(config: ComputerGameConfig): void {
  try {
    const normalized = normalizeComputerGameConfig(config);
    validateComputerGameConfig(normalized);
    storage()?.setItem(keyFor(normalized.gameSlug), JSON.stringify(normalized));
  } catch {
    // A config that can't be normalized isn't worth remembering; drop it
    // silently rather than surfacing a storage error into the launch path.
  }
}
