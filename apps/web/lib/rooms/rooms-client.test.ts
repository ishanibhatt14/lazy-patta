import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { createRoom, rematchRoom } from './rooms-client';

function clientWithRpc(result: { data?: unknown; error?: { message: string } | null } = {}) {
  const rpc = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null });
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

const ROOM_ROW = { id: 'room-1' };

describe('createRoom', () => {
  it('passes the chosen house-rule preset to create_room', async () => {
    const { client, rpc } = clientWithRpc({ data: ROOM_ROW });
    await createRoom(client, { gameKey: 'lal_satti', presetId: 'lal-satti-all-sevens-open' });
    expect(rpc).toHaveBeenCalledWith(
      'create_room',
      expect.objectContaining({
        p_game_key: 'lal_satti',
        p_ruleset_preset: 'lal-satti-all-sevens-open',
      }),
    );
  });

  it('sends a null preset for the game default', async () => {
    const { client, rpc } = clientWithRpc({ data: ROOM_ROW });
    await createRoom(client, { gameKey: 'gadha_chor' });
    expect(rpc).toHaveBeenCalledWith(
      'create_room',
      expect.objectContaining({ p_ruleset_preset: null }),
    );
  });
});

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
