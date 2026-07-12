import { LOCALES, type Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';

const LOCALE_LABEL: Record<Locale, string> = {
  en: 'EN',
  gu: 'ગુ',
  hi: 'हि',
};

interface LocaleSwitcherProps {
  readonly locale: Locale;
  readonly onLocaleChange: (locale: Locale) => void;
}

export function LocaleSwitcher({ locale, onLocaleChange }: LocaleSwitcherProps): ReactElement {
  const { t } = createTranslator(locale);

  return (
    <div
      className="flex items-center gap-1 rounded-md bg-background-canvas p-1"
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
              'min-h-12 min-w-12 rounded-md px-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
              selected
                ? 'bg-action-primary text-text-onBrand'
                : 'text-action-primary hover:bg-surface-primary',
            ].join(' ')}
          >
            {LOCALE_LABEL[code]}
          </button>
        );
      })}
    </div>
  );
}
