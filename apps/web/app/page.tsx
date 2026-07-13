import { DEFAULT_LOCALE, getMessages } from '@lazy-patta/localization';
import Image from 'next/image';
import type { ReactElement } from 'react';

export default function HomePage(): ReactElement {
  const t = getMessages(DEFAULT_LOCALE);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
      <Image
        src="/images/lazy-patta-logo-transparent.png"
        alt={t['brand.logoAlt']}
        width={320}
        height={320}
        priority
        className="w-full max-w-xs"
      />
      <h1 className="text-4xl font-semibold text-action-primary">{t['app.name']}</h1>
      <p className="text-lg text-text-primary">{t['welcome.tagline']}</p>
      <p className="rounded-md bg-surface-primary px-4 py-2 text-sm text-text-primary shadow-sm">
        {t['welcome.noBetting']}
      </p>
    </main>
  );
}
