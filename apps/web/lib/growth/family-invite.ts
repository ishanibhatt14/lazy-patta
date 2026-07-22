import type { Translator } from '../i18n';
import { buildRoomInviteUrl, normalizeRoomCode } from '../room-invite';

export type FamilyInviteShareResult = 'native' | 'whatsapp' | 'copied' | 'cancelled';

export interface FamilyInvitePayload {
  readonly roomCode: string;
  readonly joinUrl?: string;
  readonly gameName: string;
  readonly inviterName?: string;
  readonly occupiedSeats?: number;
  readonly maxPlayers?: number;
}

export function familyInviteText(payload: FamilyInvitePayload, t: Translator): string {
  const roomCode = normalizeRoomCode(payload.roomCode);
  const joinUrl = payload.joinUrl ?? buildRoomInviteUrl(roomCode);
  return t.format('rooms.inviteFamilyMessage', {
    inviter: payload.inviterName ?? t.t('rooms.inviterFallback'),
    game: payload.gameName,
    code: roomCode,
    occupied: payload.occupiedSeats ?? 1,
    max: payload.maxPlayers ?? 4,
    url: joinUrl,
  });
}

export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function shareFamilyInvite(payload: ShareData): Promise<FamilyInviteShareResult> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(payload);
      return 'native';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }
  return 'whatsapp';
}
