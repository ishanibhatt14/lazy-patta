import { resolveColors } from '@lazy-patta/design-tokens';
import { toCssVariables } from '@lazy-patta/design-tokens/css';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import type { ReactElement, ReactNode } from 'react';

import { PREFERRED_LOCALE_COOKIE, resolveLocale } from '../lib/locale/preference';
import { PreferredLocaleProvider } from '../lib/locale/preferred-locale-context';
import { siteConfig } from '../lib/site-config';

import './globals.css';

const colors = resolveColors();

const HOME_TITLE = 'Lazy Patta — Play Desi Indian Card Games Online';

export const metadata: Metadata = {
  // Anchors every relative canonical/OG URL emitted by child pages to the
  // permanent domain, even when the deploy runs from a *.vercel.app preview.
  metadataBase: new URL(siteConfig.canonicalOrigin),
  title: {
    default: HOME_TITLE,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: { canonical: '/' },
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: 'default',
  },
  // Favicon uses the transparent wordmark; the Apple touch icon must be opaque
  // (iOS applies its own mask), so it points at the maroon-backed variant.
  icons: {
    icon: '/images/lazy-patta-logo-transparent.png',
    apple: '/images/lazy-patta-ios-icon-opaque-maroon-1024.png',
  },
  openGraph: {
    type: 'website',
    siteName: siteConfig.name,
    title: HOME_TITLE,
    description: siteConfig.description,
    url: '/',
    images: [{ url: siteConfig.socialImagePath, width: 1024, height: 1024, alt: siteConfig.name }],
  },
  twitter: {
    card: 'summary',
    title: HOME_TITLE,
    description: siteConfig.description,
    site: siteConfig.socialHandle,
    images: [siteConfig.socialImagePath],
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
