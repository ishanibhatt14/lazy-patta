import {
  type Session as SupabaseSession,
  type SupabaseClient,
  type User as SupabaseUser,
} from '@supabase/supabase-js';

import { type AuthUser } from './identity';
import { type AuthProvider, type Unsubscribe } from './provider';
import { type Session, type SessionState } from './session';

/**
 * Concrete {@link AuthProvider} backed by Supabase, using email one-time
 * passcodes (OTP). It maps Supabase's vendor types onto the provider-agnostic
 * identity/session shapes so screens and stores never import Supabase directly.
 *
 * The client is injected rather than constructed here: the web app supplies a
 * browser client, the server supplies a server client, and tests supply a fake.
 * Raw access/refresh tokens stay inside the Supabase client and are never
 * surfaced through this contract (see {@link Session}).
 */

function readString(meta: Record<string, unknown>, key: string): string | undefined {
  const value = meta[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toAuthUser(user: SupabaseUser): AuthUser {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    readString(meta, 'display_name') ??
    readString(meta, 'full_name') ??
    user.email?.split('@')[0] ??
    'Player';
  const avatarUrl = readString(meta, 'avatar_url');
  return {
    kind: 'user',
    userId: user.id,
    displayName,
    ...(avatarUrl ? { avatarUrl } : {}),
  };
}

function toSessionState(session: SupabaseSession | null): SessionState {
  if (!session?.user) {
    return { status: 'signed-out' };
  }
  const mapped: Session = {
    user: toAuthUser(session.user),
    ...(session.expires_at ? { expiresAt: session.expires_at * 1000 } : {}),
  };
  return { status: 'signed-in', session: mapped };
}

export function createSupabaseAuthProvider(client: SupabaseClient): AuthProvider {
  let current: SessionState = { status: 'loading' };
  const listeners = new Set<(state: SessionState) => void>();

  const emit = (state: SessionState): void => {
    current = state;
    for (const listener of listeners) {
      listener(state);
    }
  };

  // Hydrate from any persisted session, then keep in step with Supabase's own
  // auth events (sign-in, token refresh, sign-out) for the rest of the session.
  void client.auth.getSession().then(({ data }) => emit(toSessionState(data.session)));
  client.auth.onAuthStateChange((_event, session) => emit(toSessionState(session)));

  return {
    getState: () => current,

    onStateChange: (listener): Unsubscribe => {
      listeners.add(listener);
      listener(current);
      return () => {
        listeners.delete(listener);
      };
    },

    requestPasscode: async (contact) => {
      const { error } = await client.auth.signInWithOtp({
        email: contact,
        options: { shouldCreateUser: true },
      });
      if (error) {
        throw new Error(error.message);
      }
    },

    verifyPasscode: async (contact, passcode) => {
      const { error } = await client.auth.verifyOtp({
        email: contact,
        token: passcode,
        type: 'email',
      });
      if (error) {
        throw new Error(error.message);
      }
    },

    signOut: async () => {
      const { error } = await client.auth.signOut();
      if (error) {
        throw new Error(error.message);
      }
    },
  };
}
