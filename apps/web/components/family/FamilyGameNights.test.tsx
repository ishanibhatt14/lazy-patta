import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FamilyGameNights } from './FamilyGameNights';

const family = vi.hoisted(() => ({
  fetchUpcomingFamilyGameNights: vi.fn(),
  scheduleFamilyGameNight: vi.fn(),
  cancelFamilyGameNight: vi.fn(),
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
  fetchUpcomingFamilyGameNights: (...a: unknown[]) => family.fetchUpcomingFamilyGameNights(...a),
  scheduleFamilyGameNight: (...a: unknown[]) => family.scheduleFamilyGameNight(...a),
  cancelFamilyGameNight: (...a: unknown[]) => family.cancelFamilyGameNight(...a),
}));

describe('FamilyGameNights', () => {
  beforeEach(() => {
    family.fetchUpcomingFamilyGameNights.mockResolvedValue([]);
    family.scheduleFamilyGameNight.mockResolvedValue({});
    family.cancelFamilyGameNight.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the empty state when no nights are planned', async () => {
    render(<FamilyGameNights groupId="g1" familyName="Bhatt Family" />);
    expect(await screen.findByText(/No game nights planned yet/i)).toBeVisible();
  });

  it('lists an upcoming night with its game and an add-to-calendar link', async () => {
    family.fetchUpcomingFamilyGameNights.mockResolvedValue([
      {
        id: 'n1',
        group_id: 'g1',
        game_key: 'lal_satti',
        scheduled_for: '2026-08-02T19:30:00Z',
        note: 'Bring chai',
        created_by: 'u1',
      },
    ]);
    render(<FamilyGameNights groupId="g1" familyName="Bhatt Family" />);

    expect(await screen.findByText('Lal Satti')).toBeVisible();
    expect(screen.getByText(/Bring chai/)).toBeVisible();
    const link = screen.getByRole('link', { name: /Add to calendar/i });
    expect(link.getAttribute('href')).toContain('data:text/calendar');
  });

  it('schedules a night and fires the analytics event', async () => {
    const user = userEvent.setup();
    render(<FamilyGameNights groupId="g1" familyName="Bhatt Family" />);
    await screen.findByText(/No game nights planned yet/i);

    // datetime-local input is the only one of its type.
    const dateInput = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    await user.type(dateInput, '2026-08-02T19:30');
    await user.selectOptions(screen.getByRole('combobox'), 'lal_satti');
    await user.click(screen.getByRole('button', { name: /Plan night/i }));

    await waitFor(() =>
      expect(family.scheduleFamilyGameNight).toHaveBeenCalledWith(
        expect.anything(),
        'g1',
        expect.objectContaining({ gameKey: 'lal_satti' }),
      ),
    );
    expect(track.trackGrowthEvent).toHaveBeenCalledWith({
      name: 'family_game_night_scheduled',
      gameSlug: 'lal-satti',
    });
  });

  it('cancels a night when its cancel button is pressed', async () => {
    family.fetchUpcomingFamilyGameNights.mockResolvedValue([
      {
        id: 'n1',
        group_id: 'g1',
        game_key: null,
        scheduled_for: '2026-08-02T19:30:00Z',
        note: null,
        created_by: 'u1',
      },
    ]);
    const user = userEvent.setup();
    render(<FamilyGameNights groupId="g1" familyName="Bhatt Family" />);

    await user.click(await screen.findByRole('button', { name: /^Cancel$/i }));
    await waitFor(() =>
      expect(family.cancelFamilyGameNight).toHaveBeenCalledWith(expect.anything(), 'n1'),
    );
  });
});
