import { LOCALES, type Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import { LOCALE_DISPLAY } from '../../lib/locale/preference';

interface LocaleSwitcherProps {
  readonly locale: Locale;
  readonly onLocaleChange: (locale: Locale) => void;
}

export function LocaleSwitcher({ locale, onLocaleChange }: LocaleSwitcherProps): ReactElement {
  const { t } = createTranslator(locale);

  return (
    <div
      className="flex flex-wrap items-center gap-1 rounded-md bg-background-canvas p-1"
      role="group"
      aria-label={t('settings.language')}
    >
      {LOCALES.map((code) => {
        const selected = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => onLocaleChange(code)}
            aria-pressed={selected}
            className={[
              'min-h-12 rounded-md px-3 text-left text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
              selected
                ? 'bg-action-primary text-text-onBrand'
                : 'text-action-primary hover:bg-surface-primary',
            ].join(' ')}
          >
            <span className="block leading-5" lang={code}>
              {LOCALE_DISPLAY[code].native}
            </span>
            {LOCALE_DISPLAY[code].english !== LOCALE_DISPLAY[code].native ? (
              <span className="block text-xs font-semibold opacity-80" lang="en">
                {LOCALE_DISPLAY[code].english}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
