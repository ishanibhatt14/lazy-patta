import type { Locale } from '@lazy-patta/localization';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { LalSattiRoundScore } from './types';

export interface SaveLalSattiScoreSessionInput {
  readonly humanName: string;
  readonly playerCount: number;
  readonly locale: Locale;
  readonly roundScores: readonly LalSattiRoundScore[];
}

function displayNameForSave(name: string): string {
  const normalized = name.trim().replace(/\s+/g, ' ').slice(0, 40);
  return normalized.length > 0 ? normalized : 'Player';
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
