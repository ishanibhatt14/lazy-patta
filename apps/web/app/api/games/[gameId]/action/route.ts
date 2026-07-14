import type { GameState } from '@lazy-patta/game-contracts';
import type { JhabbuState } from '@lazy-patta/jhabbu-engine';
import type { LalSattiState } from '@lazy-patta/lal-satti-engine';
import { NextResponse } from 'next/server';

import {
  advanceBots,
  applyHumanDraw,
  currentActor,
  VersionConflictError,
} from '../../../../../lib/online-game/authority';
import {
  advanceJhabbuBots,
  applyHumanJhabbuAction,
  currentJhabbuActor,
  type JhabbuClientAction,
} from '../../../../../lib/online-game/jhabbu-authority';
import {
  advanceLalSattiBots,
  applyHumanLalSattiAction,
  currentLalSattiActor,
  type LalSattiClientAction,
} from '../../../../../lib/online-game/lal-satti-authority';
import { getRequestUserId } from '../../../../../lib/online-game/route-context';
import {
  getSupabaseAdminClient,
  isAuthorityConfigured,
} from '../../../../../lib/supabase/admin-client';

/**
 * Submit one game action. The server loads the full authoritative state,
 * validates the move through the selected pure engine, commits atomically with
 * the `expectedVersion` guard + idempotent `clientActionId`, then advances bots.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Context {
  params: Promise<{ gameId: string }>;
}

/**
 * A normalized action envelope. The concrete move is disambiguated per game_key
 * downstream: Gadha Chor carries an opaque `positionToken`; Lal Satti and Jhabbu
 * carry a discriminated `action` object (their PLAY_CARD shapes overlap, so the
 * server always parses the raw action against the loaded game's key).
 */
interface ParsedActionBody {
  readonly clientActionId: string;
  readonly expectedVersion: number;
  readonly positionToken?: string;
  readonly action?: Record<string, unknown>;
}

function parseLalSattiAction(
  value: Record<string, unknown> | undefined,
): LalSattiClientAction | null {
  if (!value) return null;
  if (value.type === 'PASS') return { type: 'PASS' };
  if (value.type === 'PLAY_CARD' && typeof value.cardId === 'string') {
    return { type: 'PLAY_CARD', cardId: value.cardId };
  }
  return null;
}

function parseJhabbuAction(value: Record<string, unknown> | undefined): JhabbuClientAction | null {
  if (!value) return null;
  if (value.type === 'DRAW_FROM_WASTE') return { type: 'DRAW_FROM_WASTE' };
  if (value.type === 'PLAY_CARD' && typeof value.cardId === 'string') {
    return { type: 'PLAY_CARD', cardId: value.cardId };
  }
  return null;
}

function parseBody(value: unknown): ParsedActionBody | null {
  if (typeof value !== 'object' || value === null) return null;
  const { clientActionId, positionToken, expectedVersion, action } = value as Record<
    string,
    unknown
  >;
  if (typeof clientActionId !== 'string' || typeof expectedVersion !== 'number') return null;

  return {
    clientActionId,
    expectedVersion,
    ...(typeof positionToken === 'string' ? { positionToken } : {}),
    ...(typeof action === 'object' && action !== null
      ? { action: action as Record<string, unknown> }
      : {}),
  };
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
    .select('id,status,state_version,game_key')
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

  if (game.game_key === 'lal_satti') {
    const action = parseLalSattiAction(body.action);
    if (!action) {
      return NextResponse.json({ error: 'invalid action for this game' }, { status: 400 });
    }

    const state = authRow.state as LalSattiState;
    if (!state.players.some((player) => player.id === userId)) {
      return NextResponse.json({ error: 'not a player in this game' }, { status: 403 });
    }
    if (body.expectedVersion !== state.stateVersion) {
      return NextResponse.json(
        { error: 'version conflict', stateVersion: state.stateVersion },
        { status: 409 },
      );
    }
    if (currentLalSattiActor(state) !== userId) {
      return NextResponse.json({ error: 'not your turn' }, { status: 409 });
    }

    try {
      const afterHuman = await applyHumanLalSattiAction(
        admin,
        gameId,
        state,
        userId,
        action,
        body.clientActionId,
      );
      const finalState = await advanceLalSattiBots(admin, gameId, afterHuman);
      return NextResponse.json({ ok: true, stateVersion: finalState.stateVersion });
    } catch (caught) {
      if (caught instanceof VersionConflictError) {
        return NextResponse.json({ error: 'version conflict' }, { status: 409 });
      }
      if (caught instanceof Error && caught.message === 'INVALID_LAL_SATTI_ACTION') {
        return NextResponse.json({ error: 'invalid or stale move' }, { status: 400 });
      }
      return NextResponse.json({ error: 'could not apply the action' }, { status: 500 });
    }
  }

  if (game.game_key === 'jhabbu') {
    const action = parseJhabbuAction(body.action);
    if (!action) {
      return NextResponse.json({ error: 'invalid action for this game' }, { status: 400 });
    }

    const state = authRow.state as JhabbuState;
    if (!state.players.some((player) => player.id === userId)) {
      return NextResponse.json({ error: 'not a player in this game' }, { status: 403 });
    }
    if (body.expectedVersion !== state.stateVersion) {
      return NextResponse.json(
        { error: 'version conflict', stateVersion: state.stateVersion },
        { status: 409 },
      );
    }
    if (currentJhabbuActor(state) !== userId) {
      return NextResponse.json({ error: 'not your turn' }, { status: 409 });
    }

    try {
      const afterHuman = await applyHumanJhabbuAction(
        admin,
        gameId,
        state,
        userId,
        action,
        body.clientActionId,
      );
      const finalState = await advanceJhabbuBots(admin, gameId, afterHuman);
      return NextResponse.json({ ok: true, stateVersion: finalState.stateVersion });
    } catch (caught) {
      if (caught instanceof VersionConflictError) {
        return NextResponse.json({ error: 'version conflict' }, { status: 409 });
      }
      if (caught instanceof Error && caught.message === 'INVALID_JHABBU_ACTION') {
        return NextResponse.json({ error: 'invalid or stale move' }, { status: 400 });
      }
      return NextResponse.json({ error: 'could not apply the action' }, { status: 500 });
    }
  }

  if (!body.positionToken) {
    return NextResponse.json({ error: 'invalid action for this game' }, { status: 400 });
  }

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
