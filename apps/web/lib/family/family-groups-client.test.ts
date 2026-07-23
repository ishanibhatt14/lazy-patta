import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  createFamilyGroup,
  fetchFamilyGroupMembers,
  fetchMyFamilyGroups,
  joinFamilyGroupByCode,
  leaveFamilyGroup,
  renameFamilyGroup,
} from './family-groups-client';

function clientWithRpc(result: { data?: unknown; error?: { message: string } | null } = {}) {
  const rpc = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null });
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

// A chainable `from(...).select(...).eq(...).order(...)` stub that resolves to a
// fixed { data, error } — enough to exercise the two RLS-backed read helpers.
function clientWithQuery(result: { data?: unknown; error?: { message: string } | null } = {}) {
  const resolved = { data: result.data ?? null, error: result.error ?? null };
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order']) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }
  // The last call in each chain is awaited; make the builder thenable.
  builder.then = (resolve: (value: typeof resolved) => unknown) => resolve(resolved);
  const from = vi.fn().mockReturnValue(builder);
  return { client: { from } as unknown as SupabaseClient, from, builder };
}

const GROUP = {
  id: 'g1',
  name: 'Bhatt Family',
  join_code: 'BH2026',
  created_by: 'u1',
};

describe('createFamilyGroup', () => {
  it('seats the caller as organizer through the create_family_group RPC', async () => {
    const { client, rpc } = clientWithRpc({ data: GROUP });
    const group = await createFamilyGroup(client, { name: 'Bhatt Family', displayName: 'Ishani' });
    expect(rpc).toHaveBeenCalledWith('create_family_group', {
      p_name: 'Bhatt Family',
      p_display_name: 'Ishani',
    });
    expect(group).toEqual(GROUP);
  });

  it('passes a null display name when none is given', async () => {
    const { client, rpc } = clientWithRpc({ data: GROUP });
    await createFamilyGroup(client, { name: 'Bhatt Family' });
    expect(rpc).toHaveBeenCalledWith('create_family_group', {
      p_name: 'Bhatt Family',
      p_display_name: null,
    });
  });

  it('throws the RPC error message', async () => {
    const { client } = clientWithRpc({
      error: { message: 'a family name of 1 to 60 characters is required' },
    });
    await expect(createFamilyGroup(client, { name: '' })).rejects.toThrow(
      'a family name of 1 to 60 characters is required',
    );
  });
});

describe('joinFamilyGroupByCode', () => {
  it('joins through the join_family_group_by_code RPC', async () => {
    const { client, rpc } = clientWithRpc({ data: GROUP });
    await joinFamilyGroupByCode(client, 'BH2026', 'Ba');
    expect(rpc).toHaveBeenCalledWith('join_family_group_by_code', {
      p_code: 'BH2026',
      p_display_name: 'Ba',
    });
  });

  it('throws when the code is unknown', async () => {
    const { client } = clientWithRpc({ error: { message: 'no family found for that code' } });
    await expect(joinFamilyGroupByCode(client, 'ZZZZZZ')).rejects.toThrow(
      'no family found for that code',
    );
  });
});

describe('renameFamilyGroup', () => {
  it('renames through the rename_family_group RPC', async () => {
    const { client, rpc } = clientWithRpc({ data: { ...GROUP, name: 'Bhatt Parivar' } });
    const group = await renameFamilyGroup(client, 'g1', 'Bhatt Parivar');
    expect(rpc).toHaveBeenCalledWith('rename_family_group', {
      p_group_id: 'g1',
      p_name: 'Bhatt Parivar',
    });
    expect(group.name).toBe('Bhatt Parivar');
  });

  it('propagates an organizer-only rejection', async () => {
    const { client } = clientWithRpc({
      error: { message: 'only an organizer may rename the family' },
    });
    await expect(renameFamilyGroup(client, 'g1', 'Nope')).rejects.toThrow(
      'only an organizer may rename the family',
    );
  });
});

describe('leaveFamilyGroup', () => {
  it('leaves through the leave_family_group RPC', async () => {
    const { client, rpc } = clientWithRpc();
    await leaveFamilyGroup(client, 'g1');
    expect(rpc).toHaveBeenCalledWith('leave_family_group', { p_group_id: 'g1' });
  });

  it('throws the RPC error message', async () => {
    const { client } = clientWithRpc({ error: { message: 'authentication required' } });
    await expect(leaveFamilyGroup(client, 'g1')).rejects.toThrow('authentication required');
  });
});

describe('fetchMyFamilyGroups', () => {
  it('reads the caller’s families newest-first', async () => {
    const { client, from, builder } = clientWithQuery({ data: [GROUP] });
    const groups = await fetchMyFamilyGroups(client);
    expect(from).toHaveBeenCalledWith('family_groups');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(groups).toEqual([GROUP]);
  });

  it('returns an empty array when RLS yields no rows', async () => {
    const { client } = clientWithQuery({ data: null });
    await expect(fetchMyFamilyGroups(client)).resolves.toEqual([]);
  });
});

describe('fetchFamilyGroupMembers', () => {
  it('reads members of a given family in join order', async () => {
    const members = [{ group_id: 'g1', user_id: 'u1', role: 'organizer', display_name: 'Ishani' }];
    const { client, from, builder } = clientWithQuery({ data: members });
    const result = await fetchFamilyGroupMembers(client, 'g1');
    expect(from).toHaveBeenCalledWith('family_group_members');
    expect(builder.eq).toHaveBeenCalledWith('group_id', 'g1');
    expect(builder.order).toHaveBeenCalledWith('joined_at', { ascending: true });
    expect(result).toEqual(members);
  });
});
