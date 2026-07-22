'use client';

import { LOCALES, type MessageKey } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import { LOCALE_DISPLAY } from '../../lib/locale/preference';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import { useMobilePreferences } from '../../lib/mobile/preferences';
import { type ThemeChoice, useTheme } from '../../lib/mobile/theme';

/**
 * Settings surface. Every control here has a real, persisted effect — language
 * (immediate, via the shared locale context) and a "reduce motion" override
 * (device-stored, applied app-wide). We deliberately do not render switches for
 * preferences nothing consumes yet, so nothing on this screen is a placeholder.
 */
const THEME_CHOICES: readonly { readonly value: ThemeChoice; readonly labelKey: MessageKey }[] = [
  { value: 'system', labelKey: 'mobile.settings.theme.system' },
  { value: 'light', labelKey: 'mobile.settings.theme.light' },
  { value: 'dark', labelKey: 'mobile.settings.theme.dark' },
];

export function MobileSettings(): ReactElement {
  const { locale, setLocale } = usePreferredLocale();
  const { reducedMotion, setReducedMotion } = useMobilePreferences();
  const { choice: themeChoice, setChoice: setThemeChoice } = useTheme();
  const t = createTranslator(locale);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-black text-action-primary">{t.t('mobile.settings.title')}</h1>

      <section aria-labelledby="settings-language" className="flex flex-col gap-3">
        <h2
          id="settings-language"
          className="text-sm font-black uppercase tracking-wide text-brand-accent"
        >
          {t.t('mobile.settings.languageSection')}
        </h2>
        <div className="grid gap-2">
          {LOCALES.map((code) => {
            const selected = code === locale;
            const label = LOCALE_DISPLAY[code];
            return (
              <button
                key={code}
                type="button"
                aria-pressed={selected}
                onClick={() => setLocale(code)}
                className={[
                  'flex min-h-14 items-center justify-between rounded-xl border px-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                  selected
                    ? 'border-action-primary bg-action-primary text-text-onBrand'
                    : 'border-action-primary/20 bg-surface-primary text-text-primary',
                ].join(' ')}
              >
                <span className="flex flex-col">
                  <span className="font-black" lang={code}>
                    {label.native}
                  </span>
                  {label.english !== label.native ? (
                    <span className="text-xs opacity-80" lang="en">
                      {label.english}
                    </span>
                  ) : null}
                </span>
                {selected ? <span aria-hidden>✓</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="settings-appearance" className="flex flex-col gap-3">
        <h2
          id="settings-appearance"
          className="text-sm font-black uppercase tracking-wide text-brand-accent"
        >
          {t.t('mobile.settings.appearanceSection')}
        </h2>
        <div
          role="radiogroup"
          aria-labelledby="settings-appearance"
          className="grid grid-cols-3 gap-2"
        >
          {THEME_CHOICES.map(({ value, labelKey }) => {
            const selected = value === themeChoice;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setThemeChoice(value)}
                className={[
                  'flex min-h-14 items-center justify-center rounded-xl border px-2 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                  selected
                    ? 'border-action-primary bg-action-primary text-text-onBrand'
                    : 'border-action-primary/20 bg-surface-primary text-text-primary',
                ].join(' ')}
              >
                {t.t(labelKey)}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-text-primary/80">{t.t('mobile.settings.appearanceHint')}</p>
      </section>

      <section aria-labelledby="settings-motion" className="flex flex-col gap-3">
        <h2
          id="settings-motion"
          className="text-sm font-black uppercase tracking-wide text-brand-accent"
        >
          {t.t('mobile.settings.motionSection')}
        </h2>
        <button
          type="button"
          role="switch"
          aria-checked={reducedMotion}
          onClick={() => setReducedMotion(!reducedMotion)}
          className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-action-primary/20 bg-surface-primary px-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          <span className="flex flex-col">
            <span className="font-black text-action-primary">
              {t.t('mobile.settings.pref.reducedMotion')}
            </span>
            <span className="text-xs text-text-primary/80">
              {t.t('mobile.settings.reducedMotionHint')}
            </span>
          </span>
          <span
            aria-hidden
            className={[
              'relative h-7 w-12 shrink-0 rounded-full transition',
              reducedMotion ? 'bg-action-primary' : 'bg-action-primary/25',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-1 h-5 w-5 rounded-full bg-surface-primary transition-all',
                reducedMotion ? 'left-6' : 'left-1',
              ].join(' ')}
            />
          </span>
        </button>
      </section>

      <p className="text-xs leading-5 text-text-primary/70">{t.t('mobile.settings.appliedNote')}</p>
    </div>
  );
}
