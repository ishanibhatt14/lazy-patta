import type { Locale } from '@lazy-patta/localization';
import type { SupabaseClient } from '@supabase/supabase-js';

import { type JhabbuRoundScore, type JhabbuSavedScoreRule } from './types';

export interface SaveJhabbuScoreSessionInput {
  readonly humanName: string;
  readonly playerCount: number;
  readonly locale: Locale;
  readonly roundScores: readonly JhabbuRoundScore[];
}

export interface SavedJhabbuScoreSession {
  readonly id: string;
  readonly displayName: string;
  readonly playerCount: number;
  readonly locale: Locale;
  readonly createdAt: string;
  readonly scoreRule: JhabbuSavedScoreRule;
  readonly rounds: readonly JhabbuRoundScore[];
}

interface SavedSessionRow {
  readonly id: string;
  readonly display_name: string;
  readonly player_count: number;
  readonly locale: Locale;
  readonly created_at: string;
  readonly score_rule?: JhabbuSavedScoreRule | null;
}

interface SavedRoundRow {
  readonly session_id: string;
  readonly id: string;
  readonly round_number: number;
  readonly loser_name: string;
  readonly finish_order: readonly string[];
  readonly standings: readonly {
    readonly playerId: string;
    readonly playerName: string;
    readonly finishPosition?: number | null;
    readonly penaltyPoints?: number;
    readonly remainingCards?: number;
  }[];
}

function scoreRuleFromRow(_row: Pick<SavedSessionRow, 'score_rule'>): JhabbuSavedScoreRule {
  // Only one scoring rule exists today; kept as a hook for future rule versions
  // so saved rows can be re-interpreted the way Lal Satti handles legacy rules.
  return 'thulla-v1';
}

function displayNameForSave(name: string): string {
  const normalized = name.trim().replace(/\s+/g, ' ').slice(0, 40);
  return normalized.length > 0 ? normalized : 'Player';
}

function savedRoundFromRow(row: SavedRoundRow, scoreRule: JhabbuSavedScoreRule): JhabbuRoundScore {
  return {
    id: row.id,
    roundNumber: row.round_number,
    scoreRule,
    loserId: '',
    loserName: row.loser_name,
    finishOrderNames: row.finish_order,
    standings: row.standings.map((standing) => ({
      playerId: standing.playerId,
      playerName: standing.playerName,
      finishPosition: standing.finishPosition ?? null,
      penaltyPoints: standing.penaltyPoints ?? 0,
      remainingCards: standing.remainingCards ?? 0,
    })),
  };
}

export async function saveJhabbuScoreSession(
  client: SupabaseClient,
  input: SaveJhabbuScoreSessionInput,
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
    .from('jhabbu_score_sessions')
    .insert({
      owner_id: userData.user.id,
      display_name: displayName,
      player_count: input.playerCount,
      locale: input.locale,
      score_rule: 'thulla-v1',
    })
    .select('id')
    .single();
  if (savedSession.error || !savedSession.data) {
    throw new Error(savedSession.error?.message ?? 'Unable to save score session.');
  }

  if (input.roundScores.length > 0) {
    const savedRounds = await client.from('jhabbu_score_rounds').insert(
      input.roundScores.map((round) => ({
        session_id: savedSession.data.id,
        round_number: round.roundNumber,
        loser_name: displayNameForSave(round.loserName),
        finish_order: [...round.finishOrderNames],
        standings: round.standings.map((standing) => ({
          playerId: standing.playerId,
          playerName: standing.playerName,
          finishPosition: standing.finishPosition,
          penaltyPoints: standing.penaltyPoints,
          remainingCards: standing.remainingCards,
        })),
      })),
    );
    if (savedRounds.error) throw new Error(savedRounds.error.message);
  }

  return savedSession.data.id as string;
}

export async function listJhabbuScoreSessions(
  client: SupabaseClient,
): Promise<readonly SavedJhabbuScoreSession[]> {
  const sessions = await client
    .from('jhabbu_score_sessions')
    .select('id, display_name, player_count, locale, created_at, score_rule')
    .order('created_at', { ascending: false })
    .limit(5);
  if (sessions.error) throw new Error(sessions.error.message);

  const rows = (sessions.data ?? []) as readonly SavedSessionRow[];
  const sessionIds = rows.map((row) => row.id);
  if (sessionIds.length === 0) return [];

  const rounds = await client
    .from('jhabbu_score_rounds')
    .select('session_id, id, round_number, loser_name, finish_order, standings')
    .in('session_id', sessionIds)
    .order('round_number', { ascending: true });
  if (rounds.error) throw new Error(rounds.error.message);

  const roundsBySession = new Map<string, SavedRoundRow[]>();
  for (const row of (rounds.data ?? []) as readonly SavedRoundRow[]) {
    const list = roundsBySession.get(row.session_id) ?? [];
    list.push(row);
    roundsBySession.set(row.session_id, list);
  }

  return rows.map((row) => {
    const scoreRule = scoreRuleFromRow(row);
    return {
      id: row.id,
      displayName: row.display_name,
      playerCount: row.player_count,
      locale: row.locale,
      createdAt: row.created_at,
      scoreRule,
      rounds: (roundsBySession.get(row.id) ?? []).map((round) =>
        savedRoundFromRow(round, scoreRule),
      ),
    };
  });
}
