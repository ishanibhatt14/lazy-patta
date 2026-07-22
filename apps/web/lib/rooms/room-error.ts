import type { MessageKey } from '@lazy-patta/localization';

/**
 * Turns a raw room RPC / fetch failure into one of a small set of distinct,
 * localized, recovery-aware states. The room lifecycle RPCs raise stable,
 * server-controlled messages (see supabase/migrations/0005_room_rpcs.sql), so
 * matching on the message text is deterministic. Keeping this in one place is
 * how every room surface stays consistent (LP-111/LP-103): a "full" room and an
 * "expired" room never collapse into the same generic error again.
 */

export type RoomErrorReason = 'not-found' | 'full' | 'closed' | 'connection' | 'unknown';

export interface ClassifiedRoomError {
  readonly reason: RoomErrorReason;
  /** Retrying the exact same action could plausibly succeed. Non-retryable
   * reasons (full, expired, missing) must not offer a meaningless "Try Again". */
  readonly retryable: boolean;
  readonly titleKey: MessageKey;
  readonly bodyKey: MessageKey;
  /** Stable machine code for telemetry / correlation. */
  readonly code: string;
}

function build(
  reason: RoomErrorReason,
  retryable: boolean,
  titleKey: MessageKey,
  bodyKey: MessageKey,
): ClassifiedRoomError {
  return { reason, retryable, titleKey, bodyKey, code: `room_${reason}` };
}

function normalize(error: unknown): string {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === 'string') return error.toLowerCase();
  return '';
}

export function classifyRoomError(error: unknown): ClassifiedRoomError {
  const message = normalize(error);

  if (message.includes('room not found')) {
    return build('not-found', false, 'rooms.notFoundTitle', 'rooms.notFoundBody');
  }
  if (message.includes('room is full')) {
    return build('full', false, 'rooms.roomFullTitle', 'rooms.roomFullBody');
  }
  // 'room is not accepting players', 'room is not in lobby' — the round has
  // started or the room was abandoned/expired. Retrying will never succeed.
  if (
    message.includes('not accepting') ||
    message.includes('not in lobby') ||
    message.includes('already started')
  ) {
    return build('closed', false, 'rooms.roomClosedTitle', 'rooms.roomClosedBody');
  }
  // Transport-level failures: the request never reached a decisive answer, so a
  // retry is the right affordance.
  if (
    message === '' ||
    message.includes('failed to fetch') ||
    message.includes('load failed') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('aborted')
  ) {
    return build('connection', true, 'rooms.connectionTitle', 'rooms.connectionBody');
  }
  return build('unknown', true, 'rooms.unavailableTitle', 'rooms.errorGeneric');
}
