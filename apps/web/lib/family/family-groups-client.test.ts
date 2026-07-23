import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  addFamilyFavoriteGame,
  createFamilyGroup,
  fetchFamilyFavoriteGames,
  fetchFamilyGroupMembers,
  fetchFamilyRecentTables,
  fetchFamilySeriesResults,
  fetchMyFamilyGroups,
  joinFamilyGroupByCode,
  leaveFamilyGroup,
  recordFamilySeriesResult,
  recordFamilyTable,
  removeFamilyFavoriteGame,
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

describe('favourite games', () => {
  it('pins a game through the add_family_favorite_game RPC (default preset)', async () => {
    const { client, rpc } = clientWithRpc();
    await addFamilyFavoriteGame(client, 'g1', 'lal_satti');
    expect(rpc).toHaveBeenCalledWith('add_family_favorite_game', {
      p_group_id: 'g1',
      p_game_key: 'lal_satti',
      p_ruleset_preset: null,
    });
  });

  it('carries the chosen house-rule preset when pinning', async () => {
    const { client, rpc } = clientWithRpc();
    await addFamilyFavoriteGame(client, 'g1', 'lal_satti', 'lal-satti-all-sevens-open');
    expect(rpc).toHaveBeenCalledWith('add_family_favorite_game', {
      p_group_id: 'g1',
      p_game_key: 'lal_satti',
      p_ruleset_preset: 'lal-satti-all-sevens-open',
    });
  });

  it('unpins a game through the remove_family_favorite_game RPC', async () => {
    const { client, rpc } = clientWithRpc();
    await removeFamilyFavoriteGame(client, 'g1', 'jhabbu');
    expect(rpc).toHaveBeenCalledWith('remove_family_favorite_game', {
      p_group_id: 'g1',
      p_game_key: 'jhabbu',
    });
  });

  it('propagates a non-member rejection when pinning', async () => {
    const { client } = clientWithRpc({ error: { message: 'not a member of this family' } });
    await expect(addFamilyFavoriteGame(client, 'g1', 'kachuful')).rejects.toThrow(
      'not a member of this family',
    );
  });

  it('reads favourites oldest pin first', async () => {
    const favorites = [{ group_id: 'g1', game_key: 'gadha_chor', added_by: 'u1' }];
    const { client, from, builder } = clientWithQuery({ data: favorites });
    const result = await fetchFamilyFavoriteGames(client, 'g1');
    expect(from).toHaveBeenCalledWith('family_group_favorite_games');
    expect(builder.eq).toHaveBeenCalledWith('group_id', 'g1');
    expect(builder.order).toHaveBeenCalledWith('added_at', { ascending: true });
    expect(result).toEqual(favorites);
  });
});

describe('recent tables', () => {
  it('records a table through the record_family_table RPC', async () => {
    const row = { id: 't1', group_id: 'g1', game_key: 'gadha_chor', room_code: 'BH2026' };
    const { client, rpc } = clientWithRpc({ data: row });
    const result = await recordFamilyTable(client, 'g1', 'gadha_chor', 'BH2026');
    expect(rpc).toHaveBeenCalledWith('record_family_table', {
      p_group_id: 'g1',
      p_game_key: 'gadha_chor',
      p_room_code: 'BH2026',
    });
    expect(result).toEqual(row);
  });

  it('reads recent tables newest first', async () => {
    const tables = [{ id: 't1', group_id: 'g1', game_key: 'gadha_chor', room_code: 'BH2026' }];
    const { client, from, builder } = clientWithQuery({ data: tables });
    const result = await fetchFamilyRecentTables(client, 'g1');
    expect(from).toHaveBeenCalledWith('family_group_recent_tables');
    expect(builder.order).toHaveBeenCalledWith('played_at', { ascending: false });
    expect(result).toEqual(tables);
  });
});

describe('series results', () => {
  it('records a series through the record_family_series_result RPC', async () => {
    const row = { id: 's1', group_id: 'g1', game_key: 'lal_satti', winner_display_name: 'Ba' };
    const { client, rpc } = clientWithRpc({ data: row });
    const result = await recordFamilySeriesResult(client, 'g1', {
      gameKey: 'lal_satti',
      winnerUserId: 'u2',
      winnerDisplayName: 'Ba',
      roundsPlayed: 5,
      summary: { scores: [1, 2] },
    });
    expect(rpc).toHaveBeenCalledWith('record_family_series_result', {
      p_group_id: 'g1',
      p_game_key: 'lal_satti',
      p_winner_user_id: 'u2',
      p_winner_display_name: 'Ba',
      p_rounds_played: 5,
      p_summary: { scores: [1, 2] },
    });
    expect(result).toEqual(row);
  });

  it('defaults optional fields to null and an empty summary', async () => {
    const { client, rpc } = clientWithRpc({ data: { id: 's2' } });
    await recordFamilySeriesResult(client, 'g1', { gameKey: 'kachuful' });
    expect(rpc).toHaveBeenCalledWith('record_family_series_result', {
      p_group_id: 'g1',
      p_game_key: 'kachuful',
      p_winner_user_id: null,
      p_winner_display_name: null,
      p_rounds_played: null,
      p_summary: {},
    });
  });

  it('reads series history newest first', async () => {
    const results = [{ id: 's1', group_id: 'g1', game_key: 'lal_satti' }];
    const { client, from, builder } = clientWithQuery({ data: results });
    const result = await fetchFamilySeriesResults(client, 'g1');
    expect(from).toHaveBeenCalledWith('family_group_series_results');
    expect(builder.order).toHaveBeenCalledWith('recorded_at', { ascending: false });
    expect(result).toEqual(results);
  });
});
