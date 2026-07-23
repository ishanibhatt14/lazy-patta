import { describe, expect, it } from 'vitest';

import {
  EMPTY_FAMILY_SERIES,
  familySeriesLeader,
  familySeriesStandings,
  normalizeFamilySeries,
  recordFamilySeriesGame,
} from './family-series';

describe('family series', () => {
  it('accumulates wins across games in a sitting', () => {
    let series = EMPTY_FAMILY_SERIES;
    series = recordFamilySeriesGame(series, ['Ba']);
    series = recordFamilySeriesGame(series, ['Ba']);
    series = recordFamilySeriesGame(series, ['You']);

    expect(series.gamesPlayed).toBe(3);
    expect(series.winsByName).toEqual({ Ba: 2, You: 1 });
    expect(familySeriesLeader(series)).toEqual({ name: 'Ba', wins: 2 });
  });

  it('credits every winner when a game ends in a shared win', () => {
    const series = recordFamilySeriesGame(EMPTY_FAMILY_SERIES, ['Ba', 'Kaka']);
    expect(series.winsByName).toEqual({ Ba: 1, Kaka: 1 });
  });

  it('ignores empty winner names', () => {
    const series = recordFamilySeriesGame(EMPTY_FAMILY_SERIES, ['', 'Ba']);
    expect(series.winsByName).toEqual({ Ba: 1 });
  });

  it('stays quiet on a tie for the top rather than crowning one member', () => {
    let series = EMPTY_FAMILY_SERIES;
    series = recordFamilySeriesGame(series, ['Ba']);
    series = recordFamilySeriesGame(series, ['You']);
    expect(familySeriesLeader(series)).toBeNull();
    // Standings still list both, sorted deterministically.
    expect(familySeriesStandings(series)).toEqual([
      { name: 'Ba', wins: 1 },
      { name: 'You', wins: 1 },
    ]);
  });

  it('has no leader before any game is played', () => {
    expect(familySeriesLeader(EMPTY_FAMILY_SERIES)).toBeNull();
  });

  it('revives persisted values and rejects malformed ones', () => {
    expect(normalizeFamilySeries({ gamesPlayed: 2, winsByName: { Ba: 2 } })).toEqual({
      gamesPlayed: 2,
      winsByName: { Ba: 2 },
    });
    expect(normalizeFamilySeries('nonsense')).toEqual(EMPTY_FAMILY_SERIES);
    expect(normalizeFamilySeries({ gamesPlayed: -1, winsByName: { Ba: 0, You: 'x' } })).toEqual({
      gamesPlayed: 0,
      winsByName: {},
    });
  });
});
