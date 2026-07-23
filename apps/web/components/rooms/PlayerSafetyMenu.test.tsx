import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlayerSafetyMenu } from './PlayerSafetyMenu';

const reportPlayer = vi.fn();
const blockPlayer = vi.fn();
const unblockPlayer = vi.fn();

vi.mock('../../lib/supabase/browser-client', () => ({
  getSupabaseBrowserClient: () => ({}),
}));

vi.mock('../../lib/rooms/moderation-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/rooms/moderation-client')>();
  return {
    ...actual,
    reportPlayer: (...args: unknown[]) => reportPlayer(...args),
    blockPlayer: (...args: unknown[]) => blockPlayer(...args),
    unblockPlayer: (...args: unknown[]) => unblockPlayer(...args),
  };
});

function renderMenu(overrides: Partial<Parameters<typeof PlayerSafetyMenu>[0]> = {}) {
  return render(
    <PlayerSafetyMenu
      reportedUserId="u2"
      name="Ba"
      roomId="r1"
      locale="en"
      isBlocked={false}
      {...overrides}
    />,
  );
}

describe('PlayerSafetyMenu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stays collapsed until opened', () => {
    renderMenu();
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Safety options for Ba/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('reports the player with the chosen reason, scoped to the room', async () => {
    reportPlayer.mockResolvedValue(undefined);
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: /Safety options for Ba/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Report' }));
    fireEvent.click(screen.getByLabelText(/Cheating/i));
    fireEvent.click(screen.getByRole('button', { name: /Send report/i }));

    await waitFor(() =>
      expect(reportPlayer).toHaveBeenCalledWith(expect.anything(), {
        reportedUserId: 'u2',
        reason: 'cheating',
        roomId: 'r1',
      }),
    );
    expect(await screen.findByText(/we'll take a look/i)).toBeInTheDocument();
  });

  it('blocks the player and reports the change upward', async () => {
    blockPlayer.mockResolvedValue(undefined);
    const onBlockChange = vi.fn();
    renderMenu({ onBlockChange });
    fireEvent.click(screen.getByRole('button', { name: /Safety options for Ba/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Block' }));

    await waitFor(() => expect(blockPlayer).toHaveBeenCalledWith(expect.anything(), 'u2'));
    expect(onBlockChange).toHaveBeenCalledOnce();
    expect(await screen.findByText(/Ba is blocked/i)).toBeInTheDocument();
  });

  it('offers Unblock and the blocked marker for an already-blocked player', async () => {
    unblockPlayer.mockResolvedValue(undefined);
    const onBlockChange = vi.fn();
    renderMenu({ isBlocked: true, onBlockChange });
    // The blocked marker is visible without opening the menu.
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Safety options for Ba/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Unblock' }));

    await waitFor(() => expect(unblockPlayer).toHaveBeenCalledWith(expect.anything(), 'u2'));
    expect(onBlockChange).toHaveBeenCalledOnce();
  });
});
