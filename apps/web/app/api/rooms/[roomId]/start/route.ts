import { NextResponse } from 'next/server';

import { CLASSIC_GULAM_CHOR } from '../../../../../lib/computer-game/rule-pack';
import { advanceBots, botId, initialState, persistStart } from '../../../../../lib/online-game/authority';
import { getRequestUserId } from '../../../../../lib/online-game/route-context';
import {
  getSupabaseAdminClient,
  isAuthorityConfigured,
} from '../../../../../lib/supabase/admin-client';

/**
 * Host-only: deal and start the room's Gadha Chor game (ADR-0010). Authority
 * runs the pure engine server-side and commits through the persistence RPCs;
 * the client learns only the new `gameId` + `stateVersion` and then reads its
 * own hand via RLS. The service-role key never leaves this Node handler.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ roomId: string }>;
}

export async function POST(request: Request, ctx: Context): Promise<Response> {
  if (!isAuthorityConfigured()) {
    return NextResponse.json({ error: 'online play is not configured' }, { status: 503 });
  }
  const userId = await getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  }

  const { roomId } = await ctx.params;
  const admin = getSupabaseAdminClient();

  const { data: room, error: roomErr } = await admin
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle();
  if (roomErr) return NextResponse.json({ error: 'room lookup failed' }, { status: 500 });
  if (!room) return NextResponse.json({ error: 'room not found' }, { status: 404 });
  if (room.host_id !== userId) {
    return NextResponse.json({ error: 'only the host may start the game' }, { status: 403 });
  }
  if (room.status !== 'lobby') {
    return NextResponse.json({ error: 'room is not in the lobby' }, { status: 409 });
  }

  const { data: seatRows, error: seatErr } = await admin
    .from('room_seats')
    .select('*')
    .eq('room_id', roomId)
    .neq('occupant', 'empty')
    .order('seat_index');
  if (seatErr) return NextResponse.json({ error: 'seat lookup failed' }, { status: 500 });

  const seats = seatRows ?? [];
  if (seats.length < CLASSIC_GULAM_CHOR.minPlayers) {
    return NextResponse.json({ error: 'need at least two players' }, { status: 409 });
  }
  if (seats.length > CLASSIC_GULAM_CHOR.maxPlayers) {
    return NextResponse.json({ error: 'too many players' }, { status: 409 });
  }
  if (!seats.every((seat) => seat.is_ready)) {
    return NextResponse.json({ error: 'every seat must be ready' }, { status: 409 });
  }

  const playerIds = seats.map((seat) =>
    seat.occupant === 'human' ? (seat.user_id as string) : botId(seat.seat_index as number),
  );

  try {
    const opening = initialState(playerIds);
    const gameId = await persistStart(admin, roomId, opening);
    const finalState = await advanceBots(admin, gameId, opening);
    return NextResponse.json({ ok: true, gameId, stateVersion: finalState.stateVersion });
  } catch {
    // Any failure here (incl. a race that already left the lobby) is non-fatal to
    // the client — it re-fetches the room and reflects the true state.
    return NextResponse.json({ error: 'could not start the game' }, { status: 500 });
  }
}
