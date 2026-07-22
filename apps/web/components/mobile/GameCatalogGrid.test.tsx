import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createTranslator } from '../../lib/i18n';
import { MOBILE_CATALOG } from '../../lib/mobile-catalog';

import { GameCatalogGrid } from './GameCatalogGrid';

const t = createTranslator('en');

function renderGrid(): void {
  window.localStorage.clear();
  render(<GameCatalogGrid items={MOBILE_CATALOG} t={t} />);
}

describe('GameCatalogGrid', () => {
  it('opens a setup sheet with real practice and room links for a playable game', async () => {
    renderGrid();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Gadha Chor/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('link', { name: /Play computer/i })).toHaveAttribute(
      'href',
      '/mobile/game/gadha-chor/setup?mode=computer',
    );
    expect(within(dialog).getByRole('link', { name: /Create room/i })).toHaveAttribute(
      'href',
      '/mobile/rooms?game=gadha_chor',
    );
    expect(within(dialog).getByRole('link', { name: /How to play/i })).toHaveAttribute(
      'href',
      '/games/gadha-chor',
    );
  });

  it('opens an info sheet with no broken links for a coming-soon game', async () => {
    renderGrid();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Mendicot/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/coming soon/i)).toBeVisible();
    expect(within(dialog).queryByRole('link')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Got it/i })).toBeVisible();
  });

  it('remembers the launched game so Home can offer it again', async () => {
    renderGrid();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Kachuful/i }));
    await user.click(screen.getByRole('link', { name: /Play computer/i }));

    expect(window.localStorage.getItem('lazy-patta:mobile-recent-game')).toBe('kachuful');
  });
});
