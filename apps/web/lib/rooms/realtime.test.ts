import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { subscribeToChanges, subscribeToGame, subscribeToRoom } from './realtime';

interface OnCall {
  readonly event: string;
  readonly config: Record<string, unknown>;
}

/**
 * A minimal fake Realtime channel that records every `.on()` binding and hands
 * back its own change-callbacks so a test can fire them, mimicking a row change
 * arriving over the websocket.
 */
function fakeClient() {
  const onCalls: OnCall[] = [];
  const callbacks: Array<() => void> = [];
  const subscribe = vi.fn();
  const removeChannel = vi.fn().mockResolvedValue({ status: 'ok' });

  const channel = {
    on: vi.fn((event: string, config: Record<string, unknown>, cb: () => void) => {
      onCalls.push({ event, config });
      callbacks.push(cb);
      return channel;
    }),
    subscribe,
  };
  const channelFactory = vi.fn(() => channel);

  const client = {
    channel: channelFactory,
    removeChannel,
  } as unknown as SupabaseClient;

  return { client, channel, channelFactory, removeChannel, subscribe, onCalls, callbacks };
}

describe('subscribeToChanges', () => {
  it('binds a postgres_changes watcher per table and subscribes once', () => {
    const { client, channelFactory, subscribe, onCalls } = fakeClient();
    const onChange = vi.fn();

    subscribeToChanges(
      client,
      'chan',
      [
        { table: 'rooms', filter: 'id=eq.r1' },
        { table: 'room_seats', filter: 'room_id=eq.r1' },
      ],
      onChange,
    );

    expect(channelFactory).toHaveBeenCalledWith('chan');
    expect(subscribe).toHaveBeenCalledOnce();
    expect(onCalls).toHaveLength(2);
    expect(onCalls[0]).toEqual({
      event: 'postgres_changes',
      config: { event: '*', schema: 'public', table: 'rooms', filter: 'id=eq.r1' },
    });
    expect(onCalls[1]!.config).toMatchObject({ table: 'room_seats', filter: 'room_id=eq.r1' });
  });

  it('omits the filter key when no filter is given', () => {
    const { client, onCalls } = fakeClient();
    subscribeToChanges(client, 'chan', [{ table: 'games' }], vi.fn());
    expect(onCalls[0]!.config).not.toHaveProperty('filter');
    expect(onCalls[0]!.config).toEqual({ event: '*', schema: 'public', table: 'games' });
  });

  it('invokes the callback (payload-free) when a change arrives', () => {
    const { client, callbacks } = fakeClient();
    const onChange = vi.fn();
    subscribeToChanges(client, 'chan', [{ table: 'games' }], onChange);

    callbacks[0]!();
    callbacks[0]!();
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenCalledWith();
  });

  it('removes the channel on unsubscribe, and only once', () => {
    const { client, channel, removeChannel } = fakeClient();
    const unsubscribe = subscribeToChanges(client, 'chan', [{ table: 'games' }], vi.fn());

    unsubscribe();
    unsubscribe();
    expect(removeChannel).toHaveBeenCalledOnce();
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });
});

describe('subscribeToRoom', () => {
  it('watches the room row and its seats, scoped by room id', () => {
    const { client, channelFactory, onCalls } = fakeClient();
    subscribeToRoom(client, 'room-9', vi.fn());

    expect(channelFactory).toHaveBeenCalledWith('room:room-9');
    expect(onCalls.map((c) => c.config)).toEqual([
      { event: '*', schema: 'public', table: 'rooms', filter: 'id=eq.room-9' },
      { event: '*', schema: 'public', table: 'room_seats', filter: 'room_id=eq.room-9' },
    ]);
  });
});

describe('subscribeToGame', () => {
  it('watches the room game and only the viewer own private hand', () => {
    const { client, channelFactory, onCalls } = fakeClient();
    subscribeToGame(client, 'room-9', 'user-7', vi.fn());

    expect(channelFactory).toHaveBeenCalledWith('game:room-9:user-7');
    expect(onCalls.map((c) => c.config)).toEqual([
      { event: '*', schema: 'public', table: 'games', filter: 'room_id=eq.room-9' },
      {
        event: '*',
        schema: 'public',
        table: 'game_private_hands',
        filter: 'user_id=eq.user-7',
      },
    ]);
  });
});
