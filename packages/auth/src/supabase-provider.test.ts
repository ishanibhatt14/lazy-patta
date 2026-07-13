import { type SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { type SessionState } from './session';
import { createSupabaseAuthProvider } from './supabase-provider';

type AuthChangeHandler = (event: string, session: unknown) => void;

/**
 * A minimal fake of the Supabase auth surface the adapter touches. It records
 * calls and lets a test drive `onAuthStateChange` to simulate sign-in/out.
 */
function fakeClient(session: unknown = null) {
  const calls = {
    signInWithOtp: vi.fn(async () => ({ error: null })),
    signInAnonymously: vi.fn(async () => ({ error: null })),
    verifyOtp: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => ({ error: null })),
  };
  let handler: AuthChangeHandler | undefined;
  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session } })),
      onAuthStateChange: vi.fn((cb: AuthChangeHandler) => {
        handler = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signInWithOtp: calls.signInWithOtp,
      signInAnonymously: calls.signInAnonymously,
      verifyOtp: calls.verifyOtp,
      signOut: calls.signOut,
    },
  } as unknown as SupabaseClient;
  return { client, calls, fire: (s: unknown) => handler?.('SIGNED_IN', s) };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('createSupabaseAuthProvider', () => {
  it('requests an email passcode via signInWithOtp', async () => {
    const { client, calls } = fakeClient();
    const provider = createSupabaseAuthProvider(client);
    await provider.requestPasscode('nani@example.test');
    expect(calls.signInWithOtp).toHaveBeenCalledWith({
      email: 'nani@example.test',
      options: { shouldCreateUser: true },
    });
  });

  it('includes an explicit email redirect URL when configured', async () => {
    const { client, calls } = fakeClient();
    const provider = createSupabaseAuthProvider(client, {
      getEmailRedirectTo: () => ' https://lazy-patta-web.vercel.app/play/online ',
    });
    await provider.requestPasscode('nani@example.test');
    expect(calls.signInWithOtp).toHaveBeenCalledWith({
      email: 'nani@example.test',
      options: {
        shouldCreateUser: true,
        emailRedirectTo: 'https://lazy-patta-web.vercel.app/play/online',
      },
    });
  });

  it('verifies a passcode via verifyOtp with type email', async () => {
    const { client, calls } = fakeClient();
    const provider = createSupabaseAuthProvider(client);
    await provider.verifyPasscode('nani@example.test', '123456');
    expect(calls.verifyOtp).toHaveBeenCalledWith({
      email: 'nani@example.test',
      token: '123456',
      type: 'email',
    });
  });

  it('signs in as an anonymous guest with normalized display metadata', async () => {
    const { client, calls } = fakeClient();
    const provider = createSupabaseAuthProvider(client);
    await provider.signInAsGuest('  Ba   Player  ');
    expect(calls.signInAnonymously).toHaveBeenCalledWith({
      options: { data: { display_name: 'Ba Player' } },
    });
  });

  it('signs in as an anonymous guest without metadata for a blank name', async () => {
    const { client, calls } = fakeClient();
    const provider = createSupabaseAuthProvider(client);
    await provider.signInAsGuest('   ');
    expect(calls.signInAnonymously).toHaveBeenCalledWith({
      options: undefined,
    });
  });

  it('propagates a verify error as a thrown Error', async () => {
    const { client, calls } = fakeClient();
    calls.verifyOtp.mockResolvedValueOnce({ error: { message: 'Token has expired' } } as never);
    const provider = createSupabaseAuthProvider(client);
    await expect(provider.verifyPasscode('a@b.test', '000000')).rejects.toThrow(
      'Token has expired',
    );
  });

  it('signs out through the Supabase client', async () => {
    const { client, calls } = fakeClient();
    const provider = createSupabaseAuthProvider(client);
    await provider.signOut();
    expect(calls.signOut).toHaveBeenCalledOnce();
  });

  it('maps a signed-in Supabase session onto the agnostic AuthUser', async () => {
    const { client } = fakeClient({
      user: {
        id: 'user-1',
        email: 'ba@example.test',
        user_metadata: { display_name: 'Ba', avatar_url: 'a.png' },
      },
      expires_at: 1000,
    });
    const provider = createSupabaseAuthProvider(client);
    await flush();
    const state = provider.getState();
    expect(state.status).toBe('signed-in');
    if (state.status !== 'signed-in') throw new Error('expected signed-in');
    expect(state.session.user).toMatchObject({
      kind: 'user',
      userId: 'user-1',
      displayName: 'Ba',
      avatarUrl: 'a.png',
    });
    expect(state.session.expiresAt).toBe(1_000_000);
  });

  it('falls back to the email local-part when no display name is set', async () => {
    const { client } = fakeClient({ user: { id: 'u2', email: 'kaka@example.test' } });
    const provider = createSupabaseAuthProvider(client);
    await flush();
    const state = provider.getState();
    if (state.status !== 'signed-in') throw new Error('expected signed-in');
    expect(state.session.user.displayName).toBe('kaka');
  });

  it('reports signed-out and notifies subscribers on an auth change', async () => {
    const { client, fire } = fakeClient(null);
    const provider = createSupabaseAuthProvider(client);
    await flush();
    const seen: SessionState[] = [];
    provider.onStateChange((s) => seen.push(s));
    // Immediately replays current state (signed-out after hydration).
    expect(seen.at(-1)?.status).toBe('signed-out');

    fire({ user: { id: 'u3', email: 'x@y.test' }, expires_at: 2000 });
    expect(seen.at(-1)?.status).toBe('signed-in');
  });

  it('stops notifying after unsubscribe', async () => {
    const { client, fire } = fakeClient(null);
    const provider = createSupabaseAuthProvider(client);
    await flush();
    const seen: SessionState[] = [];
    const off = provider.onStateChange((s) => seen.push(s));
    off();
    fire({ user: { id: 'u4', email: 'z@y.test' } });
    // Only the immediate replay was recorded; the post-unsubscribe event isn't.
    expect(seen).toHaveLength(1);
  });
});
