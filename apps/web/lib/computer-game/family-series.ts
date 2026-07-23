/**
 * A family series is the warm, session-scoped tally that survives Play Again: as
 * a family keeps dealing new games in one sitting, it remembers how many each
 * seat has won so a gentle "ahead tonight" line can be surfaced. It is a count
 * of games, never money or points — a grandparents'-table scoreboard, never a
 * casino ledger.
 *
 * Each game contributes the display names of that game's winner(s); the tally is
 * keyed by name because seat ids are re-shuffled on every fresh deal while the
 * names a family uses stay stable across the night.
 */

export interface FamilySeriesStanding {
  readonly name: string;
  readonly wins: number;
}

export interface FamilySeries {
  /** Completed games this sitting. */
  readonly gamesPlayed: number;
  /** Wins keyed by stable display name. */
  readonly winsByName: Readonly<Record<string, number>>;
}

export const EMPTY_FAMILY_SERIES: FamilySeries = { gamesPlayed: 0, winsByName: {} };

/** Folds one completed game's winner(s) into the running tally. */
export function recordFamilySeriesGame(
  series: FamilySeries,
  winnerNames: readonly string[],
): FamilySeries {
  const winsByName: Record<string, number> = { ...series.winsByName };
  for (const name of winnerNames) {
    if (!name) continue;
    winsByName[name] = (winsByName[name] ?? 0) + 1;
  }
  return { gamesPlayed: series.gamesPlayed + 1, winsByName };
}

/** Standings sorted by wins (desc), then name — stable for display. */
export function familySeriesStandings(series: FamilySeries): readonly FamilySeriesStanding[] {
  return Object.entries(series.winsByName)
    .map(([name, wins]) => ({ name, wins }))
    .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));
}

/**
 * The sole leader, or `null` when there is nothing to crown yet — no games
 * played, or a tie for the top. We stay quiet on ties rather than arbitrarily
 * picking one family member over another.
 */
export function familySeriesLeader(series: FamilySeries): FamilySeriesStanding | null {
  const standings = familySeriesStandings(series);
  const top = standings[0];
  if (!top || top.wins === 0) return null;
  if (standings[1] && standings[1].wins === top.wins) return null;
  return top;
}

/** Revives a persisted value into a trustworthy FamilySeries (localStorage). */
export function normalizeFamilySeries(value: unknown): FamilySeries {
  if (!value || typeof value !== 'object') return EMPTY_FAMILY_SERIES;
  const record = value as { readonly gamesPlayed?: unknown; readonly winsByName?: unknown };
  const gamesPlayed =
    typeof record.gamesPlayed === 'number' && record.gamesPlayed >= 0
      ? Math.floor(record.gamesPlayed)
      : 0;
  const winsByName: Record<string, number> = {};
  if (record.winsByName && typeof record.winsByName === 'object') {
    for (const [name, wins] of Object.entries(record.winsByName as Record<string, unknown>)) {
      if (typeof wins === 'number' && wins > 0) winsByName[name] = Math.floor(wins);
    }
  }
  return { gamesPlayed, winsByName };
}
