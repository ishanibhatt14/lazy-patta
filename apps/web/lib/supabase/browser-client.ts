import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client factory.
 *
 * The URL and anon key are public by design (the anon key only grants what RLS
 * allows), so they travel as `NEXT_PUBLIC_*` env vars. Everything privileged
 * stays behind RLS and the SECURITY DEFINER RPCs — this client can only read
 * what the signed-in user is entitled to and can only mutate through those RPCs.
 *
 * Creation is deferred and guarded: when the env is absent (e.g. a CI build with
 * no secrets, or a contributor who hasn't configured Supabase yet) the app must
 * still build and render. Callers use {@link isSupabaseConfigured} to branch to
 * a friendly "online play not configured" notice instead of crashing.
 */

const URL_ENV = 'NEXT_PUBLIC_SUPABASE_URL';
const ANON_KEY_ENV = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';
const VERCEL_SUPABASE_URL_ENV = 'NEXT_PUBLIC_SUPABASE_URL_SUPABASE_URL';
const VERCEL_SUPABASE_PUBLISHABLE_KEY_ENV = 'NEXT_PUBLIC_SUPABASE_URL_SUPABASE_PUBLISHABLE_KEY';
const VERCEL_SUPABASE_ANON_KEY_ENV = 'NEXT_PUBLIC_SUPABASE_URL_SUPABASE_ANON_KEY';

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readFirstEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = readEnv(name);
    if (value) return value;
  }
  return undefined;
}

/** Whether both public Supabase env vars are present. Safe on server and client. */
export function isSupabaseConfigured(): boolean {
  return readPublicUrl() !== undefined && readPublicKey() !== undefined;
}

function readPublicUrl(): string | undefined {
  return readFirstEnv([URL_ENV, VERCEL_SUPABASE_URL_ENV]);
}

function readPublicKey(): string | undefined {
  return readFirstEnv([
    ANON_KEY_ENV,
    VERCEL_SUPABASE_PUBLISHABLE_KEY_ENV,
    VERCEL_SUPABASE_ANON_KEY_ENV,
  ]);
}

let cached: SupabaseClient | undefined;

/**
 * Returns a singleton browser Supabase client. Throws a clear error if the env
 * is missing — call {@link isSupabaseConfigured} first when a missing config is
 * an expected, non-fatal state.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (cached) return cached;

  const url = readPublicUrl();
  const anonKey = readPublicKey();
  if (!url || !anonKey) {
    throw new Error(
      `Supabase is not configured: set ${URL_ENV} and ${ANON_KEY_ENV}. ` +
        'See .env.example for the required values.',
    );
  }

  cached = createClient(url, anonKey, {
    auth: {
      // Persist and refresh the session in the browser so a reload keeps the
      // player signed in. Tokens live inside this client and are never surfaced
      // through the agnostic AuthProvider contract.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cached;
}
