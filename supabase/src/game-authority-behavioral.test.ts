// Behavioural tests for the live-gameplay authority (migration 0006), against a
// RUNNING local Supabase (`pnpm supabase:start`). Gated behind SUPABASE_RLS_LIVE=1
// (set by `pnpm test:rls`) so the default unit run skips them.
//
// These exercise the *persistence boundary* only — start_game and
// commit_game_action carry NO game rules (ADR-0010: rules live in the TS engine),
// so synthetic JSON payloads are the honest way to test what these functions
// actually own: atomic projection writes, the expectedVersion optimistic-
// concurrency guard, (game, actor, client_action_id) idempotency, and the
// server-only privacy of the full authority state. The two-user harness keeps
// cross-user denial uniform with the rest of the schema.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  assertSupabaseReachable,
  createTwoUserHarness,
  type TwoUserHarness,
} from './rls-harness.js';

const LIVE = process.env.SUPABASE_RLS_LIVE === '1';

/** Provision a 2-human lobby (host A + joiner B) and return its room id. */
async function seedLobby(h: TwoUserHarness): Promise<{ roomId: string }> {
  const created = await h.userA.client.rpc('create_room', {
    p_max_seats: 4,
    p_locale: 'en',
    p_display_name: 'Ava',
  });
  expect(created.error).toBeNull();
  const room = created.data as { id: string; code: string };
  const joined = await h.userB.client.rpc('join_room_by_code', {
    p_code: room.code,
    p_display_name: 'Ben',
  });
  expect(joined.error).toBeNull();
  return { roomId: room.id };
}

