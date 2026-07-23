import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { rematchRoom } from './rooms-client';

function clientWithRpc(result: { error?: { message: string } | null } = {}) {
  const rpc = vi.fn().mockResolvedValue({ data: null, error: result.error ?? null });
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

describe('rematchRoom', () => {
  it('returns the room to the lobby through the rematch_room RPC', async () => {
    const { client, rpc } = clientWithRpc();
    await rematchRoom(client, 'r1');
    expect(rpc).toHaveBeenCalledWith('rematch_room', { p_room_id: 'r1' });
  });

  it('throws the RPC error message', async () => {
    const { client } = clientWithRpc({ error: { message: 'only the host may start a rematch' } });
    await expect(rematchRoom(client, 'r1')).rejects.toThrow('only the host may start a rematch');
  });
});
