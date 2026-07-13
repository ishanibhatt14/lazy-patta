import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LalSattiComputerGame } from './LalSattiComputerGame';

describe('LalSattiComputerGame', () => {
  it('renders the localized setup surface', () => {
    render(<LalSattiComputerGame />);

    expect(screen.getByRole('heading', { name: /Lal Satti on the family table/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /Start Lal Satti/i })).toBeEnabled();
    expect(screen.getByText(/The player holding 7♥ starts the game/i)).toBeVisible();
  });
});
