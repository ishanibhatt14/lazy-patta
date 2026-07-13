import { createClient } from '@supabase/supabase-js';

/**
 * Resolve the authenticated caller of an authority route from their bearer
 * token. The browser session lives in the Supabase JS client (localStorage), so
 * clients attach `Authorization: Bearer <access_token>` to authority requests;
 * here we verify that token against the auth server with the public anon key and
 * return the caller's user id. Returns null when the token is missing or invalid
 * — the route then answers 401. The service-role key is never used for identity.
 */

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice('bearer '.length).trim();
  return token.length > 0 ? token : null;
}

export async function getRequestUserId(request: Request): Promise<string | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const url = readEnv('SUPABASE_URL') ?? readEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = readEnv('SUPABASE_ANON_KEY') ?? readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!url || !anonKey) return null;

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
