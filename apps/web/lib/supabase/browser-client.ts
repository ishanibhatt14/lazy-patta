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

const PUBLIC_SUPABASE_URL = readEnv(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL_SUPABASE_URL,
);
const PUBLIC_SUPABASE_KEY = readEnv(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_URL_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_URL_SUPABASE_ANON_KEY,
);

function readEnv(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Whether both public Supabase env vars are present. Safe on server and client. */
export function isSupabaseConfigured(): boolean {
  return readPublicUrl() !== undefined && readPublicKey() !== undefined;
}

function readPublicUrl(): string | undefined {
  return PUBLIC_SUPABASE_URL;
}

function readPublicKey(): string | undefined {
  return PUBLIC_SUPABASE_KEY;
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
      'Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
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
