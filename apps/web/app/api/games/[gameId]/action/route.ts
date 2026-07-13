import type { GameState } from '@lazy-patta/game-contracts';
import { NextResponse } from 'next/server';

import {
  advanceBots,
  applyHumanDraw,
  currentActor,
  VersionConflictError,
} from '../../../../../lib/online-game/authority';
import { getRequestUserId } from '../../../../../lib/online-game/route-context';
import {
  getSupabaseAdminClient,
  isAuthorityConfigured,
} from '../../../../../lib/supabase/admin-client';

/**
 * Submit one game action (a hidden-card draw). The server loads the full
 * authoritative state, validates the opaque position token through the pure
 * engine, and commits atomically with the `expectedVersion` guard + idempotent
 * `clientActionId`. Bots then play their turns server-side. The response carries
 * only the new `stateVersion`; the client re-reads its own hand via RLS.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ gameId: string }>;
}

interface ActionBody {
  clientActionId: string;
  positionToken: string;
  expectedVersion: number;
}

function parseBody(value: unknown): ActionBody | null {
  if (typeof value !== 'object' || value === null) return null;
  const { clientActionId, positionToken, expectedVersion } = value as Record<string, unknown>;
  if (
    typeof clientActionId !== 'string' ||
    typeof positionToken !== 'string' ||
    typeof expectedVersion !== 'number'
  ) {
    return null;
  }
  return { clientActionId, positionToken, expectedVersion };
}

export async function POST(request: Request, ctx: Context): Promise<Response> {
  if (!isAuthorityConfigured()) {
    return NextResponse.json({ error: 'online play is not configured' }, { status: 503 });
  }
  const userId = await getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'authentication required' }, { status: 401 });
  }

  const body = parseBody(await request.json().catch(() => null));
  if (!body) return NextResponse.json({ error: 'invalid request body' }, { status: 400 });

  const { gameId } = await ctx.params;
  const admin = getSupabaseAdminClient();

  const { data: game, error: gameErr } = await admin
    .from('games')
    .select('id,status,state_version')
    .eq('id', gameId)
    .maybeSingle();
  if (gameErr) return NextResponse.json({ error: 'game lookup failed' }, { status: 500 });
  if (!game) return NextResponse.json({ error: 'game not found' }, { status: 404 });
  if (game.status !== 'active') {
    return NextResponse.json({ error: 'game is not active' }, { status: 409 });
  }

  const { data: authRow, error: authErr } = await admin
    .from('game_authority_state')
    .select('state')
    .eq('game_id', gameId)
    .maybeSingle();
  if (authErr) return NextResponse.json({ error: 'state lookup failed' }, { status: 500 });
  if (!authRow) return NextResponse.json({ error: 'game state not found' }, { status: 404 });

  const state = authRow.state as GameState;
  if (!state.players.some((player) => player.id === userId)) {
    return NextResponse.json({ error: 'not a player in this game' }, { status: 403 });
  }
  if (body.expectedVersion !== state.stateVersion) {
    return NextResponse.json(
      { error: 'version conflict', stateVersion: state.stateVersion },
      { status: 409 },
    );
  }
  if (currentActor(state) !== userId) {
    return NextResponse.json({ error: 'not your turn' }, { status: 409 });
  }

  try {
    const afterHuman = await applyHumanDraw(admin, gameId, state, userId, body.positionToken);
    const finalState = await advanceBots(admin, gameId, afterHuman);
    return NextResponse.json({ ok: true, stateVersion: finalState.stateVersion });
  } catch (caught) {
    if (caught instanceof VersionConflictError) {
      return NextResponse.json({ error: 'version conflict' }, { status: 409 });
    }
    if (caught instanceof Error && caught.message === 'INVALID_POSITION_TOKEN') {
      return NextResponse.json({ error: 'invalid or stale move' }, { status: 400 });
    }
    return NextResponse.json({ error: 'could not apply the action' }, { status: 500 });
  }
}
