import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FamilyHub } from './FamilyHub';

const auth = vi.hoisted(() => ({
  value: { state: { status: 'signed-in' } as { status: string }, configured: true },
}));
const family = vi.hoisted(() => ({
  fetchMyFamilyGroups: vi.fn(),
  createFamilyGroup: vi.fn(),
  joinFamilyGroupByCode: vi.fn(),
}));
const track = vi.hoisted(() => ({ trackGrowthEvent: vi.fn() }));

vi.mock('../../lib/auth/auth-context', () => ({ useAuth: () => auth.value }));
vi.mock('../../lib/locale/preferred-locale-context', () => ({
  usePreferredLocale: () => ({ locale: 'en', setLocale: vi.fn() }),
}));
vi.mock('../../lib/supabase/browser-client', () => ({
  getSupabaseBrowserClient: () => ({}) as unknown,
}));
vi.mock('../../lib/growth/analytics', () => ({ trackGrowthEvent: track.trackGrowthEvent }));
vi.mock('../../lib/family/family-groups-client', () => ({
  fetchMyFamilyGroups: (...a: unknown[]) => family.fetchMyFamilyGroups(...a),
  createFamilyGroup: (...a: unknown[]) => family.createFamilyGroup(...a),
  joinFamilyGroupByCode: (...a: unknown[]) => family.joinFamilyGroupByCode(...a),
}));
// LoginPanel is only rendered in the signed-out branch, which these tests avoid.
vi.mock('../auth/LoginPanel', () => ({ LoginPanel: () => <div>login</div> }));

const GROUP = { id: 'g1', name: 'Bhatt Family', join_code: 'BH2026', created_by: 'u1' };

describe('FamilyHub', () => {
  beforeEach(() => {
    auth.value = { state: { status: 'signed-in' }, configured: true };
    family.fetchMyFamilyGroups.mockResolvedValue([]);
    family.createFamilyGroup.mockResolvedValue(GROUP);
    family.joinFamilyGroupByCode.mockResolvedValue(GROUP);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows an unavailable panel when Supabase is not configured', () => {
    auth.value = { state: { status: 'signed-out' }, configured: false };
    render(<FamilyHub />);
    expect(screen.getByText(/Families are unavailable/i)).toBeVisible();
    expect(family.fetchMyFamilyGroups).not.toHaveBeenCalled();
  });

  it('lists the caller’s families and fires the hub-viewed event once', async () => {
    family.fetchMyFamilyGroups.mockResolvedValue([GROUP]);
    render(<FamilyHub />);
    expect(await screen.findByText('Bhatt Family')).toBeVisible();
    expect(screen.getByText(/Code BH2026/)).toBeVisible();
    await waitFor(() =>
      expect(track.trackGrowthEvent).toHaveBeenCalledWith({
        name: 'family_hub_viewed',
        familyCount: 1,
      }),
    );
  });

  it('shows the empty state when the caller has no families', async () => {
    render(<FamilyHub />);
    expect(await screen.findByText(/You're not in a family yet/i)).toBeVisible();
  });

  it('creates a family through the client and refreshes the list', async () => {
    const user = userEvent.setup();
    family.fetchMyFamilyGroups.mockResolvedValueOnce([]).mockResolvedValueOnce([GROUP]);
    render(<FamilyHub />);
    await screen.findByText(/You're not in a family yet/i);

    await user.type(screen.getByPlaceholderText('Bhatt Family'), 'Bhatt Family');
    await user.type(screen.getByPlaceholderText('Ba'), 'Ishani');
    await user.click(screen.getByRole('button', { name: /Create family/i }));

    expect(family.createFamilyGroup).toHaveBeenCalledWith(expect.anything(), {
      name: 'Bhatt Family',
      displayName: 'Ishani',
    });
    expect(track.trackGrowthEvent).toHaveBeenCalledWith({ name: 'family_group_create_started' });
    expect(track.trackGrowthEvent).toHaveBeenCalledWith({ name: 'family_group_created' });
    expect(await screen.findByText('Bhatt Family')).toBeVisible();
  });

  it('joins a family by code through the client', async () => {
    const user = userEvent.setup();
    render(<FamilyHub />);
    await screen.findByText(/You're not in a family yet/i);

    await user.type(screen.getByPlaceholderText('BH2026'), 'bh2026');
    await user.click(screen.getByRole('button', { name: /Join family/i }));

    expect(family.joinFamilyGroupByCode).toHaveBeenCalledWith(
      expect.anything(),
      'BH2026',
      undefined,
    );
    expect(track.trackGrowthEvent).toHaveBeenCalledWith({ name: 'family_group_joined' });
  });

  it('surfaces the RPC error message when creation fails', async () => {
    const user = userEvent.setup();
    family.createFamilyGroup.mockRejectedValue(
      new Error('a family name of 1 to 60 characters is required'),
    );
    render(<FamilyHub />);
    await screen.findByText(/You're not in a family yet/i);

    await user.type(screen.getByPlaceholderText('Bhatt Family'), 'x');
    await user.click(screen.getByRole('button', { name: /Create family/i }));

    expect(
      await screen.findByText(/a family name of 1 to 60 characters is required/i),
    ).toBeVisible();
  });
});
