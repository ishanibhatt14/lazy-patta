import { type SupabaseClient } from '@supabase/supabase-js';

/**
 * Typed wrappers over the room-lifecycle RPCs (migration 0005). Every mutation
 * goes through a SECURITY DEFINER function — clients hold no write grants — so
 * this module never issues an INSERT/UPDATE/DELETE directly. Reads rely on RLS
 * to scope rows to the caller's memberships.
 */

export type RoomStatus = 'lobby' | 'in_progress' | 'complete' | 'abandoned';
export type SeatOccupant = 'human' | 'bot' | 'empty';
export type RoomLocale = 'en' | 'gu' | 'hi';
export type OnlineGameKey = 'gadha_chor' | 'lal_satti' | 'jhabbu';

export interface Room {
  readonly id: string;
  readonly code: string;
  readonly host_id: string;
  readonly status: RoomStatus;
  readonly max_seats: number;
  readonly locale: RoomLocale;
  readonly game_key: OnlineGameKey;
  readonly created_at?: string;
}

export interface RoomSeat {
  readonly id: string;
  readonly room_id: string;
  readonly seat_index: number;
  readonly occupant: SeatOccupant;
  readonly user_id: string | null;
  readonly display_name: string | null;
  readonly is_ready: boolean;
  readonly joined_at?: string;
}

export interface RoomWithSeats {
  readonly room: Room;
  readonly seats: readonly RoomSeat[];
}

/** Surfaces a Postgres/PostgREST error message without leaking internals. */
function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('No data returned');
  return result.data;
}

export interface CreateRoomInput {
  readonly maxSeats?: number;
  readonly locale?: RoomLocale;
  readonly displayName?: string;
  readonly gameKey?: OnlineGameKey;
}

export async function createRoom(
  client: SupabaseClient,
  input: CreateRoomInput = {},
): Promise<Room> {
  return unwrap<Room>(
    await client.rpc('create_room', {
      p_max_seats: input.maxSeats ?? 6,
      p_locale: input.locale ?? 'en',
      p_display_name: input.displayName ?? null,
      p_game_key: input.gameKey ?? 'gadha_chor',
    }),
  );
}

export async function joinRoomByCode(
  client: SupabaseClient,
  code: string,
  displayName?: string,
): Promise<Room> {
  return unwrap<Room>(
    await client.rpc('join_room_by_code', {
      p_code: code.trim().toUpperCase(),
      p_display_name: displayName ?? null,
    }),
  );
}

export async function setSeatReady(
  client: SupabaseClient,
  roomId: string,
  isReady: boolean,
): Promise<void> {
  const { error } = await client.rpc('set_seat_ready', {
    p_room_id: roomId,
    p_is_ready: isReady,
  });
  if (error) throw new Error(error.message);
}

export async function addBotSeat(
  client: SupabaseClient,
  roomId: string,
  botName?: string,
): Promise<RoomSeat> {
  return unwrap<RoomSeat>(
    await client.rpc('add_bot_seat', {
      p_room_id: roomId,
      ...(botName ? { p_display_name: botName } : {}),
    }),
  );
}

export async function leaveRoom(client: SupabaseClient, roomId: string): Promise<void> {
  const { error } = await client.rpc('leave_room', { p_room_id: roomId });
  if (error) throw new Error(error.message);
}

/** Reads the room and its seats (RLS returns rows only to members). */
export async function fetchRoomByCode(
  client: SupabaseClient,
  code: string,
): Promise<RoomWithSeats | null> {
  const roomResult = await client
    .from('rooms')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .maybeSingle();
  if (roomResult.error) throw new Error(roomResult.error.message);
  const room = roomResult.data as Room | null;
  if (!room) return null;

  const seatsResult = await client
    .from('room_seats')
    .select('*')
    .eq('room_id', room.id)
    .order('seat_index', { ascending: true });
  if (seatsResult.error) throw new Error(seatsResult.error.message);

  return { room, seats: (seatsResult.data ?? []) as RoomSeat[] };
}
