import { DEFAULT_LOCALE, getMessages } from '@lazy-patta/localization';
import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { siteConfig } from '../../lib/site-config';

/**
 * The offline fallback (Release Train 2, PR 16). The service worker precaches
 * this page at install time and serves it when an installed visitor opens the
 * app with no network. It is intentionally static and self-contained — no
 * runtime data, no client JS — so it renders from the cache alone. Copy stays in
 * the honest, warm register: your games are safe and waiting, not lost.
 */

const TITLE = 'Offline';

export const metadata: Metadata = {
  title: TITLE,
  description: `${siteConfig.name} is offline. Reconnect to keep playing.`,
  robots: { index: false, follow: false },
  alternates: { canonical: '/offline' },
};

export default function OfflinePage(): ReactElement {
  // Static, default-locale copy: this page is precached once and must not depend
  // on request-time cookies or data to render.
  const messages = getMessages(DEFAULT_LOCALE);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background-canvas px-6 text-center">
      <h1 className="text-2xl font-semibold text-text-primary">{messages['offline.title']}</h1>
      <p className="max-w-sm text-sm text-text-primary/80">{messages['offline.body']}</p>
      <a
        href="/play"
        className="rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-text-onBrand"
      >
        {messages['offline.retry']}
      </a>
    </main>
  );
}
