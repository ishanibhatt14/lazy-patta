import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { metadata } from '../../app/play/page';
import { PreferredLocaleProvider } from '../../lib/locale/preferred-locale-context';

import { PlayLauncher } from './PlayLauncher';

function renderLauncher(): void {
  window.localStorage.clear();
  render(
    <PreferredLocaleProvider initialLocale="en">
      <PlayLauncher />
    </PreferredLocaleProvider>,
  );
}

describe('PlayLauncher', () => {
  it('shows all live games immediately with computer and family-room actions', () => {
    renderLauncher();

    expect(screen.getByRole('heading', { name: /Choose a game/i })).toBeVisible();

    const gadhaChor = screen.getByRole('heading', { name: /Gadha Chor/i }).closest('article');
    const lalSatti = screen.getByRole('heading', { name: /Lal Satti/i }).closest('article');
    const jhabbu = screen.getByRole('heading', { name: /Jhabbu/i }).closest('article');

    expect(gadhaChor).not.toBeNull();
    expect(lalSatti).not.toBeNull();
    expect(jhabbu).not.toBeNull();

    expect(
      within(gadhaChor as HTMLElement).getByRole('link', { name: /Play computer/i }),
    ).toHaveAttribute('href', '/play/gadha-chor/computer');
    expect(
      within(gadhaChor as HTMLElement).getByRole('link', { name: /Start family room/i }),
    ).toHaveAttribute('href', '/play/online?game=gadha_chor');
    expect(
      within(lalSatti as HTMLElement).getByRole('link', { name: /Play computer/i }),
    ).toHaveAttribute('href', '/play/lal-satti/computer');
    expect(
      within(lalSatti as HTMLElement).getByRole('link', { name: /Start family room/i }),
    ).toHaveAttribute('href', '/play/online?game=lal_satti');
    expect(
      within(jhabbu as HTMLElement).getByRole('link', { name: /Play computer/i }),
    ).toHaveAttribute('href', '/play/jhabbu/computer');
    expect(
      within(jhabbu as HTMLElement).getByRole('link', { name: /Start family room/i }),
    ).toHaveAttribute('href', '/play/online?game=jhabbu');
  });

  it('links to the Family Hub from the launcher header', () => {
    renderLauncher();
    expect(screen.getByRole('link', { name: /Your families/i })).toHaveAttribute(
      'href',
      '/play/family',
    );
  });

  it('keeps the app launcher out of search indexing', () => {
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });
});
