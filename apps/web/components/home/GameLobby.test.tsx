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
    expect(screen.getAllByRole('link', { name: /Start family room/i })[0]).toHaveAttribute(
      'href',
      '/play/online?game=gadha_chor',
    );
    expect(screen.getAllByRole('link', { name: /Start family room/i })[1]).toHaveAttribute(
      'href',
      '/play/online?game=lal_satti',
    );
    expect(screen.getAllByRole('link', { name: /Practice with bots/i })[0]).toHaveAttribute(
      'href',
      '/play/gadha-chor/computer',
    );
    expect(screen.getAllByRole('link', { name: /Practice with bots/i })[1]).toHaveAttribute(
      'href',
      '/play/lal-satti/computer',
    );
    expect(screen.getByRole('link', { name: /Mobile app/i })).toHaveAttribute('href', '/mobile');
    expect(screen.getByText(/Also known as Gulaam Chor/i)).toBeVisible();
    expect(screen.getByText(/Also known as Badam Saat/i)).toBeVisible();
  });

  it('keeps one trust group in the hero and moves playable games directly after it', () => {
    renderLobby();

    expect(screen.getAllByLabelText(/Why families can play safely/i)).toHaveLength(1);
    expect(screen.getByText('No cash or betting')).toBeVisible();
    expect(screen.getByText('Guest play')).toBeVisible();
    expect(screen.getByText('Private family rooms')).toBeVisible();
    expect(screen.getByText('English, Gujarati and Hindi')).toBeVisible();

    const hero = screen.getByRole('region', {
      name: /Desi card games\. Family game night, anywhere\./i,
    });
    const games = screen.getByRole('region', {
      name: /Two family-table classics, each with its own mood\./i,
    });

    expect(hero.nextElementSibling).toBe(games);
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

  it('renders Hindi content, localized hero image, and unavailable mode state', async () => {
    renderLobby();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /English/i }));
    await user.click(screen.getByRole('button', { name: /हिन्दी Hindi/i }));

    expect(screen.getByRole('heading', { name: /देसी पत्तों के खेल/i })).toBeVisible();
    expect(screen.getByRole('img', { name: /गुजराती परिवार/i })).toBeInTheDocument();
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

  it('renders the Gujarati family hero image with responsive sizing', () => {
    renderLobby();

    const hero = screen.getByRole('img', {
      name: /multigenerational Gujarati family playing cards/i,
    });
    expect(hero).toBeVisible();
    expect(hero).toHaveAttribute('src', expect.stringContaining('gujarati-family-card-night'));
    expect(hero).toHaveAttribute('sizes', expect.stringContaining('vw'));
  });

  it('renders an enlarged brand logo in the navigation', () => {
    renderLobby();

    const logo = screen.getByRole('img', { name: /Lazy Patta logo/i });
    expect(logo).toHaveClass('h-16');
    expect(logo).toHaveClass('md:h-[5.25rem]');
  });

  it('renders the Gulam court-card artwork instead of placeholder text', () => {
    renderLobby();

    expect(screen.getByRole('img', { name: /Gadha Chor card art/i })).toBeInTheDocument();
    expect(screen.getByText('Gulam')).toBeInTheDocument();
    expect(screen.queryByText(/^J \?$/)).not.toBeInTheDocument();
    expect(screen.queryByText('J ?')).not.toBeInTheDocument();
  });

  it('renders the Lal Satti heart-sequence artwork', () => {
    renderLobby();

    expect(screen.getByRole('img', { name: /Lal Satti card art/i })).toBeInTheDocument();
  });

  it('shows a Jhabbu coming-soon teaser with a rules link and no Play buttons', () => {
    renderLobby();

    const teaser = screen
      .getByRole('heading', { name: /^Jhabbu$/i, level: 2 })
      .closest('section');
    expect(teaser).not.toBeNull();
    const region = within(teaser as HTMLElement);

    // Coming-soon badge, not a live game.
    expect(region.getByText(/Coming soon/i)).toBeVisible();
    // Only action is learning the rules — a link to the crawlable detail page.
    const rulesLink = region.getByRole('link', { name: /Learn how to play/i });
    expect(rulesLink).toHaveAttribute('href', '/games/jhabbu');
    // No disabled-looking Play buttons in the teaser.
    expect(region.queryByRole('link', { name: /Play Jhabbu/i })).not.toBeInTheDocument();
    expect(region.queryByRole('link', { name: /Practice/i })).not.toBeInTheDocument();
    // The Monsoon Veranda artwork is present and labelled.
    expect(region.getByRole('img', { name: /Jhabbu card art/i })).toBeInTheDocument();
  });

  it('mentions the founder only in the founder signature', () => {
    renderLobby();

    const founderMentions = screen.getAllByText(/Ishani/i);
    expect(founderMentions).toHaveLength(1);
    expect(founderMentions[0]).toHaveTextContent(/creator of Lazy Traveler/i);

    const inviteHeading = screen.getByText(/invited you to Gadha Chor/i);
    expect(inviteHeading).toHaveTextContent(/^Ba /);
    expect(inviteHeading).not.toHaveTextContent(/Ishani/i);
  });
});
