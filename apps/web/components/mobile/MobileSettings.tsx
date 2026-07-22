'use client';

import { LOCALES, type MessageKey } from '@lazy-patta/localization';
import type { ComponentType, ReactElement, ReactNode, SVGProps } from 'react';

import { createTranslator } from '../../lib/i18n';
import { LOCALE_DISPLAY } from '../../lib/locale/preference';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import { useMobilePreferences } from '../../lib/mobile/preferences';
import { type ThemeChoice, useTheme } from '../../lib/mobile/theme';

import { PatternBackground } from './artwork/PatternBackground';
import { GlobeIcon, MotionIcon, PaletteIcon, SettingsIcon } from './icons';

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

/** A grouped, elevated settings panel with an icon-badged section header. */
function SettingsPanel({
  id,
  Icon,
  title,
  children,
}: {
  readonly id: string;
  readonly Icon: ComponentType<SVGProps<SVGSVGElement>>;
  readonly title: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <section
      aria-labelledby={id}
      className="overflow-hidden rounded-2xl border border-action-secondary/25 bg-surface-primary shadow-sm"
    >
      <div className="flex items-center gap-3 border-b border-action-secondary/15 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-action-primary/10 text-action-primary">
          <Icon aria-hidden width={20} height={20} />
        </span>
        <h2 id={id} className="text-sm font-black uppercase tracking-wide text-action-primary">
          {title}
        </h2>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

export function MobileSettings(): ReactElement {
  const { locale, setLocale } = usePreferredLocale();
  const { reducedMotion, setReducedMotion } = useMobilePreferences();
  const { choice: themeChoice, setChoice: setThemeChoice } = useTheme();
  const t = createTranslator(locale);

  return (
    <div className="flex flex-col gap-5">
      {/* Immersive header band, consistent with Home. */}
      <section className="relative -mx-4 -mt-[calc(env(safe-area-inset-top)+1rem)] overflow-hidden rounded-b-[2rem] border-b border-action-secondary/25 bg-gradient-to-b from-surface-primary to-background-canvas px-4 pb-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] shadow-lg">
        <PatternBackground className="text-action-secondary" opacity={0.06} />
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-action-primary/10 text-action-primary">
            <SettingsIcon aria-hidden width={24} height={24} />
          </span>
          <h1 className="text-2xl font-black text-action-primary">
            {t.t('mobile.settings.title')}
          </h1>
        </div>
      </section>

      <SettingsPanel
        id="settings-language"
        Icon={GlobeIcon}
        title={t.t('mobile.settings.languageSection')}
      >
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
                  'flex min-h-[52px] items-center justify-between rounded-xl border px-4 text-left transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                  selected
                    ? 'border-transparent bg-action-primary text-text-onBrand shadow-md'
                    : 'border-action-secondary/20 bg-background-canvas/40 text-text-primary',
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
                {selected ? (
                  <span aria-hidden className="text-lg">
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </SettingsPanel>

      <SettingsPanel
        id="settings-appearance"
        Icon={PaletteIcon}
        title={t.t('mobile.settings.appearanceSection')}
      >
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
                  'flex min-h-[52px] items-center justify-center rounded-xl border px-2 text-sm font-black transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                  selected
                    ? 'border-transparent bg-action-primary text-text-onBrand shadow-md'
                    : 'border-action-secondary/20 bg-background-canvas/40 text-text-primary',
                ].join(' ')}
              >
                {t.t(labelKey)}
              </button>
            );
          })}
        </div>
        <p className="mt-3 px-1 text-xs text-text-primary/75">
          {t.t('mobile.settings.appearanceHint')}
        </p>
      </SettingsPanel>

      <SettingsPanel
        id="settings-motion"
        Icon={MotionIcon}
        title={t.t('mobile.settings.motionSection')}
      >
        <button
          type="button"
          role="switch"
          aria-checked={reducedMotion}
          onClick={() => setReducedMotion(!reducedMotion)}
          className="flex min-h-[52px] w-full items-center justify-between gap-4 rounded-xl border border-action-secondary/20 bg-background-canvas/40 px-4 text-left transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          <span className="flex flex-col">
            <span className="font-black text-action-primary">
              {t.t('mobile.settings.pref.reducedMotion')}
            </span>
            <span className="text-xs text-text-primary/75">
              {t.t('mobile.settings.reducedMotionHint')}
            </span>
          </span>
          <span
            aria-hidden
            className={[
              'relative h-7 w-12 shrink-0 rounded-full transition',
              reducedMotion ? 'bg-action-primary' : 'bg-action-secondary/30',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-1 h-5 w-5 rounded-full bg-surface-primary shadow transition-all',
                reducedMotion ? 'left-6' : 'left-1',
              ].join(' ')}
            />
          </span>
        </button>
      </SettingsPanel>

      <p className="px-1 text-xs leading-5 text-text-primary/65">
        {t.t('mobile.settings.appliedNote')}
      </p>
    </div>
  );
}
