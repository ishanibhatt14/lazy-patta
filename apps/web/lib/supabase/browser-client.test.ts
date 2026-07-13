import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadConfigured(): Promise<boolean> {
  vi.resetModules();
  const { isSupabaseConfigured } = await import('./browser-client');
  return isSupabaseConfigured();
}

describe('browser Supabase configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('detects the manual public env names', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-anon-key');

    await expect(loadConfigured()).resolves.toBe(true);
  });

  it('detects Vercel Supabase integration public env names', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL_SUPABASE_PUBLISHABLE_KEY', 'public-publishable-key');

    await expect(loadConfigured()).resolves.toBe(true);
  });

  it('stays unconfigured without a public URL and key', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL_SUPABASE_URL', '   ');

    await expect(loadConfigured()).resolves.toBe(false);
  });
});
