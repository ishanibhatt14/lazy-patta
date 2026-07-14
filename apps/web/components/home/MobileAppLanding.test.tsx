import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { PreferredLocaleProvider } from '../../lib/locale/preferred-locale-context';

import { MobileAppLanding } from './MobileAppLanding';

function renderMobilePage(): void {
  window.localStorage.clear();
  render(
    <PreferredLocaleProvider initialLocale="en">
      <MobileAppLanding />
    </PreferredLocaleProvider>,
  );
}

describe('MobileAppLanding', () => {
  it('renders mobile SEO copy and app-like install links without store claims', () => {
    renderMobilePage();

    expect(
      screen.getByRole('heading', {
        name: /Play Indian family card games from your phone/i,
      }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: /Play on mobile now/i })).toHaveAttribute(
      'href',
      '/#games',
    );
    expect(screen.getByRole('link', { name: /Join a private room/i })).toHaveAttribute(
      'href',
      '/play/online',
    );
    expect(screen.getByRole('link', { name: /Play Gadha Chor on mobile/i })).toHaveAttribute(
      'href',
      '/play/gadha-chor/computer',
    );
    expect(screen.getByRole('link', { name: /Play Lal Satti on mobile/i })).toHaveAttribute(
      'href',
      '/play/lal-satti/computer',
    );
    expect(
      screen.getByText(/Native iOS and Android app store releases are planned/i),
    ).toBeVisible();
    expect(screen.queryByRole('link', { name: /App Store|Google Play/i })).not.toBeInTheDocument();
  });

  it('keeps mobile app content localized after choosing Gujarati', async () => {
    renderMobilePage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /English/i }));
    await user.click(screen.getByRole('button', { name: /ગુજરાતી Gujarati/i }));

    expect(screen.getByRole('heading', { name: /તમારા ફોન પરથી/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /મોબાઇલ પર હમણાં રમો/i })).toHaveAttribute(
      'href',
      '/#games',
    );
    expect(document.documentElement.lang).toBe('gu');
  });
});
