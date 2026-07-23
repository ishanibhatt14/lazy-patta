// Behavioural RLS + RPC tests for the PR 11 family-groups schema, against a
// RUNNING local Supabase (`pnpm supabase:start`). Gated behind SUPABASE_RLS_LIVE=1
// (set by `pnpm test:rls`) so the default unit run skips them. Reuses the
// two-user harness so cross-user denial stays uniform across the schema.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  assertSupabaseReachable,
  createTwoUserHarness,
  type TwoUserHarness,
} from './rls-harness.js';

const LIVE = process.env.SUPABASE_RLS_LIVE === '1';

interface Group {
  id: string;
  name: string;
  join_code: string;
  created_by: string;
}

describe.skipIf(!LIVE)('family groups RLS + RPCs (live Supabase)', () => {
  let h: TwoUserHarness;

  beforeAll(async () => {
    await assertSupabaseReachable();
    h = await createTwoUserHarness();
    await h.userA.client.from('profiles').insert({ id: h.userA.id, display_name: 'Ava' });
    await h.userB.client.from('profiles').insert({ id: h.userB.id, display_name: 'Ben' });
  }, 60_000);

  afterAll(async () => {
    await h?.cleanup();
  });

  describe('create + membership visibility', () => {
    it('the creator becomes organizer and can read the group; a non-member cannot', async () => {
      const created = await h.userA.client.rpc('create_family_group', {
        p_name: 'Bhatt Family',
        p_display_name: 'Ava',
      });
      expect(created.error).toBeNull();
      const group = created.data as Group;
      expect(group.name).toBe('Bhatt Family');
      expect(group.join_code).toMatch(/^[A-Z0-9]{6}$/);
      expect(group.created_by).toBe(h.userA.id);

      // Organizer sees the group and their own membership row.
      const aGroup = await h.userA.client.from('family_groups').select('*').eq('id', group.id);
      expect(aGroup.data).toHaveLength(1);
      const aMembers = await h.userA.client
        .from('family_group_members')
        .select('*')
        .eq('group_id', group.id);
      expect(aMembers.data).toHaveLength(1);
      expect(aMembers.data?.[0]?.role).toBe('organizer');

      // A non-member cannot see the group or its members.
      const bGroup = await h.userB.client.from('family_groups').select('*').eq('id', group.id);
      expect(bGroup.data).toHaveLength(0);
      const bMembers = await h.userB.client
        .from('family_group_members')
        .select('*')
        .eq('group_id', group.id);
      expect(bMembers.data).toHaveLength(0);
    });

    it('a guest (anon) cannot create a family group', async () => {
      const res = await h.anon.rpc('create_family_group', { p_name: 'Nope' });
      expect(res.error).not.toBeNull();
    });

    it('rejects a blank family name', async () => {
      const res = await h.userA.client.rpc('create_family_group', { p_name: '   ' });
      expect(res.error).not.toBeNull();
    });
  });

  describe('join by code', () => {
    it('a joiner becomes a member and both can see each other', async () => {
      const created = await h.userA.client.rpc('create_family_group', { p_name: 'Patel Family' });
      const group = created.data as Group;

      const joined = await h.userB.client.rpc('join_family_group_by_code', {
        p_code: group.join_code,
        p_display_name: 'Ben',
      });
      expect(joined.error).toBeNull();

      // B now reads the group and BOTH member rows (co-member visibility).
      const bGroup = await h.userB.client.from('family_groups').select('*').eq('id', group.id);
      expect(bGroup.data).toHaveLength(1);
      const bMembers = await h.userB.client
        .from('family_group_members')
        .select('*')
        .eq('group_id', group.id);
      expect(bMembers.data).toHaveLength(2);

      // Re-joining is idempotent — no duplicate membership.
      await h.userB.client.rpc('join_family_group_by_code', { p_code: group.join_code });
      const afterRejoin = await h.userA.client
        .from('family_group_members')
        .select('*')
        .eq('group_id', group.id);
      expect(afterRejoin.data).toHaveLength(2);
    });

    it('rejects an unknown or malformed code', async () => {
      const unknown = await h.userB.client.rpc('join_family_group_by_code', { p_code: 'ZZZZZZ' });
      expect(unknown.error).not.toBeNull();
      const malformed = await h.userB.client.rpc('join_family_group_by_code', { p_code: 'abc' });
      expect(malformed.error).not.toBeNull();
    });
  });

  describe('rename is organizer-only', () => {
    it('lets the organizer rename but not a plain member', async () => {
      const created = await h.userA.client.rpc('create_family_group', { p_name: 'Shah Family' });
      const group = created.data as Group;
      await h.userB.client.rpc('join_family_group_by_code', { p_code: group.join_code });

      const byMember = await h.userB.client.rpc('rename_family_group', {
        p_group_id: group.id,
        p_name: 'Hijacked',
      });
      expect(byMember.error).not.toBeNull();

      const byOrganizer = await h.userA.client.rpc('rename_family_group', {
        p_group_id: group.id,
        p_name: 'Shah Parivar',
      });
      expect(byOrganizer.error).toBeNull();
      expect((byOrganizer.data as Group).name).toBe('Shah Parivar');
    });
  });

  describe('leave', () => {
    it('drops the caller and removes the group once the last member leaves', async () => {
      const created = await h.userA.client.rpc('create_family_group', { p_name: 'Solo Family' });
      const group = created.data as Group;

      const left = await h.userA.client.rpc('leave_family_group', { p_group_id: group.id });
      expect(left.error).toBeNull();

      // The empty group is gone (admin sees the ground truth, RLS bypassed).
      const remaining = await h.admin.from('family_groups').select('*').eq('id', group.id);
      expect(remaining.data).toHaveLength(0);
    });
  });
});
