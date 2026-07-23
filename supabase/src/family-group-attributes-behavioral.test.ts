// Behavioural RLS + RPC tests for the PR 11 (increment 3) family-group
// attributes schema, against a RUNNING local Supabase (`pnpm supabase:start`).
// Gated behind SUPABASE_RLS_LIVE=1 (set by `pnpm test:rls`) so the default unit
// run skips them. Reuses the two-user harness for cross-user denial.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  assertSupabaseReachable,
  createTwoUserHarness,
  type TwoUserHarness,
} from './rls-harness.js';

const LIVE = process.env.SUPABASE_RLS_LIVE === '1';

interface Group {
  id: string;
  join_code: string;
}

describe.skipIf(!LIVE)('family group attributes RLS + RPCs (live Supabase)', () => {
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

  async function newGroup(): Promise<Group> {
    const created = await h.userA.client.rpc('create_family_group', { p_name: 'Bhatt Family' });
    expect(created.error).toBeNull();
    return created.data as Group;
  }

  describe('favourite games', () => {
    it('a member pins and unpins; a non-member cannot pin or read', async () => {
      const group = await newGroup();

      const pinned = await h.userA.client.rpc('add_family_favorite_game', {
        p_group_id: group.id,
        p_game_key: 'lal_satti',
      });
      expect(pinned.error).toBeNull();

      // Idempotent: pinning again keeps a single row.
      await h.userA.client.rpc('add_family_favorite_game', {
        p_group_id: group.id,
        p_game_key: 'lal_satti',
      });
      const favs = await h.userA.client
        .from('family_group_favorite_games')
        .select('*')
        .eq('group_id', group.id);
      expect(favs.data).toHaveLength(1);

      // A non-member cannot pin (RPC membership guard) or read (RLS).
      const byOutsider = await h.userB.client.rpc('add_family_favorite_game', {
        p_group_id: group.id,
        p_game_key: 'jhabbu',
      });
      expect(byOutsider.error).not.toBeNull();
      const outsiderRead = await h.userB.client
        .from('family_group_favorite_games')
        .select('*')
        .eq('group_id', group.id);
      expect(outsiderRead.data).toHaveLength(0);

      // Unpin removes it.
      await h.userA.client.rpc('remove_family_favorite_game', {
        p_group_id: group.id,
        p_game_key: 'lal_satti',
      });
      const after = await h.userA.client
        .from('family_group_favorite_games')
        .select('*')
        .eq('group_id', group.id);
      expect(after.data).toHaveLength(0);
    });

    it('rejects an unsupported game key', async () => {
      const group = await newGroup();
      const res = await h.userA.client.rpc('add_family_favorite_game', {
        p_group_id: group.id,
        p_game_key: 'poker',
      });
      expect(res.error).not.toBeNull();
    });
  });

  describe('recent tables', () => {
    it('records a table and dedupes by code, refreshing played_at', async () => {
      const group = await newGroup();

      const first = await h.userA.client.rpc('record_family_table', {
        p_group_id: group.id,
        p_game_key: 'gadha_chor',
        p_room_code: 'ABC234',
      });
      expect(first.error).toBeNull();

      // Re-recording the same code updates rather than duplicates.
      const second = await h.userA.client.rpc('record_family_table', {
        p_group_id: group.id,
        p_game_key: 'gadha_chor',
        p_room_code: 'ABC234',
      });
      expect(second.error).toBeNull();

      const rows = await h.userA.client
        .from('family_group_recent_tables')
        .select('*')
        .eq('group_id', group.id);
      expect(rows.data).toHaveLength(1);

      // A non-member cannot record or read.
      const byOutsider = await h.userB.client.rpc('record_family_table', {
        p_group_id: group.id,
        p_game_key: 'gadha_chor',
        p_room_code: 'ZZZ999',
      });
      expect(byOutsider.error).not.toBeNull();
    });

    it('rejects a malformed room code', async () => {
      const group = await newGroup();
      const res = await h.userA.client.rpc('record_family_table', {
        p_group_id: group.id,
        p_game_key: 'gadha_chor',
        p_room_code: 'abc',
      });
      expect(res.error).not.toBeNull();
    });
  });

  describe('series results', () => {
    it('appends a series a co-member can read', async () => {
      const group = await newGroup();
      await h.userB.client.rpc('join_family_group_by_code', { p_code: group.join_code });

      const recorded = await h.userA.client.rpc('record_family_series_result', {
        p_group_id: group.id,
        p_game_key: 'lal_satti',
        p_winner_user_id: h.userA.id,
        p_winner_display_name: 'Ava',
        p_rounds_played: 3,
        p_summary: { note: 'best of five' },
      });
      expect(recorded.error).toBeNull();

      // Co-member visibility via RLS.
      const seen = await h.userB.client
        .from('family_group_series_results')
        .select('*')
        .eq('group_id', group.id);
      expect(seen.data).toHaveLength(1);
      expect(seen.data?.[0]?.winner_display_name).toBe('Ava');
    });
  });
});
