import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FamilyTablePanel } from './FamilyTablePanel';

const family = vi.hoisted(() => ({
  fetchFamilyFavoriteGames: vi.fn(),
  fetchFamilyRecentTables: vi.fn(),
  fetchFamilySeriesResults: vi.fn(),
}));
const track = vi.hoisted(() => ({ trackGrowthEvent: vi.fn() }));

vi.mock('../../lib/locale/preferred-locale-context', () => ({
  usePreferredLocale: () => ({ locale: 'en', setLocale: vi.fn() }),
}));
vi.mock('../../lib/supabase/browser-client', () => ({
  getSupabaseBrowserClient: () => ({}) as unknown,
}));
vi.mock('../../lib/growth/analytics', () => ({ trackGrowthEvent: track.trackGrowthEvent }));
vi.mock('../../lib/family/family-groups-client', () => ({
  fetchFamilyFavoriteGames: (...a: unknown[]) => family.fetchFamilyFavoriteGames(...a),
  fetchFamilyRecentTables: (...a: unknown[]) => family.fetchFamilyRecentTables(...a),
  fetchFamilySeriesResults: (...a: unknown[]) => family.fetchFamilySeriesResults(...a),
}));

describe('FamilyTablePanel', () => {
  beforeEach(() => {
    family.fetchFamilyFavoriteGames.mockResolvedValue([]);
    family.fetchFamilyRecentTables.mockResolvedValue([]);
    family.fetchFamilySeriesResults.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders favourites with their pinned house-rule variant and fires the view event', async () => {
    family.fetchFamilyFavoriteGames.mockResolvedValue([
      { group_id: 'g1', game_key: 'lal_satti', ruleset_preset: 'lal-satti-all-sevens-open' },
    ]);
    render(<FamilyTablePanel groupId="g1" />);

    expect(await screen.findByText('Lal Satti')).toBeVisible();
    expect(screen.getByText(/House rules:/i)).toBeVisible();
    await waitFor(() =>
      expect(track.trackGrowthEvent).toHaveBeenCalledWith({
        name: 'family_detail_viewed',
        favoriteCount: 1,
      }),
    );
  });

  it('shows a recent table by game and code', async () => {
    family.fetchFamilyRecentTables.mockResolvedValue([
      { id: 'r1', group_id: 'g1', game_key: 'jhabbu', room_code: 'BH2026', recorded_by: 'u1' },
    ]);
    render(<FamilyTablePanel groupId="g1" />);

    expect(await screen.findByText('Jhabbu')).toBeVisible();
    expect(screen.getByText(/Table BH2026/)).toBeVisible();
  });

  it('shows a series winner and round count', async () => {
    family.fetchFamilySeriesResults.mockResolvedValue([
      {
        id: 's1',
        group_id: 'g1',
        game_key: 'gadha_chor',
        winner_user_id: 'u1',
        winner_display_name: 'Ba',
        rounds_played: 3,
        summary: {},
        recorded_by: 'u1',
      },
    ]);
    render(<FamilyTablePanel groupId="g1" />);

    expect(await screen.findByText(/Winner: Ba/)).toBeVisible();
    expect(screen.getByText(/3 rounds/)).toBeVisible();
  });

  it('shows empty states when the family has no recorded activity', async () => {
    render(<FamilyTablePanel groupId="g1" />);
    expect(await screen.findByText(/No favourite games pinned yet/i)).toBeVisible();
    expect(screen.getByText(/No tables played together yet/i)).toBeVisible();
    expect(screen.getByText(/No finished series yet/i)).toBeVisible();
  });

  it('surfaces a load error', async () => {
    family.fetchFamilyFavoriteGames.mockRejectedValue(new Error('boom'));
    render(<FamilyTablePanel groupId="g1" />);
    expect(await screen.findByText(/couldn't load this family's activity/i)).toBeVisible();
  });
});
