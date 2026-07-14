import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { siteConfig } from '../../lib/site-config';

const TITLE = 'Download Lazy Patta — Desi Card Games for iPhone & Android';
const DESCRIPTION =
  'Get Lazy Patta on iPhone and Android, or play Gadha Chor and Lal Satti right now in your browser. No downloads required to play with family.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/download' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/download' },
  twitter: { title: TITLE, description: DESCRIPTION },
};

function readEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Store links render only when the owner has configured a real listing URL. When
 * absent we show an honest "coming soon" state — never a dead App Store badge
 * that links nowhere.
 */
export default function DownloadPage(): ReactElement {
  const iosUrl = readEnv(process.env.NEXT_PUBLIC_IOS_APP_STORE_URL);
  const androidUrl = readEnv(process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL);
  const hasStores = Boolean(iosUrl || androidUrl);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-black text-action-primary">Get {siteConfig.name}</h1>
        <p className="max-w-xl text-base leading-7 text-text-primary">
          {siteConfig.name} is {siteConfig.descriptor.toLowerCase()} — Gadha Chor, Lal Satti, and
          more. iPhone and Android apps are on the way. You can play in your browser today.
        </p>
      </header>

      {hasStores ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          {iosUrl ? (
            <a
              href={iosUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Download ${siteConfig.name} on the App Store`}
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-action-primary px-6 text-sm font-bold text-text-onBrand shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              Download on the App Store
            </a>
          ) : null}
          {androidUrl ? (
            <a
              href={androidUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Get ${siteConfig.name} on Google Play`}
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-action-primary px-6 text-sm font-bold text-text-onBrand shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              Get it on Google Play
            </a>
          ) : null}
        </div>
      ) : (
        <p className="rounded-lg border border-action-primary/15 bg-surface-primary px-5 py-3 text-sm font-semibold text-text-primary">
          iPhone and Android apps are coming soon.
        </p>
      )}

      <Link
        href="/play/online"
        className="inline-flex min-h-12 items-center justify-center rounded-md border border-action-primary px-6 text-sm font-bold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
      >
        Play on web
      </Link>
    </main>
  );
}
