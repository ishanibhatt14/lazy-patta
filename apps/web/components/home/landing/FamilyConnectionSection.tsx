import type { Locale } from '@lazy-patta/localization';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { createTranslator } from '../../../lib/i18n';

export function FamilyConnectionSection({ locale }: { readonly locale: Locale }): ReactElement {
  const { t } = createTranslator(locale);

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-10 md:grid-cols-[0.9fr_1.1fr] md:items-center md:px-8">
      <div className="flex flex-col gap-4">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-accent">
          {t('landing.family.eyebrow')}
        </p>
        <h2 className="text-4xl font-black leading-tight text-action-primary">
          {t('landing.family.title')}
        </h2>
        <p className="text-lg leading-8 text-text-primary">{t('landing.family.body')}</p>
        <Link
          href="/play/online"
          className="inline-flex min-h-12 w-fit items-center justify-center rounded-md bg-action-primary px-5 font-bold text-text-onBrand shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          {t('landing.family.cta')}
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-action-primary/15 bg-surface-primary p-5 shadow-md">
        <div className="absolute inset-0 bg-action-secondary/10" aria-hidden />
        <div className="relative grid gap-5">
          <div className="flex items-center justify-center gap-3" aria-hidden>
            {['B', 'K', 'M', 'P'].map((initial) => (
              <span
                key={initial}
                className="grid h-14 w-14 place-items-center rounded-full border-2 border-background-canvas bg-action-primary text-lg font-black text-text-onBrand shadow"
              >
                {initial}
              </span>
            ))}
          </div>
          <div className="mx-auto w-full max-w-sm rounded-lg border border-action-primary/20 bg-background-canvas p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-brand-accent">
              {t('landing.family.inviteLabel')}
            </p>
            <p className="mt-2 text-xl font-black text-action-primary">
              {t('landing.family.inviteTitle')}
            </p>
            <p className="mt-2 rounded-md bg-surface-primary px-3 py-2 text-center text-2xl font-black tracking-[0.25em] text-text-primary">
              BA2026
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
