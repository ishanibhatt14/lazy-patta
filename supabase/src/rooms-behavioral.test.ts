// Behavioural RLS + RPC tests for the Phase 3 room schema, against a RUNNING
// local Supabase (`pnpm supabase:start`). Gated behind SUPABASE_RLS_LIVE=1 (set
// by `pnpm test:rls`) so the default unit run skips them. Reuses the two-user
// harness so cross-user denial stays uniform across the schema.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  assertSupabaseReachable,
  createTwoUserHarness,
  type TwoUserHarness,
} from './rls-harness.js';

const LIVE = process.env.SUPABASE_RLS_LIVE === '1';

describe.skipIf(!LIVE)('rooms RLS + RPCs (live Supabase)', () => {
  let h: TwoUserHarness;

  beforeAll(async () => {
    await assertSupabaseReachable();
    h = await createTwoUserHarness();
    // Each user needs a profile (host/display names come from the client).
    await h.userA.client.from('profiles').insert({ id: h.userA.id, display_name: 'Ava' });
    await h.userB.client.from('profiles').insert({ id: h.userB.id, display_name: 'Ben' });
  }, 60_000);

  afterAll(async () => {
    await h?.cleanup();
  });

  describe('create + membership visibility', () => {
    it('host creates a room and can read it; a non-member cannot', async () => {
      const created = await h.userA.client.rpc('create_room', {
        p_max_seats: 4,
        p_locale: 'en',
        p_display_name: 'Ava',
      });
      expect(created.error).toBeNull();
      const room = created.data as { id: string; code: string; host_id: string };
      expect(room.code).toMatch(/^[A-Z0-9]{6}$/);
      expect(room.host_id).toBe(h.userA.id);

      // Host sees the room; the host seat exists.
      const hostRead = await h.userA.client.from('rooms').select('*').eq('id', room.id);
      expect(hostRead.data).toHaveLength(1);
      const seats = await h.userA.client.from('room_seats').select('*').eq('room_id', room.id);
      expect(seats.data).toHaveLength(1);
      expect(seats.data?.[0]?.occupant).toBe('human');

      // Non-member User B cannot see the room or its seats.
      const outsiderRoom = await h.userB.client.from('rooms').select('*').eq('id', room.id);
      expect(outsiderRoom.data).toHaveLength(0);
      const outsiderSeats = await h.userB.client
        .from('room_seats')
        .select('*')
        .eq('room_id', room.id);
      expect(outsiderSeats.data).toHaveLength(0);
    });

    it('a guest (anon) cannot create a room', async () => {
      const res = await h.anon.rpc('create_room', { p_max_seats: 2, p_locale: 'en' });
      expect(res.error).not.toBeNull();
    });
  });

  describe('join by code + host-only controls', () => {
    it('a joiner becomes a member; only the host can add bots', async () => {
      const created = await h.userA.client.rpc('create_room', { p_max_seats: 4, p_locale: 'en' });
      const room = created.data as { id: string; code: string };

      const joined = await h.userB.client.rpc('join_room_by_code', {
        p_code: room.code,
        p_display_name: 'Ben',
      });
      expect(joined.error).toBeNull();

      // Now B is a member and can read the room + both seats.
      const bRoom = await h.userB.client.from('rooms').select('*').eq('id', room.id);
      expect(bRoom.data).toHaveLength(1);
      const bSeats = await h.userB.client.from('room_seats').select('*').eq('room_id', room.id);
      expect(bSeats.data).toHaveLength(2);

      // Joining again is idempotent (no duplicate seat).
      await h.userB.client.rpc('join_room_by_code', { p_code: room.code });
      const afterRejoin = await h.userA.client
        .from('room_seats')
        .select('*')
        .eq('room_id', room.id);
      expect(afterRejoin.data).toHaveLength(2);

      // A non-host member cannot add a bot.
      const botByGuest = await h.userB.client.rpc('add_bot_seat', { p_room_id: room.id });
      expect(botByGuest.error).not.toBeNull();

      // The host can.
      const botByHost = await h.userA.client.rpc('add_bot_seat', { p_room_id: room.id });
      expect(botByHost.error).toBeNull();
      const seats = await h.userA.client.from('room_seats').select('*').eq('room_id', room.id);
      expect(seats.data).toHaveLength(3);
      expect(seats.data?.some((s) => s.occupant === 'bot')).toBe(true);
    });

    it('rejects a join once the room is full', async () => {
      const created = await h.userA.client.rpc('create_room', { p_max_seats: 2, p_locale: 'en' });
      const room = created.data as { id: string; code: string };
      // Host + one bot fills a 2-seat room.
      await h.userA.client.rpc('add_bot_seat', { p_room_id: room.id });
      const full = await h.userB.client.rpc('join_room_by_code', { p_code: room.code });
      expect(full.error).not.toBeNull();
    });

    it('lets a seated player set only their own ready state', async () => {
      const created = await h.userA.client.rpc('create_room', { p_max_seats: 3, p_locale: 'en' });
      const room = created.data as { id: string; code: string };
      await h.userB.client.rpc('join_room_by_code', { p_code: room.code });

      const ok = await h.userB.client.rpc('set_seat_ready', {
        p_room_id: room.id,
        p_is_ready: true,
      });
      expect(ok.error).toBeNull();
      const seat = await h.userB.client
        .from('room_seats')
        .select('is_ready')
        .eq('room_id', room.id)
        .eq('user_id', h.userB.id);
      expect(seat.data?.[0]?.is_ready).toBe(true);
    });
  });

  describe('private-hand isolation', () => {
    it('a player reads only their own hand, never an opponent’s', async () => {
      const created = await h.userA.client.rpc('create_room', { p_max_seats: 2, p_locale: 'en' });
      const room = created.data as { id: string; code: string };
      await h.userB.client.rpc('join_room_by_code', { p_code: room.code });

      // Server (service role) provisions a game + per-player private hands.
      const game = await h.admin
        .from('games')
        .insert({ room_id: room.id, public_snapshot: { turn: 0 } })
        .select()
        .single();
      expect(game.error).toBeNull();
      const gameId = (game.data as { id: string }).id;
      await h.admin.from('game_private_hands').insert([
        { game_id: gameId, user_id: h.userA.id, hand: [{ id: 'c1' }] },
        { game_id: gameId, user_id: h.userB.id, hand: [{ id: 'c2' }] },
      ]);

      // A sees only A's hand.
      const aHands = await h.userA.client
        .from('game_private_hands')
        .select('*')
        .eq('game_id', gameId);
      expect(aHands.data).toHaveLength(1);
      expect(aHands.data?.[0]?.user_id).toBe(h.userA.id);

      // A explicitly cannot read B's hand even when targeting it.
      const aPeek = await h.userA.client
        .from('game_private_hands')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', h.userB.id);
      expect(aPeek.data).toHaveLength(0);

      // Both members can read the card-safe public game row.
      const bGame = await h.userB.client.from('games').select('*').eq('id', gameId);
      expect(bGame.data).toHaveLength(1);
    });
  });
});
