'use client';

import { useState, type ReactElement } from 'react';

import { HowToPlaySheet } from '../../../components/mobile/HowToPlaySheet';
import { createTranslator } from '../../../lib/i18n';
import { usePreferredLocale } from '../../../lib/locale/preferred-locale-context';
import { MOBILE_CATALOG, type MobileCatalogItem } from '../../../lib/mobile-catalog';

export default function MobileLearnPage(): ReactElement {
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);
  const withRules = MOBILE_CATALOG.filter((item) => item.rulesRoute);
  const [selected, setSelected] = useState<MobileCatalogItem | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-black text-action-primary">{t.t('mobile.learn.title')}</h1>
        <p className="mt-1 text-sm leading-6 text-text-primary/80">
          {t.t('mobile.learn.subtitle')}
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {withRules.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setSelected(item)}
              className="flex w-full flex-col gap-1 rounded-2xl border border-action-primary/12 bg-surface-primary px-5 py-4 text-left shadow-sm transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              <span className="text-lg font-black text-action-primary">{t.t(item.nameKey)}</span>
              <span className="text-sm leading-6 text-text-primary/80">{t.t(item.taglineKey)}</span>
              <span className="mt-1 text-sm font-black text-brand-accent">
                {t.t('action.howToPlay')} →
              </span>
            </button>
          </li>
        ))}
      </ul>

      <HowToPlaySheet item={selected} t={t} onClose={() => setSelected(null)} />
    </div>
  );
}
