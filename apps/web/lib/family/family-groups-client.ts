import { type SupabaseClient } from '@supabase/supabase-js';

import { type OnlineGameKey } from '../rooms/rooms-client';

/**
 * Typed wrappers over the family-group RPCs (migrations 0020 & 0021). A family
 * group is an optional, persistent circle ("Bhatt Family") that outlives any
 * single room, along with the attributes it keeps between sessions: favourite
 * games, recently-played tables, and past series results. Every mutation goes
 * through a SECURITY DEFINER function — clients hold no write grants — so this
 * module never issues an INSERT/UPDATE/DELETE directly. Reads rely on RLS to
 * scope rows to the caller's own memberships.
 */

export type FamilyRole = 'organizer' | 'member';

export type FamilyGameKey = OnlineGameKey;

export interface FamilyGroup {
  readonly id: string;
  readonly name: string;
  readonly join_code: string;
  readonly created_by: string;
  readonly created_at?: string;
  readonly updated_at?: string;
}

export interface FamilyGroupMember {
  readonly group_id: string;
  readonly user_id: string;
  readonly role: FamilyRole;
  readonly display_name: string | null;
  readonly joined_at?: string;
}

/** Surfaces a Postgres/PostgREST error message without leaking internals. */
function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('No data returned');
  return result.data;
}

export interface CreateFamilyGroupInput {
  readonly name: string;
  readonly displayName?: string;
}

/** Create a family and seat the caller as its organizer. */
export async function createFamilyGroup(
  client: SupabaseClient,
  input: CreateFamilyGroupInput,
): Promise<FamilyGroup> {
  return unwrap<FamilyGroup>(
    await client.rpc('create_family_group', {
      p_name: input.name,
      p_display_name: input.displayName ?? null,
    }),
  );
}

/** Join a family by its shareable code (idempotent — re-joining keeps your role). */
export async function joinFamilyGroupByCode(
  client: SupabaseClient,
  code: string,
  displayName?: string,
): Promise<FamilyGroup> {
  return unwrap<FamilyGroup>(
    await client.rpc('join_family_group_by_code', {
      p_code: code,
      p_display_name: displayName ?? null,
    }),
  );
}

/** Rename a family. Organizer-only; the RPC rejects a plain member. */
export async function renameFamilyGroup(
  client: SupabaseClient,
  groupId: string,
  name: string,
): Promise<FamilyGroup> {
  return unwrap<FamilyGroup>(
    await client.rpc('rename_family_group', { p_group_id: groupId, p_name: name }),
  );
}

/** Leave a family. The last member leaving removes the now-empty group. */
export async function leaveFamilyGroup(client: SupabaseClient, groupId: string): Promise<void> {
  const { error } = await client.rpc('leave_family_group', { p_group_id: groupId });
  if (error) throw new Error(error.message);
}

/** The caller's own families, newest first. RLS scopes this to their memberships. */
export async function fetchMyFamilyGroups(client: SupabaseClient): Promise<readonly FamilyGroup[]> {
  const { data, error } = await client
    .from('family_groups')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as FamilyGroup[];
}

/** The members of a family the caller belongs to (co-member visibility via RLS). */
export async function fetchFamilyGroupMembers(
  client: SupabaseClient,
  groupId: string,
): Promise<readonly FamilyGroupMember[]> {
  const { data, error } = await client
    .from('family_group_members')
    .select('*')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as FamilyGroupMember[];
}

// ---------------------------------------------------------------------------
// Family attributes (migration 0021): favourite games, recent tables, series.
// ---------------------------------------------------------------------------

export interface FamilyFavoriteGame {
  readonly group_id: string;
  readonly game_key: FamilyGameKey;
  /** The family's preferred house-rule preset for this game, or null for default (0023). */
  readonly ruleset_preset?: string | null;
  readonly added_by: string | null;
  readonly added_at?: string;
}

export interface FamilyRecentTable {
  readonly id: string;
  readonly group_id: string;
  readonly game_key: FamilyGameKey;
  readonly room_code: string;
  readonly played_at?: string;
  readonly recorded_by: string | null;
}

export interface FamilySeriesResult {
  readonly id: string;
  readonly group_id: string;
  readonly game_key: FamilyGameKey;
  readonly winner_user_id: string | null;
  readonly winner_display_name: string | null;
  readonly rounds_played: number | null;
  readonly summary: Record<string, unknown>;
  readonly recorded_at?: string;
  readonly recorded_by: string | null;
}

/**
 * Pin a game to the family's favourites (idempotent). Members only. An optional
 * preset id records the family's preferred house-rule variant for that game;
 * re-pinning the same game refreshes the preset. Omit for the game's default.
 */
