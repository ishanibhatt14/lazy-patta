import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getByRole('textbox', { name: /Your table name/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /Start Lal Satti/i })).toBeDisabled();
    expect(screen.getByText(/The player holding 7♥ starts the game/i)).toBeVisible();
  });

  it('enables start after a guest name is entered', () => {
    renderGame();

    fireEvent.change(screen.getByRole('textbox', { name: /Your table name/i }), {
      target: { value: 'Isha' },
    });

    expect(screen.getByRole('button', { name: /Start Lal Satti/i })).toBeEnabled();
  });
});
