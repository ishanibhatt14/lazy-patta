'use client';

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

/**
 * Appearance preference (Settings › Appearance). The user picks a *choice*
 * — `system`, `light` or `dark` — which resolves to an *applied* theme that is
 * written as `data-theme` on the document element. The design-tokens CSS block
 * (see globals / root layout) declares `[data-theme="dark"]` overrides, so
 * flipping the attribute restyles the whole app with no per-component work.
 *
 * `system` follows the OS `prefers-color-scheme` live. The choice persists per
 * device in localStorage; an inline boot script in the root layout applies the
 * stored choice before first paint so there is no light-to-dark flash.
 */

export type ThemeChoice = 'system' | 'light' | 'dark';
export type AppliedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'lazy-patta:mobile-theme';

interface ThemeValue {
  readonly choice: ThemeChoice;
  readonly applied: AppliedTheme;
  readonly setChoice: (choice: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeValue | undefined>(undefined);

function isChoice(value: unknown): value is ThemeChoice {
  return value === 'system' || value === 'light' || value === 'dark';
}

function readStoredChoice(): ThemeChoice {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isChoice(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** Resolve a choice to the theme that should actually be applied right now. */
export function resolveApplied(choice: ThemeChoice, prefersDark: boolean): AppliedTheme {
  if (choice === 'system') return prefersDark ? 'dark' : 'light';
  return choice;
}

/**
 * Inline boot script (stringified) run before first paint to set `data-theme`
 * from the stored choice, avoiding a flash of the wrong theme. Mirrors the logic
 * above; kept dependency-free so it can run as a raw `<script>`.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var c=localStorage.getItem('${THEME_STORAGE_KEY}');var d=c==='dark'||(c==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`;

export function ThemeProvider({ children }: { readonly children: ReactNode }): ReactElement {
  // Start from SSR-safe defaults so the server and first client render agree
  // (localStorage / matchMedia are client-only). The stored choice is read in an
  // effect after mount; the boot script already applies it before first paint,
  // so there is no visible flash — only the Settings control settles post-mount.
  const [choice, setChoiceState] = useState<ThemeChoice>('system');
  const [prefersDark, setPrefersDark] = useState<boolean>(false);

  useEffect(() => setChoiceState(readStoredChoice()), []);

  // Keep `system` in sync with live OS changes.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent): void => setPrefersDark(event.matches);
    setPrefersDark(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const applied = resolveApplied(choice, prefersDark);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', applied);
  }, [applied]);

  const setChoice = useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage disabled: the applied attribute still holds for this session.
    }
  }, []);

  const value = useMemo(() => ({ choice, applied, setChoice }), [choice, applied, setChoice]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return value;
}
