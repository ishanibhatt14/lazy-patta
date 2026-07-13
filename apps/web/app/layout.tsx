import { resolveColors } from '@lazy-patta/design-tokens';
import { toCssVariables } from '@lazy-patta/design-tokens/css';
import { DEFAULT_LOCALE, getMessages } from '@lazy-patta/localization';
import type { Metadata, Viewport } from 'next';
import type { ReactElement, ReactNode } from 'react';

import './globals.css';

const messages = getMessages(DEFAULT_LOCALE);
const colors = resolveColors();

export const metadata: Metadata = {
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

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang={DEFAULT_LOCALE}>
      <head>
        {/* Single source of truth for theme colors: the design-tokens CSS block. */}
        <style dangerouslySetInnerHTML={{ __html: toCssVariables() }} />
      </head>
      <body className="bg-background-canvas text-text-primary">{children}</body>
    </html>
  );
}
