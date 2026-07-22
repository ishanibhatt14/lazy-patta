import { computerGameSessions } from './computer-session';
import { findGameDefinition, type GameSlug } from './game-registry';

/**
 * A pointer to the computer game the player is currently in the middle of, so
 * Home can offer a real "Continue" that drops them back onto the live table —
 * not a fresh setup. This is distinct from the "recent game" hint ([[recent]]),
 * which only remembers *which* game to replay. Resolving the pointer is
 * self-healing: if the referenced session is gone or already finished, the
 * pointer is cleared and Home falls back to the replay hint.
 */

const KEY = 'lazy-patta:mobile-active-session:v1';

export interface ActiveSessionPointer {
  readonly gameSlug: GameSlug;
  readonly sessionId: string;
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function rememberActiveSession(pointer: ActiveSessionPointer): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(pointer));
  } catch {
    // Storage disabled: resuming is a convenience, not worth surfacing.
  }
}

export function clearActiveSession(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // Ignore — a lingering pointer self-heals on the next resolve.
  }
}

export function readActiveSessionPointer(): ActiveSessionPointer | null {
  const raw = storage()?.getItem(KEY) ?? null;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ActiveSessionPointer>;
    if (typeof parsed.sessionId !== 'string' || typeof parsed.gameSlug !== 'string') return null;
    if (!findGameDefinition(parsed.gameSlug)) return null;
    return { gameSlug: parsed.gameSlug, sessionId: parsed.sessionId };
  } catch {
    return null;
  }
}

/**
 * The pointer, but only if it still points at a live, resumable session. A
 * missing, finished, or mismatched session clears the pointer and yields null.
 */
export async function resolveActiveSession(): Promise<ActiveSessionPointer | null> {
  const pointer = readActiveSessionPointer();
  if (!pointer) return null;
  const session = await computerGameSessions.load(pointer.sessionId);
  if (!session || session.gameSlug !== pointer.gameSlug || session.status === 'abandoned') {
    clearActiveSession();
    return null;
  }
  return pointer;
}
