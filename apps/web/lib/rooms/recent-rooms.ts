import type { GameSlug } from '../game-discovery';
import { normalizeRoomCode } from '../room-invite';

export interface RecentRoomReference {
  readonly roomCode: string;
  readonly gameSlug: GameSlug;
  readonly tableName?: string;
  readonly lastVisitedAt: string;
}

const KEY = 'lazy-patta:recent-rooms';
const LIMIT = 5;

function readStorage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage;
}

export function readRecentRooms(): readonly RecentRoomReference[] {
  const storage = readStorage();
  if (!storage) return [];
  try {
    const value = JSON.parse(storage.getItem(KEY) ?? '[]') as unknown;
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is RecentRoomReference => {
        if (!item || typeof item !== 'object') return false;
        const record = item as Partial<RecentRoomReference>;
        return (
          typeof record.roomCode === 'string' &&
          typeof record.gameSlug === 'string' &&
          typeof record.lastVisitedAt === 'string'
        );
      })
      .slice(0, LIMIT);
  } catch {
    return [];
  }
}

export function rememberRecentRoom(reference: Omit<RecentRoomReference, 'lastVisitedAt'>): void {
  const storage = readStorage();
  if (!storage) return;
  const roomCode = normalizeRoomCode(reference.roomCode);
  const next: RecentRoomReference = {
    ...reference,
    roomCode,
    lastVisitedAt: new Date().toISOString(),
  };
  const existing = readRecentRooms().filter((room) => room.roomCode !== roomCode);
  storage.setItem(KEY, JSON.stringify([next, ...existing].slice(0, LIMIT)));
}

export function removeRecentRoom(roomCode: string): void {
  const storage = readStorage();
  if (!storage) return;
  const normalized = normalizeRoomCode(roomCode);
  storage.setItem(
    KEY,
    JSON.stringify(readRecentRooms().filter((room) => room.roomCode !== normalized)),
  );
}
