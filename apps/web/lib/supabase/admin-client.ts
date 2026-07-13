import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client that holds the **service_role** key.
 *
 * This client bypasses RLS and is the sole path to the game-authority
 * persistence RPCs (`start_game`, `commit_game_action`, migration 0006). It must
 * NEVER reach the browser: it reads only non-`NEXT_PUBLIC_` env vars (which are
 * never bundled into client code) and throws if it detects a browser global.
 * Only route handlers under `app/api/**` and other server code may call it.
 */

const SERVICE_KEY_ENV = 'SUPABASE_SERVICE_ROLE_KEY';
const VERCEL_SUPABASE_URL_ENV = 'SUPABASE_URL_SUPABASE_URL';
const VERCEL_SUPABASE_PUBLIC_URL_ENV = 'NEXT_PUBLIC_SUPABASE_URL_SUPABASE_URL';
const VERCEL_SUPABASE_SERVICE_KEY_ENV = 'SUPABASE_URL_SUPABASE_SERVICE_ROLE_KEY';

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

/** The Supabase project URL for server use (falls back to the public one). */
function readUrl(): string | undefined {
  return readFirstEnv([
    'SUPABASE_URL',
    VERCEL_SUPABASE_URL_ENV,
    'NEXT_PUBLIC_SUPABASE_URL',
    VERCEL_SUPABASE_PUBLIC_URL_ENV,
  ]);
}

function readServiceKey(): string | undefined {
  return readFirstEnv([SERVICE_KEY_ENV, VERCEL_SUPABASE_SERVICE_KEY_ENV]);
}

/** Whether server-authoritative online play is configured in this environment. */
export function isAuthorityConfigured(): boolean {
  return readUrl() !== undefined && readServiceKey() !== undefined;
}

let cached: SupabaseClient | undefined;

export function getSupabaseAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseAdminClient must never run in the browser');
  }
  if (cached) return cached;

  const url = readUrl();
  const serviceKey = readServiceKey();
  if (!url || !serviceKey) {
    throw new Error(
      `Online authority is not configured: set SUPABASE_URL and ${SERVICE_KEY_ENV}. ` +
        'See .env.example. The service-role key is server-only and must never be exposed.',
    );
  }

  cached = createClient(url, serviceKey, {
    // The server holds no user session; every call is an explicit privileged write.
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
