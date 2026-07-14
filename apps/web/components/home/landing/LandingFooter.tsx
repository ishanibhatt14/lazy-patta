import type { Locale } from '@lazy-patta/localization';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { createTranslator } from '../../../lib/i18n';

export function LandingFooter({ locale }: { readonly locale: Locale }): ReactElement {
  const { t } = createTranslator(locale);
  const policyItems = [
    t('landing.footer.privacy'),
    t('landing.footer.terms'),
    t('landing.footer.support'),
  ];

  return (
    <footer className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-8">
      <div>
        <p className="text-xl font-black text-action-primary">{t('app.name')}</p>
        <p className="mt-1 max-w-xl text-sm leading-6 text-text-primary">
          {t('landing.footer.descriptor')}
        </p>
      </div>
      <nav className="flex flex-wrap items-center gap-2" aria-label={t('landing.footer.label')}>
        <Link
          href="/play/online"
          className="inline-flex min-h-12 items-center rounded-md bg-action-primary px-4 text-sm font-bold text-text-onBrand shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          {t('action.joinRoom')}
        </Link>
        <Link
          href="#games"
          className="inline-flex min-h-12 items-center rounded-md px-3 text-sm font-semibold text-text-primary hover:text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          {t('landing.footer.games')}
        </Link>
        <Link
          href="/mobile"
          className="inline-flex min-h-12 items-center rounded-md px-3 text-sm font-semibold text-text-primary hover:text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          {t('landing.footer.mobileApp')}
        </Link>
        {policyItems.map((label) => (
          <span
            key={label}
            className="inline-flex min-h-12 items-center rounded-md px-3 text-sm font-semibold text-text-primary"
          >
            {label}
          </span>
        ))}
      </nav>
    </footer>
  );
}
