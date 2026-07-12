import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LalSattiComputerGame } from './LalSattiComputerGame';

describe('LalSattiComputerGame', () => {
  it('renders the localized setup surface', () => {
    render(<LalSattiComputerGame />);

    expect(screen.getByRole('heading', { name: /Lal Satti on the family table/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /Start Lal Satti/i })).toBeEnabled();
    expect(screen.getByText(/All four sevens open the table/i)).toBeVisible();
  });
});
