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
 * Device-scoped mobile preferences. Only preferences with a real, observable
 * effect live here — right now that is a "reduce motion" override, applied as a
 * `data-reduced-motion` attribute on the document element that a global CSS rule
 * (see globals.css) honours by stilling animations and transitions everywhere.
 *
 * Kept deliberately small: we do not persist toggles that nothing reads yet, so
 * the Settings screen never shows a switch that does nothing.
 */

const STORAGE_KEY = 'lazy-patta:mobile-reduced-motion';

interface MobilePreferencesValue {
  readonly reducedMotion: boolean;
  readonly setReducedMotion: (value: boolean) => void;
}

const MobilePreferencesContext = createContext<MobilePreferencesValue | undefined>(undefined);

function readStored(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function MobilePreferencesProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const [reducedMotion, setReducedMotionState] = useState<boolean>(readStored);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.reducedMotion = reducedMotion ? 'true' : 'false';
    try {
      window.localStorage.setItem(STORAGE_KEY, reducedMotion ? 'true' : 'false');
    } catch {
      // Storage disabled: the in-memory attribute still applies for this session.
    }
    return () => {
      delete document.documentElement.dataset.reducedMotion;
    };
  }, [reducedMotion]);

  const setReducedMotion = useCallback((value: boolean) => setReducedMotionState(value), []);
  const value = useMemo(
    () => ({ reducedMotion, setReducedMotion }),
    [reducedMotion, setReducedMotion],
  );

  return (
    <MobilePreferencesContext.Provider value={value}>{children}</MobilePreferencesContext.Provider>
  );
}

export function useMobilePreferences(): MobilePreferencesValue {
  const value = useContext(MobilePreferencesContext);
  if (!value) {
    throw new Error('useMobilePreferences must be used within MobilePreferencesProvider');
  }
  return value;
}
