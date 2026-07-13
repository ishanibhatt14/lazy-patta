import { DEFAULT_LOCALE, LOCALES, type Locale } from '@lazy-patta/localization';

export const PREFERRED_LOCALE_STORAGE_KEY = 'lazy-patta:preferred-locale';
export const PREFERRED_LOCALE_COOKIE = 'lazy-patta-preferred-locale';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export const LOCALE_DISPLAY: Record<Locale, { readonly native: string; readonly english: string }> =
  {
    en: { native: 'English', english: 'English' },
    gu: { native: 'ગુજરાતી', english: 'Gujarati' },
    hi: { native: 'हिन्दी', english: 'Hindi' },
  };
