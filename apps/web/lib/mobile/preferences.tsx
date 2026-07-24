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
 * effect live here, each applied as a `data-*` attribute on the document element
 * that global CSS (see globals.css) honours:
 *  - "reduce motion" (`data-reduced-motion`) stills animations and transitions;
 *  - "suit letters" (`data-suit-letters`) reveals a per-suit initial on every
 *    card so the four suits stay distinguishable without relying on colour — a
 *    colour-blind and low-vision aid.
 *
 * Kept deliberately small: we do not persist toggles that nothing reads yet, so
 * the Settings screen never shows a switch that does nothing.
 */

const REDUCED_MOTION_KEY = 'lazy-patta:mobile-reduced-motion';
const SUIT_LETTERS_KEY = 'lazy-patta:mobile-suit-letters';

interface MobilePreferencesValue {
  readonly reducedMotion: boolean;
  readonly setReducedMotion: (value: boolean) => void;
  readonly suitLetters: boolean;
  readonly setSuitLetters: (value: boolean) => void;
}

const MobilePreferencesContext = createContext<MobilePreferencesValue | undefined>(undefined);

function readStored(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

export function MobilePreferencesProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  // Start `false` so the server and first client render agree (localStorage is
  // client-only); adopt the stored values in an effect after mount to avoid a
  // hydration mismatch on the toggles' state.
  const [reducedMotion, setReducedMotionState] = useState<boolean>(false);
  const [suitLetters, setSuitLettersState] = useState<boolean>(false);

  useEffect(() => {
    setReducedMotionState(readStored(REDUCED_MOTION_KEY));
    setSuitLettersState(readStored(SUIT_LETTERS_KEY));
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.reducedMotion = reducedMotion ? 'true' : 'false';
    try {
      window.localStorage.setItem(REDUCED_MOTION_KEY, reducedMotion ? 'true' : 'false');
    } catch {
      // Storage disabled: the in-memory attribute still applies for this session.
    }
    return () => {
      delete document.documentElement.dataset.reducedMotion;
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.suitLetters = suitLetters ? 'true' : 'false';
    try {
      window.localStorage.setItem(SUIT_LETTERS_KEY, suitLetters ? 'true' : 'false');
    } catch {
      // Storage disabled: the in-memory attribute still applies for this session.
    }
    return () => {
      delete document.documentElement.dataset.suitLetters;
    };
  }, [suitLetters]);

  const setReducedMotion = useCallback((value: boolean) => setReducedMotionState(value), []);
  const setSuitLetters = useCallback((value: boolean) => setSuitLettersState(value), []);
  const value = useMemo(
    () => ({ reducedMotion, setReducedMotion, suitLetters, setSuitLetters }),
    [reducedMotion, setReducedMotion, suitLetters, setSuitLetters],
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
