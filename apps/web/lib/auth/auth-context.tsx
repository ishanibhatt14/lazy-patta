'use client';

import { createSupabaseAuthProvider, type AuthProvider, type SessionState } from '@lazy-patta/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { getSupabaseBrowserClient, isSupabaseConfigured } from '../supabase/browser-client';

import { getBrowserAuthRedirectUrl } from './redirect-url';

/**
 * React binding over the provider-agnostic {@link AuthProvider}.
 *
 * The Supabase client is created inside an effect (client-only) so a server
 * render or a secret-less build never touches browser env vars. Until the effect
 * runs — or when Supabase is unconfigured — the state stays `loading` /
 * `signed-out` and screens degrade gracefully rather than crashing.
 */

export interface AuthContextValue {
  readonly state: SessionState;
  /** False when the public Supabase env is absent; online features hide. */
  readonly configured: boolean;
  requestPasscode(contact: string): Promise<void>;
  verifyPasscode(contact: string, passcode: string): Promise<void>;
  signInAsGuest(displayName: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const UNCONFIGURED_MESSAGE = 'Online play is not configured in this environment.';

export function AuthContextProvider({ children }: { children: ReactNode }): ReactElement {
  const configured = isSupabaseConfigured();
  const [state, setState] = useState<SessionState>(
    configured ? { status: 'loading' } : { status: 'signed-out' },
  );
  const providerRef = useRef<AuthProvider | undefined>(undefined);

  useEffect(() => {
    if (!configured) return;
    const provider = createSupabaseAuthProvider(getSupabaseBrowserClient(), {
      getEmailRedirectTo: getBrowserAuthRedirectUrl,
    });
    providerRef.current = provider;
    const unsubscribe = provider.onStateChange(setState);
    return () => {
      unsubscribe();
      providerRef.current = undefined;
    };
  }, [configured]);

  const requireProvider = useCallback((): AuthProvider => {
    const provider = providerRef.current;
    if (!provider) throw new Error(UNCONFIGURED_MESSAGE);
    return provider;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      configured,
      requestPasscode: (contact) => requireProvider().requestPasscode(contact),
      verifyPasscode: (contact, passcode) => requireProvider().verifyPasscode(contact, passcode),
      signInAsGuest: (displayName) => requireProvider().signInAsGuest(displayName),
      signOut: () => requireProvider().signOut(),
    }),
    [state, configured, requireProvider],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access the auth context. Throws if used outside {@link AuthContextProvider}. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within an AuthContextProvider');
  return value;
}
