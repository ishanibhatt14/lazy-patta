import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { blockPlayer, fetchBlockedUserIds, reportPlayer, unblockPlayer } from './moderation-client';

function clientWithRpc(result: { data?: unknown; error?: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null });
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

describe('reportPlayer', () => {
  it('forwards reporter-stamped fields to the report_player RPC', async () => {
    const { client, rpc } = clientWithRpc({});
    await reportPlayer(client, {
      reportedUserId: 'u2',
      reason: 'cheating',
      roomId: 'r1',
      details: '  looked at hands  ',
    });
    expect(rpc).toHaveBeenCalledWith('report_player', {
      p_reported_user_id: 'u2',
      p_reason: 'cheating',
      p_room_id: 'r1',
      p_details: '  looked at hands  ',
    });
  });

  it('passes nulls for the optional room and details', async () => {
    const { client, rpc } = clientWithRpc({});
    await reportPlayer(client, { reportedUserId: 'u2', reason: 'other' });
    expect(rpc).toHaveBeenCalledWith('report_player', {
      p_reported_user_id: 'u2',
      p_reason: 'other',
      p_room_id: null,
      p_details: null,
    });
  });

  it('throws the RPC error message', async () => {
    const { client } = clientWithRpc({ error: { message: 'cannot report this user' } });
    await expect(reportPlayer(client, { reportedUserId: 'u2', reason: 'abuse' })).rejects.toThrow(
      'cannot report this user',
    );
  });
});

describe('blockPlayer / unblockPlayer', () => {
  it('blocks through the block_player RPC', async () => {
    const { client, rpc } = clientWithRpc({});
    await blockPlayer(client, 'u2');
    expect(rpc).toHaveBeenCalledWith('block_player', { p_blocked_user_id: 'u2' });
  });

  it('unblocks through the unblock_player RPC', async () => {
    const { client, rpc } = clientWithRpc({});
    await unblockPlayer(client, 'u2');
    expect(rpc).toHaveBeenCalledWith('unblock_player', { p_blocked_user_id: 'u2' });
  });
});

describe('fetchBlockedUserIds', () => {
  it('returns the blocked ids as a set', async () => {
    const select = vi.fn().mockResolvedValue({
      data: [{ blocked_user_id: 'a' }, { blocked_user_id: 'b' }],
      error: null,
    });
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as SupabaseClient;

    const blocked = await fetchBlockedUserIds(client);
    expect(from).toHaveBeenCalledWith('player_blocks');
    expect(select).toHaveBeenCalledWith('blocked_user_id');
    expect([...blocked].sort()).toEqual(['a', 'b']);
  });

  it('throws when the read fails', async () => {
    const select = vi.fn().mockResolvedValue({ data: null, error: { message: 'denied' } });
    const client = { from: vi.fn(() => ({ select })) } as unknown as SupabaseClient;
    await expect(fetchBlockedUserIds(client)).rejects.toThrow('denied');
  });
});
