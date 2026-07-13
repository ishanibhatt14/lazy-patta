import { DEFAULT_LOCALE, getMessages } from '@lazy-patta/localization';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';

export default function HomePage(): ReactElement {
  const t = getMessages(DEFAULT_LOCALE);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      {/* The logo is the wordmark, so the visible "Lazy Patta" heading is folded
          into it; an sr-only h1 preserves the document outline for a11y/SEO. */}
      <Image
        src="/brand/lazy-patta-logo-transparent.png"
        alt={t['app.name']}
        width={320}
        height={320}
        priority
        className="h-auto w-56 sm:w-72"
      />
      <h1 className="sr-only">{t['app.name']}</h1>
      <p className="text-lg text-text-primary">{t['welcome.tagline']}</p>
      <p className="rounded-md bg-surface-primary px-4 py-2 text-sm text-text-primary shadow-sm">
        {t['welcome.noBetting']}
      </p>
      <nav className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/play/computer"
          className="inline-flex items-center justify-center rounded-md bg-action-primary px-5 py-2.5 font-semibold text-text-onBrand transition hover:brightness-110"
        >
          {t['action.playComputer']}
        </Link>
        <Link
          href="/play/online"
          className="inline-flex items-center justify-center rounded-md border border-action-primary px-5 py-2.5 font-semibold text-action-primary transition hover:bg-action-primary hover:text-text-onBrand"
        >
          {t['action.playOnline']}
        </Link>
      </nav>
    </main>
  );
}
