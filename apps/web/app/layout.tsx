import { toCssVariables } from '@lazy-patta/design-tokens/css';
import { DEFAULT_LOCALE, getMessages } from '@lazy-patta/localization';
import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';

import './globals.css';

const messages = getMessages(DEFAULT_LOCALE);

export const metadata: Metadata = {
  title: messages['app.name'],
  description: messages['welcome.tagline'],
  icons: {
    icon: '/images/lazy-patta-ios-icon-opaque-maroon-1024.png',
    apple: '/images/lazy-patta-ios-icon-opaque-maroon-1024.png',
  },
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
