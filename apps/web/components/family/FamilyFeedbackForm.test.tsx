import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FamilyFeedbackForm } from './FamilyFeedbackForm';

const family = vi.hoisted(() => ({ submitFamilyFeedback: vi.fn() }));
const track = vi.hoisted(() => ({ trackGrowthEvent: vi.fn() }));

vi.mock('../../lib/locale/preferred-locale-context', () => ({
  usePreferredLocale: () => ({ locale: 'en', setLocale: vi.fn() }),
}));
vi.mock('../../lib/supabase/browser-client', () => ({
  getSupabaseBrowserClient: () => ({}) as unknown,
}));
vi.mock('../../lib/growth/analytics', () => ({ trackGrowthEvent: track.trackGrowthEvent }));
vi.mock('../../lib/family/family-groups-client', () => ({
  submitFamilyFeedback: (...a: unknown[]) => family.submitFamilyFeedback(...a),
}));

describe('FamilyFeedbackForm', () => {
  beforeEach(() => {
    family.submitFamilyFeedback.mockResolvedValue({ id: 'f1' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('submits the chosen category and message, then thanks the member', async () => {
    const user = userEvent.setup();
    render(<FamilyFeedbackForm groupId="g1" />);

    await user.click(screen.getByLabelText(/Problem/i));
    await user.type(screen.getByLabelText(/Message/i), 'The lobby felt slow');
    await user.click(screen.getByRole('button', { name: /Send feedback/i }));

    await waitFor(() =>
      expect(family.submitFamilyFeedback).toHaveBeenCalledWith(expect.anything(), 'g1', {
        category: 'problem',
        message: 'The lobby felt slow',
      }),
    );
    expect(track.trackGrowthEvent).toHaveBeenCalledWith({
      name: 'family_feedback_submitted',
      category: 'problem',
    });
    expect(await screen.findByText(/Thank you/i)).toBeVisible();
  });

  it('defaults to the idea category', async () => {
    const user = userEvent.setup();
    render(<FamilyFeedbackForm groupId="g1" />);

    await user.type(screen.getByLabelText(/Message/i), 'Add rummy please');
    await user.click(screen.getByRole('button', { name: /Send feedback/i }));

    await waitFor(() =>
      expect(family.submitFamilyFeedback).toHaveBeenCalledWith(
        expect.anything(),
        'g1',
        expect.objectContaining({ category: 'idea' }),
      ),
    );
  });

  it('surfaces an error and does not clear the message', async () => {
    family.submitFamilyFeedback.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    render(<FamilyFeedbackForm groupId="g1" />);

    await user.type(screen.getByLabelText(/Message/i), 'stuck on join');
    await user.click(screen.getByRole('button', { name: /Send feedback/i }));

    expect(await screen.findByText(/couldn't send that/i)).toBeVisible();
    expect(screen.getByLabelText(/Message/i)).toHaveValue('stuck on join');
  });
});
