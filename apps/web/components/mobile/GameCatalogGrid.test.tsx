import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createTranslator } from '../../lib/i18n';
import { readRecentPlay } from '../../lib/mobile/recent';
import { MOBILE_CATALOG } from '../../lib/mobile-catalog';

import { GameCatalogGrid } from './GameCatalogGrid';

const t = createTranslator('en');

function renderGrid(): void {
  window.localStorage.clear();
  render(<GameCatalogGrid items={MOBILE_CATALOG} t={t} />);
}

describe('GameCatalogGrid', () => {
  it('opens a setup sheet with real practice links and a live room link', async () => {
    renderGrid();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Gadha Chor/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('link', { name: /Quick Play/i })).toHaveAttribute(
      'href',
      '/mobile/game/gadha-chor/setup?mode=computer&quick=1',
    );
    expect(within(dialog).getByRole('link', { name: /Change settings/i })).toHaveAttribute(
      'href',
      '/mobile/game/gadha-chor/setup?mode=computer',
    );
    // Family rooms are verified live, so the sheet links to the create/join hub.
    expect(within(dialog).getByRole('link', { name: /Create room/i })).toHaveAttribute(
      'href',
      '/mobile/rooms?game=gadha_chor',
    );
    expect(within(dialog).getByRole('link', { name: /How to play/i })).toHaveAttribute(
      'href',
      '/games/gadha-chor',
    );
  });

  it('shows a real detail step: difficulty, a how-it-plays explainer, and a best-for line', async () => {
    renderGrid();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Gadha Chor/i }));

    const dialog = screen.getByRole('dialog');
    // Difficulty joins players/time in the meta line.
    expect(within(dialog).getByText(/Easy/)).toBeVisible();
    // The explainer reuses the canonical public-site rules copy (howBody), so the
    // sheet and the SEO page never drift into two inconsistent descriptions.
    expect(within(dialog).getByRole('heading', { name: /How it plays/i })).toBeVisible();
    expect(within(dialog).getByText(/clear matching pairs/i)).toBeVisible();
    // "Best for" frames the emotional fit (never coins/winning).
    expect(within(dialog).getByText(/all ages at the table/i)).toBeVisible();
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
    await user.click(screen.getByRole('link', { name: /Quick Play/i }));

    const recent = readRecentPlay();
    expect(recent?.item.id).toBe('kachuful');
    expect(recent?.playedAt).toEqual(expect.any(Number));
  });
});
