import { type SupabaseClient } from '@supabase/supabase-js';

/**
 * Typed wrappers over the family-group RPCs (migration 0020). A family group is
 * an optional, persistent circle ("Bhatt Family") that outlives any single room.
 * Every mutation goes through a SECURITY DEFINER function — clients hold no write
 * grants — so this module never issues an INSERT/UPDATE/DELETE directly. Reads
 * rely on RLS to scope rows to the caller's own memberships.
 */

export type FamilyRole = 'organizer' | 'member';

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
