import { resolveColors } from '@lazy-patta/design-tokens';
import { toCssVariables } from '@lazy-patta/design-tokens/css';
import { DEFAULT_LOCALE, getMessages } from '@lazy-patta/localization';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import type { ReactElement, ReactNode } from 'react';

import { PREFERRED_LOCALE_COOKIE, resolveLocale } from '../lib/locale/preference';
import { PreferredLocaleProvider } from '../lib/locale/preferred-locale-context';
import { SITE_URL } from '../lib/seo/site';

import './globals.css';

const messages = getMessages(DEFAULT_LOCALE);
const colors = resolveColors();

export const metadata: Metadata = {
  // Resolves every relative canonical/alternate/OG URL against the canonical origin.
  metadataBase: new URL(SITE_URL),
  title: messages['app.name'],
  description: messages['welcome.tagline'],
  // Favicon uses the transparent wordmark; the Apple touch icon must be opaque
  // (iOS applies its own mask), so it points at the maroon-backed variant.
  icons: {
    icon: '/images/lazy-patta-logo-transparent.png',
    apple: '/images/lazy-patta-ios-icon-opaque-maroon-1024.png',
  },
};

export const viewport: Viewport = {
  themeColor: colors['action.primary'],
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactElement> {
  const cookieStore = await cookies();
  const initialLocale = resolveLocale(cookieStore.get(PREFERRED_LOCALE_COOKIE)?.value);

  return (
    <html lang={initialLocale}>
      <head>
        {/* Single source of truth for theme colors: the design-tokens CSS block. */}
        <style dangerouslySetInnerHTML={{ __html: toCssVariables() }} />
      </head>
      <body className="bg-background-canvas text-text-primary">
        <PreferredLocaleProvider initialLocale={initialLocale}>{children}</PreferredLocaleProvider>
      </body>
    </html>
  );
}
