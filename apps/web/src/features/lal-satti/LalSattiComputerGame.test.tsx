import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { PreferredLocaleProvider } from '../../../lib/locale/preferred-locale-context';

import { LalSattiComputerGame } from './LalSattiComputerGame';

function renderGame(): void {
  render(
    <PreferredLocaleProvider initialLocale="en">
      <LalSattiComputerGame />
    </PreferredLocaleProvider>,
  );
}

describe('LalSattiComputerGame', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the localized setup surface', () => {
    renderGame();

    expect(screen.getByRole('heading', { name: /Lal Satti on the family table/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /All games/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: /Start quick game/i })).toBeEnabled();
    expect(screen.getByText(/The player holding 7♥ starts the game/i)).toBeVisible();
    expect(screen.queryByRole('heading', { name: /Save scoreboards/i })).not.toBeInTheDocument();
  });

  it('keeps name and player-count edits optional under customize', async () => {
    renderGame();
    const user = userEvent.setup();

    await user.click(screen.getByText(/Customize table/i));
    await user.type(screen.getByRole('textbox', { name: /Your table name/i }), 'Isha');

    expect(screen.getByRole('textbox', { name: /Your table name/i })).toHaveValue('Isha');
    expect(screen.getByRole('button', { name: /Start quick game/i })).toBeEnabled();
  });
});
