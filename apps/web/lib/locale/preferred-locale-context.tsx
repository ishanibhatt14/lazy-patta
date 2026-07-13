'use client';

import { type Locale } from '@lazy-patta/localization';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import {
  isLocale,
  PREFERRED_LOCALE_COOKIE,
  PREFERRED_LOCALE_STORAGE_KEY,
  resolveLocale,
} from './preference';

interface PreferredLocaleValue {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
}

const PreferredLocaleContext = createContext<PreferredLocaleValue | undefined>(undefined);

function readStoredLocale(): Locale | undefined {
  if (typeof window === 'undefined') return undefined;
  const stored = window.localStorage.getItem(PREFERRED_LOCALE_STORAGE_KEY);
  return isLocale(stored) ? stored : undefined;
}

function persistLocale(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  document.cookie = `${PREFERRED_LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  window.localStorage.setItem(PREFERRED_LOCALE_STORAGE_KEY, locale);
}

export function PreferredLocaleProvider({
  initialLocale,
  children,
}: {
  readonly initialLocale: Locale;
  readonly children: ReactNode;
}): ReactElement {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale() ?? initialLocale);

  useEffect(() => {
    persistLocale(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(resolveLocale(next));
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return (
    <PreferredLocaleContext.Provider value={value}>{children}</PreferredLocaleContext.Provider>
  );
}

export function usePreferredLocale(): PreferredLocaleValue {
  const value = useContext(PreferredLocaleContext);
  if (!value) throw new Error('usePreferredLocale must be used within PreferredLocaleProvider');
  return value;
}
