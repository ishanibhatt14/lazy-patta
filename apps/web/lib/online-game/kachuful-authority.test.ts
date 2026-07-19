import { KachufulEngine } from '@lazy-patta/kachuful-engine';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import {
  advanceKachufulBots,
  applyHumanKachufulAction,
  currentKachufulActor,
  initialKachufulState,
} from './kachuful-authority';

/**
 * These tests drive the real pure engine through the authority helpers with a
 * fake Supabase admin that just resolves every RPC. They verify the
 * multiplayer-specific behaviour the authority owns — bot bidding advancement
 * stopping on a human's turn, and a human bid completing the round's bidding —
 * without touching a database.
 */

function fakeAdmin(): SupabaseClient {
  return {
    rpc: async () => ({ data: { id: 'game-1' }, error: null }),
  } as unknown as SupabaseClient;
}

const HUMAN = '11111111-1111-4111-8111-111111111111';
const PLAYERS = [HUMAN, 'bot:1', 'bot:2'] as const;

describe('kachuful online authority', () => {
  it('opens in the bidding phase with bots flagged from their ids', () => {
    const state = initialKachufulState(PLAYERS);

    expect(state.phase).toBe('bidding');
    expect(state.players.map((p) => p.isBot)).toEqual([false, true, true]);
    // Dealer is seat 0; the player to the dealer's left bids first.
    expect(currentKachufulActor(state)).toBe('bot:1');
  });

  it('advances bot bids and stops when it is the human turn', async () => {
    const state = initialKachufulState(PLAYERS);
    const afterBots = await advanceKachufulBots(fakeAdmin(), 'game-1', state);

    // Both bots have bid; the loop halts on the human dealer, still bidding.
    expect(afterBots.phase).toBe('bidding');
    expect(currentKachufulActor(afterBots)).toBe(HUMAN);
    expect(afterBots.players[1]!.bid).not.toBeNull();
    expect(afterBots.players[2]!.bid).not.toBeNull();
    expect(afterBots.players[0]!.bid).toBeNull();
  });

  it('completes bidding and enters play once the human places the final bid', async () => {
    const engine = new KachufulEngine();
    const opening = initialKachufulState(PLAYERS);
    const afterBots = await advanceKachufulBots(fakeAdmin(), 'game-1', opening);

    const legalBid = engine
      .legalActions(afterBots, HUMAN)
      .find((action) => action.type === 'PLACE_BID');
    expect(legalBid?.type).toBe('PLACE_BID');
    const bid = legalBid && legalBid.type === 'PLACE_BID' ? legalBid.bid : 0;

    const afterHuman = await applyHumanKachufulAction(
      fakeAdmin(),
      'game-1',
      afterBots,
      HUMAN,
      { type: 'PLACE_BID', bid },
      'action-1',
    );

    expect(afterHuman.phase).toBe('playing');
    expect(afterHuman.players.every((p) => p.bid !== null)).toBe(true);
  });

  it('rejects an out-of-turn or illegal action', async () => {
    const state = initialKachufulState(PLAYERS);
    // The human is not on turn yet (bot:1 bids first), so any bid is illegal.
    await expect(
      applyHumanKachufulAction(
        fakeAdmin(),
        'game-1',
        state,
        HUMAN,
        { type: 'PLACE_BID', bid: 0 },
        'action-1',
      ),
    ).rejects.toThrow('INVALID_KACHUFUL_ACTION');
  });
});
