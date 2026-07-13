// Behavioural RLS tests against a RUNNING local Supabase instance.
//
// These are gated behind SUPABASE_RLS_LIVE=1 (set by `pnpm test:rls`) so the
// default unit run (`pnpm test`, and CI without Docker) skips them instead of
// failing. When enabled, `beforeAll` connects to the stack and THROWS if it is
// unreachable — so `test:rls` reports an honest pass/fail, never a silent green.
//
// Prereq: `pnpm supabase:start` (Docker) + migrations applied.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  assertSupabaseReachable,
  createTwoUserHarness,
  type TwoUserHarness,
} from './rls-harness.js';

const LIVE = process.env.SUPABASE_RLS_LIVE === '1';

describe.skipIf(!LIVE)('RLS behavioural (live Supabase)', () => {
  let h: TwoUserHarness;

  beforeAll(async () => {
    await assertSupabaseReachable();
    h = await createTwoUserHarness();

    // Seed one profile + preferences row per user, each under its own session
    // (exercises the owner-scoped INSERT policies at the same time).
    const seed = async (u: TwoUserHarness['userA'], name: string) => {
      const p = await u.client.from('profiles').insert({ id: u.id, display_name: name }).select();
      expect(p.error, `seed profile for ${name}`).toBeNull();
      const pref = await u.client.from('user_preferences').insert({ user_id: u.id }).select();
      expect(pref.error, `seed preferences for ${name}`).toBeNull();
    };
    await seed(h.userA, 'Ava');
    await seed(h.userB, 'Ben');
  }, 60_000);

  afterAll(async () => {
    await h?.cleanup();
  });

  describe('profiles', () => {
    it('User A can read and update their own profile', async () => {
      const read = await h.userA.client.from('profiles').select('*').eq('id', h.userA.id);
      expect(read.error).toBeNull();
      expect(read.data).toHaveLength(1);
      expect(read.data?.[0]?.display_name).toBe('Ava');

      const upd = await h.userA.client
        .from('profiles')
        .update({ display_name: 'Ava Updated' })
        .eq('id', h.userA.id)
        .select();
      expect(upd.error).toBeNull();
      expect(upd.data?.[0]?.display_name).toBe('Ava Updated');
    });

    it('User A cannot read profile data belonging to User B', async () => {
      const read = await h.userA.client.from('profiles').select('*').eq('id', h.userB.id);
      // RLS filters the row out entirely: no error, zero rows.
      expect(read.error).toBeNull();
      expect(read.data).toHaveLength(0);
    });

    it('User A cannot update User B’s profile', async () => {
      const upd = await h.userA.client
        .from('profiles')
        .update({ display_name: 'Hacked' })
        .eq('id', h.userB.id)
        .select();
      expect(upd.error).toBeNull();
      expect(upd.data).toHaveLength(0); // nothing matched the owner-scoped policy

      // Confirm via service role that B’s row is untouched.
      const check = await h.admin.from('profiles').select('display_name').eq('id', h.userB.id);
      expect(check.data?.[0]?.display_name).toBe('Ben');
    });
  });

  describe('user_preferences', () => {
    it('User A can read and update only their own preferences', async () => {
      const read = await h.userA.client
        .from('user_preferences')
        .select('*')
        .eq('user_id', h.userA.id);
      expect(read.error).toBeNull();
      expect(read.data).toHaveLength(1);

      const upd = await h.userA.client
        .from('user_preferences')
        .update({ locale: 'hi' })
        .eq('user_id', h.userA.id)
        .select();
      expect(upd.error).toBeNull();
      expect(upd.data?.[0]?.locale).toBe('hi');

      const readOther = await h.userA.client
        .from('user_preferences')
        .select('*')
        .eq('user_id', h.userB.id);
      expect(readOther.data).toHaveLength(0);
    });
  });

  describe('anonymous access', () => {
    it('cannot read protected profile data', async () => {
      const read = await h.anon.from('profiles').select('*');
      expect(read.data ?? []).toHaveLength(0);
    });

    it('cannot read protected preference data', async () => {
      const read = await h.anon.from('user_preferences').select('*');
      expect(read.data ?? []).toHaveLength(0);
    });
  });

  describe('account_deletion_requests', () => {
    it('a user can create a deletion request only for themselves', async () => {
      const ok = await h.userA.client
        .from('account_deletion_requests')
        .insert({ user_id: h.userA.id, reason: 'test' })
        .select();
      expect(ok.error).toBeNull();
      expect(ok.data).toHaveLength(1);

      // Forging a request on behalf of User B must be rejected by the policy.
      const forged = await h.userA.client
        .from('account_deletion_requests')
        .insert({ user_id: h.userB.id })
        .select();
      expect(forged.error).not.toBeNull(); // RLS WITH CHECK violation
    });

    it('a user cannot read another user’s deletion request', async () => {
      await h.userB.client.from('account_deletion_requests').insert({ user_id: h.userB.id });
      const read = await h.userA.client
        .from('account_deletion_requests')
        .select('*')
        .eq('user_id', h.userB.id);
      expect(read.data).toHaveLength(0);
    });
  });

  describe('lal_satti_score_sessions', () => {
    it('a user can save score history that another user cannot read or extend', async () => {
      const session = await h.userA.client
        .from('lal_satti_score_sessions')
        .insert({
          owner_id: h.userA.id,
          display_name: 'Ava',
          player_count: 4,
          locale: 'en',
        })
        .select('id')
        .single();
      expect(session.error).toBeNull();
      expect(session.data?.id).toBeTruthy();

      const round = await h.userA.client
        .from('lal_satti_score_rounds')
        .insert({
          session_id: session.data?.id,
          round_number: 1,
          winner_names: ['Ava'],
          leftovers: [{ playerId: 'bot-ba', playerName: 'Ba', cardCount: 3 }],
        })
        .select('id')
        .single();
      expect(round.error).toBeNull();
      expect(round.data?.id).toBeTruthy();

      const otherSessionRead = await h.userB.client
        .from('lal_satti_score_sessions')
        .select('id')
        .eq('id', session.data?.id);
      expect(otherSessionRead.error).toBeNull();
      expect(otherSessionRead.data).toHaveLength(0);

      const otherRoundRead = await h.userB.client
        .from('lal_satti_score_rounds')
        .select('id')
        .eq('session_id', session.data?.id);
      expect(otherRoundRead.error).toBeNull();
      expect(otherRoundRead.data).toHaveLength(0);

      const forgedRound = await h.userB.client.from('lal_satti_score_rounds').insert({
        session_id: session.data?.id,
        round_number: 2,
        winner_names: ['Ben'],
        leftovers: [],
      });
      expect(forgedRound.error).not.toBeNull();
    });

    it('does not expose saved scores to anonymous callers', async () => {
      const read = await h.anon.from('lal_satti_score_sessions').select('id');
      expect(read.error).not.toBeNull();
    });
  });

  describe('service-role isolation', () => {
    it('admin (service-role) operations are not available through the anon client', async () => {
      const { error } = await h.anon.auth.admin.listUsers();
      expect(error).not.toBeNull(); // anon key must not reach the admin API
    });

    it('the service role bypasses RLS (sees both users’ rows)', async () => {
      const read = await h.admin.from('profiles').select('id').in('id', [h.userA.id, h.userB.id]);
      expect(read.error).toBeNull();
      expect(read.data).toHaveLength(2);
    });
  });
});
