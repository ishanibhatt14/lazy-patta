import type { Locale } from '@lazy-patta/localization';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { createTranslator } from '../../../lib/i18n';

export function FounderStorySection({ locale }: { readonly locale: Locale }): ReactElement {
  const { t } = createTranslator(locale);

  const paragraphs = [
    { id: 'p1', text: t('landing.founder.p1') },
    { id: 'p2', text: t('landing.founder.p2') },
    { id: 'p3', text: t('landing.founder.p3') },
    { id: 'p4', text: t('landing.founder.p4') },
    { id: 'p5', text: t('landing.founder.p5') },
  ];

  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-10 md:px-8">
      <div className="flex flex-col gap-4 rounded-lg border border-action-primary/15 bg-surface-primary p-6 shadow-md md:p-8">
        <h2 className="text-4xl font-black leading-tight text-action-primary">
          {t('landing.founder.title')}
        </h2>
        <p className="text-lg font-semibold leading-8 text-brand-accent">
          {t('landing.founder.subtitle')}
        </p>
        <div className="flex flex-col gap-4">
          {paragraphs.map((paragraph) => (
            <p key={paragraph.id} className="text-lg leading-8 text-text-primary">
              {paragraph.text}
            </p>
          ))}
        </div>
        <p className="text-base font-black text-action-primary">{t('landing.founder.credit')}</p>
        <Link
          href="/play/online"
          className="inline-flex min-h-12 w-fit items-center justify-center rounded-md bg-action-primary px-5 font-bold text-text-onBrand shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          {t('landing.founder.cta')}
        </Link>
      </div>
    </section>
  );
}