export async function addFamilyFavoriteGame(
  client: SupabaseClient,
  groupId: string,
  gameKey: FamilyGameKey,
  presetId?: string,
): Promise<void> {
  const { error } = await client.rpc('add_family_favorite_game', {
    p_group_id: groupId,
    p_game_key: gameKey,
    p_ruleset_preset: presetId ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Unpin a game from the family's favourites. Members only. */
export async function removeFamilyFavoriteGame(
  client: SupabaseClient,
  groupId: string,
  gameKey: FamilyGameKey,
): Promise<void> {
  const { error } = await client.rpc('remove_family_favorite_game', {
    p_group_id: groupId,
    p_game_key: gameKey,
  });
  if (error) throw new Error(error.message);
}

/** The family's favourite games, oldest pin first. RLS-scoped to members. */
export async function fetchFamilyFavoriteGames(
  client: SupabaseClient,
  groupId: string,
): Promise<readonly FamilyFavoriteGame[]> {
  const { data, error } = await client
    .from('family_group_favorite_games')
    .select('*')
    .eq('group_id', groupId)
    .order('added_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as FamilyFavoriteGame[];
}

/** Record (or refresh) a table the family sat at. Deduped by code server-side. */
export async function recordFamilyTable(
  client: SupabaseClient,
  groupId: string,
  gameKey: FamilyGameKey,
  roomCode: string,
): Promise<FamilyRecentTable> {
  return unwrap<FamilyRecentTable>(
    await client.rpc('record_family_table', {
      p_group_id: groupId,
      p_game_key: gameKey,
      p_room_code: roomCode,
    }),
  );
}

/** The family's recent tables, newest first. RLS-scoped to members. */
export async function fetchFamilyRecentTables(
  client: SupabaseClient,
  groupId: string,
): Promise<readonly FamilyRecentTable[]> {
  const { data, error } = await client
    .from('family_group_recent_tables')
    .select('*')
    .eq('group_id', groupId)
    .order('played_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as FamilyRecentTable[];
}

export interface RecordFamilySeriesResultInput {
  readonly gameKey: FamilyGameKey;
  readonly winnerUserId?: string | null;
  readonly winnerDisplayName?: string | null;
  readonly roundsPlayed?: number | null;
  readonly summary?: Record<string, unknown>;
}

/** Append a finished series to the family's history. Members only. */
export async function recordFamilySeriesResult(
  client: SupabaseClient,
  groupId: string,
  input: RecordFamilySeriesResultInput,
): Promise<FamilySeriesResult> {
  return unwrap<FamilySeriesResult>(
    await client.rpc('record_family_series_result', {
      p_group_id: groupId,
      p_game_key: input.gameKey,
      p_winner_user_id: input.winnerUserId ?? null,
      p_winner_display_name: input.winnerDisplayName ?? null,
      p_rounds_played: input.roundsPlayed ?? null,
      p_summary: input.summary ?? {},
    }),
  );
}

/** The family's series history, newest first. RLS-scoped to members. */
export async function fetchFamilySeriesResults(
  client: SupabaseClient,
  groupId: string,
): Promise<readonly FamilySeriesResult[]> {
  const { data, error } = await client
    .from('family_group_series_results')
    .select('*')
    .eq('group_id', groupId)
    .order('recorded_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as FamilySeriesResult[];
}

// ---------------------------------------------------------------------------
// Scheduled game nights (migration 0024): a family's forward-looking plans.
// ---------------------------------------------------------------------------

export interface FamilyGameNight {
  readonly id: string;
  readonly group_id: string;
  readonly game_key: FamilyGameKey | null;
  readonly scheduled_for: string;
  readonly note: string | null;
  readonly created_by: string | null;
  readonly created_at?: string;
}

export interface ScheduleFamilyGameNightInput {
  /** ISO-8601 timestamp for when the family plans to play. */
  readonly scheduledFor: string;
  readonly gameKey?: FamilyGameKey | null;
  readonly note?: string | null;
}

/** Propose a game night for the family. Members only. Returns the created row. */
export async function scheduleFamilyGameNight(
  client: SupabaseClient,
  groupId: string,
  input: ScheduleFamilyGameNightInput,
): Promise<FamilyGameNight> {
  return unwrap<FamilyGameNight>(
    await client.rpc('schedule_family_game_night', {
      p_group_id: groupId,
      p_scheduled_for: input.scheduledFor,
      p_game_key: input.gameKey ?? null,
      p_note: input.note ?? null,
    }),
  );
}

/** Cancel a scheduled game night. Any member of its family may cancel; idempotent. */
export async function cancelFamilyGameNight(
  client: SupabaseClient,
  nightId: string,
): Promise<void> {
  const { error } = await client.rpc('cancel_family_game_night', { p_night_id: nightId });
  if (error) throw new Error(error.message);
}

/**
 * The family's upcoming game nights (scheduled_for from now on), soonest first.
 * RLS-scoped to members. Past nights are filtered out client-side by the caller
 * passing a `from` cutoff, defaulting to now.
 */
export async function fetchUpcomingFamilyGameNights(
  client: SupabaseClient,
  groupId: string,
  from: Date = new Date(),
): Promise<readonly FamilyGameNight[]> {
  const { data, error } = await client
    .from('family_group_game_nights')
    .select('*')
    .eq('group_id', groupId)
    .gte('scheduled_for', from.toISOString())
    .order('scheduled_for', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as FamilyGameNight[];
}
