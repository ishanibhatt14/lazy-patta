import { type SupabaseClient } from '@supabase/supabase-js';

/**
 * Typed wrappers over the player-safety RPCs (migration 0018). As everywhere in
 * the room stack, clients hold no direct writes: reporting and blocking flow
 * through SECURITY DEFINER functions that stamp the caller from auth.uid(). RLS
 * lets a user read only their own reports and blocks, so this module can surface
 * "who have I blocked" but never "who has blocked or reported me".
 */

export type ReportReason = 'abuse' | 'cheating' | 'inappropriate_name' | 'spam' | 'other';

export const REPORT_REASONS: readonly ReportReason[] = [
  'abuse',
  'cheating',
  'inappropriate_name',
  'spam',
  'other',
];

export interface PlayerBlock {
  readonly blocker_id: string;
  readonly blocked_user_id: string;
  readonly created_at?: string;
}

export interface ReportPlayerInput {
  readonly reportedUserId: string;
  readonly reason: ReportReason;
  readonly roomId?: string;
  readonly details?: string;
}

/** Flag another player. Returns nothing useful; throws on failure. */
export async function reportPlayer(
  client: SupabaseClient,
  input: ReportPlayerInput,
): Promise<void> {
  const { error } = await client.rpc('report_player', {
    p_reported_user_id: input.reportedUserId,
    p_reason: input.reason,
    p_room_id: input.roomId ?? null,
    p_details: input.details ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Add a player to the caller's personal block list (idempotent). */
export async function blockPlayer(
  client: SupabaseClient,
  blockedUserId: string,
): Promise<void> {
  const { error } = await client.rpc('block_player', {
    p_blocked_user_id: blockedUserId,
  });
  if (error) throw new Error(error.message);
}

/** Remove a player from the caller's block list. */
export async function unblockPlayer(
  client: SupabaseClient,
  blockedUserId: string,
): Promise<void> {
  const { error } = await client.rpc('unblock_player', {
    p_blocked_user_id: blockedUserId,
  });
  if (error) throw new Error(error.message);
}

/** The set of user ids the caller has blocked (RLS returns only their own). */
export async function fetchBlockedUserIds(client: SupabaseClient): Promise<ReadonlySet<string>> {
  const result = await client.from('player_blocks').select('blocked_user_id');
  if (result.error) throw new Error(result.error.message);
  const rows = (result.data ?? []) as ReadonlyArray<{ blocked_user_id: string }>;
  return new Set(rows.map((row) => row.blocked_user_id));
}
