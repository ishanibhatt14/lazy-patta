import type { Locale } from '@lazy-patta/localization';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { LalSattiRoundScore } from './types';

export interface SaveLalSattiScoreSessionInput {
  readonly humanName: string;
  readonly playerCount: number;
  readonly locale: Locale;
  readonly roundScores: readonly LalSattiRoundScore[];
}

export interface SavedLalSattiScoreSession {
  readonly id: string;
  readonly displayName: string;
  readonly playerCount: number;
  readonly locale: Locale;
  readonly createdAt: string;
  readonly rounds: readonly LalSattiRoundScore[];
}

interface SavedSessionRow {
  readonly id: string;
  readonly display_name: string;
  readonly player_count: number;
  readonly locale: Locale;
  readonly created_at: string;
}

interface SavedRoundRow {
  readonly session_id: string;
  readonly id: string;
  readonly round_number: number;
  readonly winner_names: readonly string[];
  readonly leftovers: readonly {
    readonly playerId: string;
    readonly playerName: string;
    readonly cardCount: number;
  }[];
}

function displayNameForSave(name: string): string {
  const normalized = name.trim().replace(/\s+/g, ' ').slice(0, 40);
  return normalized.length > 0 ? normalized : 'Player';
}

function savedRoundFromRow(row: SavedRoundRow): LalSattiRoundScore {
  return {
    id: row.id,
    roundNumber: row.round_number,
    winnerNames: row.winner_names,
    leftovers: row.leftovers,
  };
}

export async function saveLalSattiScoreSession(
  client: SupabaseClient,
  input: SaveLalSattiScoreSessionInput,
): Promise<string> {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!userData.user) throw new Error('Sign in before saving scores.');

  const displayName = displayNameForSave(input.humanName);
  const profile = await client
    .from('profiles')
    .upsert({ id: userData.user.id, display_name: displayName }, { onConflict: 'id' })
    .select('id')
    .single();
  if (profile.error) throw new Error(profile.error.message);

  const savedSession = await client
    .from('lal_satti_score_sessions')
    .insert({
      owner_id: userData.user.id,
      display_name: displayName,
      player_count: input.playerCount,
      locale: input.locale,
    })
    .select('id')
    .single();
  if (savedSession.error || !savedSession.data) {
    throw new Error(savedSession.error?.message ?? 'Unable to save score session.');
  }

  if (input.roundScores.length > 0) {
    const savedRounds = await client.from('lal_satti_score_rounds').insert(
      input.roundScores.map((round) => ({
        session_id: savedSession.data.id,
        round_number: round.roundNumber,
        winner_names: [...round.winnerNames],
        leftovers: round.leftovers.map((leftover) => ({
          playerId: leftover.playerId,
          playerName: leftover.playerName,
          cardCount: leftover.cardCount,
        })),
      })),
    );
    if (savedRounds.error) throw new Error(savedRounds.error.message);
  }

  return savedSession.data.id as string;
}

export async function listLalSattiScoreSessions(
  client: SupabaseClient,
): Promise<readonly SavedLalSattiScoreSession[]> {
  const sessions = await client
    .from('lal_satti_score_sessions')
    .select('id, display_name, player_count, locale, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  if (sessions.error) throw new Error(sessions.error.message);

  const rows = (sessions.data ?? []) as readonly SavedSessionRow[];
  const sessionIds = rows.map((row) => row.id);
  if (sessionIds.length === 0) return [];

  const rounds = await client
    .from('lal_satti_score_rounds')
    .select('session_id, id, round_number, winner_names, leftovers')
    .in('session_id', sessionIds)
    .order('round_number', { ascending: true });
  if (rounds.error) throw new Error(rounds.error.message);

  const roundsBySession = new Map<string, SavedRoundRow[]>();
  for (const row of (rounds.data ?? []) as readonly SavedRoundRow[]) {
    const list = roundsBySession.get(row.session_id) ?? [];
    list.push(row);
    roundsBySession.set(row.session_id, list);
  }

  return rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    playerCount: row.player_count,
    locale: row.locale,
    createdAt: row.created_at,
    rounds: (roundsBySession.get(row.id) ?? []).map(savedRoundFromRow),
  }));
}
