'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { RoomsIcon } from '../../../components/mobile/icons';
import { createTranslator } from '../../../lib/i18n';
import { usePreferredLocale } from '../../../lib/locale/preferred-locale-context';

/**
 * Family rooms are not reliably live yet, so this screen is intentionally
 * static: an honest "coming soon" panel that never mounts auth or a room call —
 * which means it can never hang on an indefinite loader. A working "Play
 * computer" fallback is always one tap away.
 */
export default function MobileRoomsPage(): ReactElement {
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-black text-action-primary">{t.t('mobile.rooms.title')}</h1>
        <p className="mt-1 text-sm leading-6 text-text-primary/80">
          {t.t('mobile.rooms.subtitle')}
        </p>
      </header>

      <section className="flex flex-col items-center gap-4 rounded-2xl border border-action-secondary/25 bg-surface-primary px-5 py-8 text-center shadow-sm">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-action-primary/10 text-action-primary">
          <RoomsIcon aria-hidden width={28} height={28} />
        </span>
        <h2 className="text-lg font-black text-action-primary">
          {t.t('mobile.rooms.comingSoonTitle')}
        </h2>
        <p className="max-w-sm text-sm leading-6 text-text-primary/80">
          {t.t('mobile.rooms.comingSoonBody')}
        </p>
        <div className="mt-2 grid w-full max-w-xs gap-2">
          <Link
            href="/mobile/games"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-action-primary px-5 py-2.5 text-base font-black text-text-onBrand shadow-md transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t.t('action.playComputer')}
          </Link>
          <Link
            href="/mobile"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-action-secondary/25 px-5 py-2.5 text-base font-semibold text-action-primary transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t.t('action.returnHome')}
          </Link>
        </div>
      </section>
    </div>
  );
}
