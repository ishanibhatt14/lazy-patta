import type { Card, GameResult, PublicSnapshot } from '@lazy-patta/game-contracts';
import type { JhabbuResult } from '@lazy-patta/jhabbu-engine';
import type { LalSattiResult } from '@lazy-patta/lal-satti-engine';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { JhabbuClientAction, JhabbuPublicSnapshot } from './jhabbu-authority';
import type { LalSattiClientAction, LalSattiPublicSnapshot } from './lal-satti-authority';

/**
 * Client wrappers for live gameplay. Reads (public snapshot, own hand) go
 * straight to RLS-scoped tables; the two *mutations* (start, draw) POST to the
 * server-authority route handlers with the caller's access token — the client
 * never computes or writes game state. Each player can only ever read their own
 * `game_private_hands` row, so an opponent's cards never reach this code.
 */

export interface GameRow {
  readonly id: string;
  readonly game_key: 'gadha_chor' | 'lal_satti' | 'jhabbu';
  readonly status: 'active' | 'complete' | 'abandoned';
  readonly state_version: number;
  readonly public_snapshot: PublicSnapshot | LalSattiPublicSnapshot | JhabbuPublicSnapshot;
  readonly result: GameResult | LalSattiResult | JhabbuResult | null;
  readonly created_at?: string;
}

export interface DrawInput {
  readonly clientActionId: string;
  readonly positionToken: string;
  readonly expectedVersion: number;
}

export interface LalSattiActionInput {
  readonly clientActionId: string;
  readonly action: LalSattiClientAction;
  readonly expectedVersion: number;
}

export interface JhabbuActionInput {
  readonly clientActionId: string;
  readonly action: JhabbuClientAction;
  readonly expectedVersion: number;
}

async function authedPost(
  client: SupabaseClient,
  url: string,
  body: unknown,
): Promise<Record<string, unknown>> {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('You must be signed in to play.');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body ?? {}),
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof json.error === 'string' ? json.error : 'Request failed');
  }
  return json;
}

/** Host-only: deal and start the room's game. */
export async function startGame(
  client: SupabaseClient,
  roomId: string,
): Promise<{ gameId: string; stateVersion: number }> {
  const json = await authedPost(client, `/api/rooms/${roomId}/start`, {});
  return { gameId: String(json.gameId), stateVersion: Number(json.stateVersion) };
}

/** Submit a hidden-card draw via the authority route. */
export async function drawCard(
  client: SupabaseClient,
  gameId: string,
  input: DrawInput,
): Promise<{ stateVersion: number }> {
  const json = await authedPost(client, `/api/games/${gameId}/action`, input);
  return { stateVersion: Number(json.stateVersion) };
}

/** Submit a Lal Satti play/pass through the authority route. */
export async function submitLalSattiAction(
  client: SupabaseClient,
  gameId: string,
  input: LalSattiActionInput,
): Promise<{ stateVersion: number }> {
  const json = await authedPost(client, `/api/games/${gameId}/action`, input);
  return { stateVersion: Number(json.stateVersion) };
}

/** Submit a Jhabbu play/draw through the authority route. */
export async function submitJhabbuAction(
  client: SupabaseClient,
  gameId: string,
  input: JhabbuActionInput,
): Promise<{ stateVersion: number }> {
  const json = await authedPost(client, `/api/games/${gameId}/action`, input);
  return { stateVersion: Number(json.stateVersion) };
}

/** The room's most recent game (RLS returns it only to members). */
export async function fetchLatestGame(
  client: SupabaseClient,
  roomId: string,
): Promise<GameRow | null> {
  const result = await client
    .from('games')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return (result.data as GameRow | null) ?? null;
}

/** The caller's own hand for a game. RLS forbids reading anyone else's row. */
export async function fetchMyHand(
  client: SupabaseClient,
  gameId: string,
  userId: string,
): Promise<Card[]> {
  const result = await client
    .from('game_private_hands')
    .select('hand')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  const row = result.data as { hand: Card[] } | null;
  return row?.hand ?? [];
}
