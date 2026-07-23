import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RoomEndActions } from './RoomEndActions';

const shareGameResult = vi.fn();

vi.mock('../../lib/growth/share-result', () => ({
  shareGameResult: (...args: unknown[]) => shareGameResult(...args),
}));

function renderActions(overrides: Partial<Parameters<typeof RoomEndActions>[0]> = {}) {
  return render(
    <RoomEndActions
      locale="en"
      gameSlug="gadha-chor"
      gameName="Gadha Chor"
      winnerDisplayName="Ba"
      playerCount={3}
      {...overrides}
    />,
  );
}

describe('RoomEndActions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hides Play again unless a rematch handler is supplied', () => {
    renderActions();
    expect(screen.queryByRole('button', { name: /Play again/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Share result/i })).toBeInTheDocument();
  });

  it('offers Play again and invokes the rematch handler', () => {
    const onRematch = vi.fn();
    renderActions({ onRematch });
    fireEvent.click(screen.getByRole('button', { name: /Play again/i }));
    expect(onRematch).toHaveBeenCalledOnce();
  });

  it('shares the result with the resolved winner and player count', async () => {
    shareGameResult.mockResolvedValue('shared');
    renderActions();
    fireEvent.click(screen.getByRole('button', { name: /Share result/i }));

    await waitFor(() => expect(shareGameResult).toHaveBeenCalledOnce());
    const [shareable] = shareGameResult.mock.calls[0]!;
    expect(shareable).toMatchObject({
      gameSlug: 'gadha-chor',
      winnerDisplayName: 'Ba',
      playerCount: 3,
    });
  });

  it('announces a copy fallback when the share was copied to the clipboard', async () => {
    shareGameResult.mockResolvedValue('copied');
    renderActions();
    fireEvent.click(screen.getByRole('button', { name: /Share result/i }));
    expect(await screen.findByText(/Copied to clipboard/i)).toBeInTheDocument();
  });
});
