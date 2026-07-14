import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { PreferredLocaleProvider } from '../../lib/locale/preferred-locale-context';

import { GameLobby } from './GameLobby';

function renderLobby(): void {
  window.localStorage.clear();
  render(
    <PreferredLocaleProvider initialLocale="en">
      <GameLobby />
    </PreferredLocaleProvider>,
  );
}

describe('GameLobby landing page', () => {
  it('renders primary landing actions and playable game links', () => {
    renderLobby();

    expect(
      screen.getByRole('heading', {
        name: /Desi card games\. Family game night, anywhere\./i,
      }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: /Start with Gadha Chor/i })).toHaveAttribute(
      'href',
      '/play/gadha-chor/computer',
    );
    expect(screen.getAllByRole('link', { name: /Play now/i })[0]).toHaveAttribute(
      'href',
      '/play/gadha-chor/computer',
    );
    expect(screen.getAllByRole('link', { name: /Play now/i })[1]).toHaveAttribute(
      'href',
      '/play/lal-satti/computer',
    );
    expect(screen.getAllByRole('link', { name: /Play with family/i })[0]).toHaveAttribute(
      'href',
      '/play/online?game=gadha_chor',
    );
    expect(screen.getAllByRole('link', { name: /Play with family/i })[1]).toHaveAttribute(
      'href',
      '/play/online?game=lal_satti',
    );
    expect(screen.getByText(/Also known as Gulaam Chor/i)).toBeVisible();
    expect(screen.getByText(/Also known as Badam Saat/i)).toBeVisible();
    expect(screen.getByAltText(/Ishani Bhatt, founder of Lazy Patta/i)).toBeVisible();
  });

  it('opens both tutorial dialogs from rich game cards', async () => {
    renderLobby();
    const user = userEvent.setup();
    const tutorialButtons = screen.getAllByRole('button', { name: /Learn the rules/i });

    await user.click(tutorialButtons[0]!);
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByText(/Match pairs/i)).toBeVisible();
    await user.click(screen.getByRole('button', { name: /Skip/i }));

    await user.click(tutorialButtons[1]!);
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByText(/Start from the sevens/i)).toBeVisible();
  });

  it('shows full language names and persists Gujarati after reload-like remount', async () => {
    renderLobby();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /English/i }));
    expect(screen.getByRole('button', { name: /ગુજરાતી Gujarati/i })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /ગુજરાતી Gujarati/i }));

    expect(window.localStorage.getItem('lazy-patta:preferred-locale')).toBe('gu');
    expect(document.documentElement.lang).toBe('gu');
    expect(screen.getByRole('heading', { name: /દેશી પત્તાની રમતો/i })).toBeVisible();
  });

  it('renders Hindi content, reduced-motion information, and unavailable mode state', async () => {
    renderLobby();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /English/i }));
    await user.click(screen.getByRole('button', { name: /हिन्दी Hindi/i }));

    expect(screen.getByRole('heading', { name: /देसी पत्तों के खेल/i })).toBeVisible();
    expect(screen.getByText(/कम गति वाला परिवार कार्ड टेबल/i)).toBeInTheDocument();
    const passMode = screen.getByRole('heading', { name: /पास एंड प्ले/i }).closest('article');
    expect(passMode).not.toBeNull();
    expect(within(passMode as HTMLElement).getByText(/जल्द आ रहा है|Coming soon/i)).toBeVisible();
  });

  it('supports keyboard focus on the language menu trigger', async () => {
    renderLobby();
    const user = userEvent.setup();

    for (let index = 0; index < 5; index += 1) {
      await user.tab();
    }

    expect(screen.getByRole('button', { name: /English/i })).toHaveFocus();
  });
});