describe.skipIf(!LIVE)('game authority RPCs + privacy (live Supabase)', () => {
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

  /** Start a game via the service-role RPC and return the new game id. */
  async function startGame(roomId: string): Promise<string> {
    const snapshot = {
      stateVersion: 0,
      currentPlayerId: h.userA.id,
      players: [
        { id: h.userA.id, handCount: 1, status: 'active' },
        { id: h.userB.id, handCount: 1, status: 'active' },
      ],
    };
    const authorityState = {
      stateVersion: 0,
      players: [
        { id: h.userA.id, hand: [{ id: 'c1' }], isBot: false },
        { id: h.userB.id, hand: [{ id: 'c2' }], isBot: false },
      ],
    };
    const started = await h.admin.rpc('start_game', {
      p_room_id: roomId,
      p_public_snapshot: snapshot,
      p_authority_state: authorityState,
      p_hands: [
        { user_id: h.userA.id, hand: [{ id: 'c1' }] },
        { user_id: h.userB.id, hand: [{ id: 'c2' }] },
      ],
      p_events: [{ type: 'dealt' }],
    });
    expect(started.error).toBeNull();
    const game = started.data as { id: string; status: string; state_version: number };
    expect(game.status).toBe('active');
    expect(game.state_version).toBe(0);
    return game.id;
  }

  describe('start_game', () => {
    it('seeds the game, authority state, private hands, and events; flips the room', async () => {
      const { roomId } = await seedLobby(h);
      const gameId = await startGame(roomId);

      // Room advanced out of the lobby.
      const room = await h.admin.from('rooms').select('status').eq('id', roomId).single();
      expect(room.data?.status).toBe('in_progress');

      // Full authority state landed (server-only table).
      const authority = await h.admin
        .from('game_authority_state')
        .select('state')
        .eq('game_id', gameId)
        .single();
      expect(authority.error).toBeNull();
      expect((authority.data?.state as { players: unknown[] }).players).toHaveLength(2);

      // One private-hand row per human.
      const hands = await h.admin.from('game_private_hands').select('*').eq('game_id', gameId);
      expect(hands.data).toHaveLength(2);

      // Initial event appended at seq 0.
      const events = await h.admin
        .from('game_events')
        .select('seq')
        .eq('game_id', gameId)
        .order('seq');
      expect(events.data?.map((e) => e.seq)).toEqual([0]);
    });

    it('refuses to start a room that is not in the lobby', async () => {
      const { roomId } = await seedLobby(h);
      await startGame(roomId); // flips to in_progress
      const second = await h.admin.rpc('start_game', {
        p_room_id: roomId,
        p_public_snapshot: { stateVersion: 0 },
        p_authority_state: {},
        p_hands: [],
        p_events: [],
      });
      expect(second.error).not.toBeNull();
    });
  });

  describe('commit_game_action', () => {
    it('bumps the version and updates snapshot + hands atomically', async () => {
      const { roomId } = await seedLobby(h);
      const gameId = await startGame(roomId);

      const committed = await h.admin.rpc('commit_game_action', {
        p_game_id: gameId,
        p_actor: h.userA.id,
        p_client_action_id: 'act-1',
        p_expected_version: 0,
        p_public_snapshot: { stateVersion: 1, currentPlayerId: h.userB.id },
        p_authority_state: { stateVersion: 1 },
        p_hands: [{ user_id: h.userA.id, hand: [] }],
        p_events: [{ type: 'drew' }],
        p_status: 'active',
        p_result: null,
      });
      expect(committed.error).toBeNull();
      expect((committed.data as { state_version: number }).state_version).toBe(1);

      // Host hand was emptied by the update; the event log now has two entries.
      const hostHand = await h.admin
        .from('game_private_hands')
        .select('hand')
        .eq('game_id', gameId)
        .eq('user_id', h.userA.id)
        .single();
      expect(hostHand.data?.hand).toEqual([]);
      const events = await h.admin.from('game_events').select('seq').eq('game_id', gameId);
      expect(events.data).toHaveLength(2);
    });

    it('is idempotent: a duplicate (actor, client_action_id) is a no-op', async () => {
      const { roomId } = await seedLobby(h);
      const gameId = await startGame(roomId);

      await h.admin.rpc('commit_game_action', {
        p_game_id: gameId,
        p_actor: h.userA.id,
        p_client_action_id: 'dup',
        p_expected_version: 0,
        p_public_snapshot: { stateVersion: 1 },
        p_authority_state: { stateVersion: 1 },
        p_hands: [],
        p_events: [],
        p_status: 'active',
        p_result: null,
      });

      // Retried with the SAME action id (and even a now-stale expected version):
      // the idempotency ledger short-circuits before the version guard.
      const retry = await h.admin.rpc('commit_game_action', {
        p_game_id: gameId,
        p_actor: h.userA.id,
        p_client_action_id: 'dup',
        p_expected_version: 0,
        p_public_snapshot: { stateVersion: 2 },
        p_authority_state: { stateVersion: 2 },
        p_hands: [],
        p_events: [{ type: 'should-not-append' }],
        p_status: 'active',
        p_result: null,
      });
      expect(retry.error).toBeNull();
      // Version stayed at 1 — the retry did not advance state.
      expect((retry.data as { state_version: number }).state_version).toBe(1);
    });

    it('rejects a stale expectedVersion with a PT409 conflict (no retry loop)', async () => {
      // The guard raises SQLSTATE 'PT409', NOT 40001 — PostgREST auto-retries
      // serialization failures, so a deterministic 40001 raise would loop until
      // timeout. PT409 surfaces immediately as a clean HTTP 409.
      const { roomId } = await seedLobby(h);
      const gameId = await startGame(roomId);

      // Advance to version 1.
      await h.admin.rpc('commit_game_action', {
        p_game_id: gameId,
        p_actor: h.userA.id,
        p_client_action_id: 'act-1',
        p_expected_version: 0,
        p_public_snapshot: { stateVersion: 1 },
        p_authority_state: { stateVersion: 1 },
        p_hands: [],
        p_events: [],
        p_status: 'active',
        p_result: null,
      });

      // A fresh action that still expects version 0 must be rejected.
      const stale = await h.admin.rpc('commit_game_action', {
        p_game_id: gameId,
        p_actor: h.userB.id,
        p_client_action_id: 'act-stale',
        p_expected_version: 0,
        p_public_snapshot: { stateVersion: 1 },
        p_authority_state: { stateVersion: 1 },
        p_hands: [],
        p_events: [],
        p_status: 'active',
        p_result: null,
      });
      expect(stale.error).not.toBeNull();
      expect(stale.error?.code === 'PT409' || /version conflict/.test(stale.error?.message ?? '')).toBe(
        true,
      );
    });

    it('flips the room to complete when the game finishes', async () => {
      const { roomId } = await seedLobby(h);
      const gameId = await startGame(roomId);

      await h.admin.rpc('commit_game_action', {
        p_game_id: gameId,
        p_actor: h.userA.id,
        p_client_action_id: 'final',
        p_expected_version: 0,
        p_public_snapshot: { stateVersion: 1 },
        p_authority_state: { stateVersion: 1 },
        p_hands: [],
        p_events: [],
        p_status: 'complete',
        p_result: { winners: [h.userA.id], loser: h.userB.id },
      });

      const room = await h.admin.from('rooms').select('status').eq('id', roomId).single();
      expect(room.data?.status).toBe('complete');
      const game = await h.admin.from('games').select('status, result').eq('id', gameId).single();
      expect(game.data?.status).toBe('complete');
      expect((game.data?.result as { loser: string }).loser).toBe(h.userB.id);
    });
  });

  describe('server-only privacy (no card leakage)', () => {
    it('never hands the full authority state to an authenticated client', async () => {
      const { roomId } = await seedLobby(h);
      const gameId = await startGame(roomId);

      // Even a game member (host) cannot read game_authority_state: RLS is on with
      // no authenticated grant, so the database refuses the row entirely.
      const peek = await h.userA.client
        .from('game_authority_state')
        .select('*')
        .eq('game_id', gameId);
      expect(peek.data ?? []).toHaveLength(0);
    });

    it('lets each player read only their own hand plus the public game row', async () => {
      const { roomId } = await seedLobby(h);
      const gameId = await startGame(roomId);

      // A sees exactly one private-hand row — their own.
      const ownHand = await h.userA.client
        .from('game_private_hands')
        .select('user_id')
        .eq('game_id', gameId);
      expect(ownHand.data).toHaveLength(1);
      expect(ownHand.data?.[0]?.user_id).toBe(h.userA.id);

      // A cannot read B's hand even when targeting it directly.
      const peekOther = await h.userA.client
        .from('game_private_hands')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', h.userB.id);
      expect(peekOther.data ?? []).toHaveLength(0);

      // Both members can read the card-safe public game row + snapshot.
      const publicGame = await h.userB.client
        .from('games')
        .select('public_snapshot')
        .eq('id', gameId);
      expect(publicGame.data).toHaveLength(1);
    });
  });
});
