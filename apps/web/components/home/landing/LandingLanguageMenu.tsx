'use client';

import { LOCALES } from '@lazy-patta/localization';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { createTranslator } from '../../../lib/i18n';
import { LOCALE_DISPLAY } from '../../../lib/locale/preference';
import { usePreferredLocale } from '../../../lib/locale/preferred-locale-context';

export function LandingLanguageMenu(): ReactElement {
  const { locale, setLocale } = usePreferredLocale();
  const [open, setOpen] = useState(false);
  const { t } = createTranslator(locale);

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-action-primary/30 bg-surface-primary px-4 text-sm font-semibold text-action-primary shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden>◎</span>
        <span>{LOCALE_DISPLAY[locale].native}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t('settings.language')}
          className="fixed inset-x-4 bottom-4 z-40 rounded-lg border border-action-primary/20 bg-surface-primary p-3 shadow-2xl md:absolute md:bottom-auto md:right-0 md:top-[calc(100%+0.5rem)] md:w-72"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-text-primary">{t('settings.language')}</span>
            <button
              type="button"
              className="min-h-12 rounded-md px-3 text-sm font-semibold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
              onClick={() => setOpen(false)}
            >
              {t('action.close')}
            </button>
          </div>
          <div className="grid gap-2">
            {LOCALES.map((code) => {
              const selected = code === locale;
              const label = LOCALE_DISPLAY[code];
              return (
                <button
                  key={code}
                  type="button"
                  className={[
                    'flex min-h-12 items-center justify-between rounded-md border px-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                    selected
                      ? 'border-action-primary bg-action-primary text-text-onBrand'
                      : 'border-action-primary/20 bg-background-canvas text-text-primary hover:border-action-primary',
                  ].join(' ')}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => {
                    setLocale(code);
                    setOpen(false);
                  }}
                >
                  <span className="flex flex-col">
                    <span className="font-bold">{label.native}</span>
                    {label.english !== label.native ? (
                      <span className="text-xs opacity-80">{label.english}</span>
                    ) : null}
                  </span>
                  {selected ? <span aria-hidden>✓</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
