import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { PreferredLocaleProvider } from '../../lib/locale/preferred-locale-context';
import { MobilePreferencesProvider } from '../../lib/mobile/preferences';

import { MobileSettings } from './MobileSettings';

function renderSettings(): void {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-reduced-motion');
  render(
    <PreferredLocaleProvider initialLocale="en">
      <MobilePreferencesProvider>
        <MobileSettings />
      </MobilePreferencesProvider>
    </PreferredLocaleProvider>,
  );
}

describe('MobileSettings', () => {
  it('switches language immediately and persists the choice', async () => {
    renderSettings();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /ગુજરાતી/i }));

    expect(document.documentElement.lang).toBe('gu');
    expect(screen.getByRole('button', { name: /ગુજરાતી/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(window.localStorage.getItem('lazy-patta:preferred-locale')).toBe('gu');
  });

  it('toggles reduced motion and applies it to the document', async () => {
    renderSettings();
    const user = userEvent.setup();

    const toggle = screen.getByRole('switch', { name: /Reduced motion/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.dataset.reducedMotion).toBe('true');
    expect(window.localStorage.getItem('lazy-patta:mobile-reduced-motion')).toBe('true');
  });
});
