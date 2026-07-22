import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createTranslator } from '../../lib/i18n';
import type { PlayerRematchState } from '../../lib/rematch/rematch-state';

import { RematchVote } from './RematchVote';

const t = createTranslator('en');

const players: readonly PlayerRematchState[] = [
  { playerId: 'me', displayName: 'Me', vote: 'ready' },
  { playerId: 'p2', displayName: 'Asha', vote: 'pending' },
];

describe('RematchVote', () => {
  it('shows a live ready-of-total count and each player status', () => {
    render(
      <RematchVote players={players} viewerId="me" minPlayers={2} t={t} onVote={() => {}} />,
    );

    expect(screen.getByText(/1 of 2 players are ready/i)).toBeVisible();
    expect(screen.getByText(/^You$/)).toBeVisible();
    expect(screen.getByText('Asha')).toBeVisible();
    expect(screen.getByText('Deciding')).toBeVisible();
  });

  it('reports the viewer vote and shows the countdown when everyone is ready', async () => {
    const onVote = vi.fn();
    const { rerender } = render(
      <RematchVote
        players={[players[0]!, { ...players[1]!, vote: 'pending' }]}
        viewerId="p2"
        minPlayers={2}
        t={t}
        onVote={onVote}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /I'm in/i }));
    expect(onVote).toHaveBeenCalledWith('ready');

    rerender(
      <RematchVote
        players={[players[0]!, { ...players[1]!, vote: 'ready' }]}
        viewerId="p2"
        minPlayers={2}
        countdownSeconds={5}
        t={t}
        onVote={onVote}
      />,
    );
    expect(screen.getByText(/Next round in 5/i)).toBeVisible();
  });
});
