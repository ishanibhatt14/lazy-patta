import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import { createTranslator } from '../../../lib/i18n';

export function TrustStrip({ locale }: { readonly locale: Locale }): ReactElement {
  const { t } = createTranslator(locale);
  const items = [
    t('landing.trust.noBetting'),
    t('landing.trust.guest'),
    t('landing.trust.rooms'),
    t('landing.trust.languages'),
  ];

  return (
    <section
      className="mx-auto grid w-full max-w-7xl gap-3 px-5 py-4 md:grid-cols-4 md:px-8"
      aria-label={t('landing.trust.label')}
    >
      {items.map((item) => (
        <div
          key={item}
          className="flex min-h-12 items-center justify-center rounded-md border border-action-primary/15 bg-surface-primary/80 px-4 text-center text-sm font-bold text-action-primary shadow-sm"
        >
          {item}
        </div>
      ))}
    </section>
  );
}
