import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { PreferredLocaleProvider } from '../../../lib/locale/preferred-locale-context';

import { KachufulComputerGame } from './KachufulComputerGame';

function renderGame(): void {
  render(
    <PreferredLocaleProvider initialLocale="en">
      <KachufulComputerGame />
    </PreferredLocaleProvider>,
  );
}

describe('KachufulComputerGame', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the localized setup surface', () => {
    renderGame();
    expect(screen.getByRole('heading', { name: /Kachuful \(Judgement\)/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /All games/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: /Start game/i })).toBeEnabled();
    expect(screen.getByText(/How a round works/i)).toBeVisible();
  });

  it('starts a match and shows the round, trump, and a private hand', async () => {
    renderGame();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Start game/i }));

    expect(screen.getByText(/Round 1 of 7/i)).toBeVisible();
    expect(screen.getByText(/Trump: Spades/i)).toBeVisible();
    // The human's seven cards are rendered face-up as accessible images.
    const faces = screen.getAllByRole('img', { name: /of (Clubs|Diamonds|Hearts|Spades)/i });
    expect(faces.length).toBeGreaterThanOrEqual(7);
    // A single live status region drives the turn announcement.
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('exposes the table size and difficulty controls under customize', async () => {
    renderGame();
    const user = userEvent.setup();
    await user.click(screen.getByText(/Customize table/i));

    const sizes = screen.getByLabelText(/Table size/i);
    expect(within(sizes).getByRole('button', { name: /7 players/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hard/i })).toBeInTheDocument();
  });
});
