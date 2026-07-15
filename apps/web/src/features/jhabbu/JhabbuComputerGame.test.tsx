import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PreferredLocaleProvider } from '../../../lib/locale/preferred-locale-context';

import { JhabbuComputerGame } from './JhabbuComputerGame';

function renderGame(): void {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: false,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });

  render(
    <PreferredLocaleProvider initialLocale="en">
      <JhabbuComputerGame />
    </PreferredLocaleProvider>,
  );
}

describe('JhabbuComputerGame', () => {
  it('renders setup copy and starts a playable computer table', async () => {
    renderGame();
    const user = userEvent.setup();

    expect(screen.getByRole('heading', { name: /Sit at the Jhabbu table/i })).toBeVisible();
    expect(screen.getByText(/Ace of spades starts/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Start 4-player game/i }));

    expect(screen.getByLabelText(/Jhabbu computer game/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /History/i })).toBeVisible();
    expect(screen.getByLabelText(/Your cards/i)).toBeVisible();
    expect(screen.getByText(/Jhabbu started/i)).toBeVisible();
  });
});
