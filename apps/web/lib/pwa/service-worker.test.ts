import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import { registerServiceWorker, SERVICE_WORKER_PATH } from './service-worker';

describe('registerServiceWorker', () => {
  it('registers the worker when the browser supports it', () => {
    const register = vi.fn().mockResolvedValue(undefined);
    registerServiceWorker({ serviceWorker: { register } } as unknown as Navigator);
    expect(register).toHaveBeenCalledWith(SERVICE_WORKER_PATH);
  });

  it('is a no-op when service workers are unsupported', () => {
    expect(() => registerServiceWorker({} as Navigator)).not.toThrow();
  });

  it('is a no-op when no navigator is available', () => {
    expect(() => registerServiceWorker(undefined)).not.toThrow();
  });

  it('swallows a rejected registration', async () => {
    const register = vi.fn().mockRejectedValue(new Error('nope'));
    expect(() =>
      registerServiceWorker({ serviceWorker: { register } } as unknown as Navigator),
    ).not.toThrow();
    await Promise.resolve();
  });
});

// The service worker is plain JS served from /public; assert its safety contract
// structurally the way the repo verifies migrations — reading the file text.
const swPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'sw.js');
const sw = readFileSync(swPath, 'utf8');

describe('offline-shell service worker contract', () => {
  it('uses a versioned cache name so activations can purge old shells', () => {
    expect(sw).toMatch(/const CACHE = 'lazy-patta-shell-v\d+'/);
  });

  it('precaches an offline fallback page', () => {
    expect(sw).toContain("const OFFLINE_URL = '/offline'");
    expect(sw).toMatch(/PRECACHE\s*=\s*\[[\s\S]*OFFLINE_URL/);
  });

  it('registers install, activate, and fetch listeners', () => {
    for (const evt of ['install', 'activate', 'fetch']) {
      expect(sw).toContain(`addEventListener('${evt}'`);
    }
  });

  it('only intercepts same-origin GET navigations (never API/data requests)', () => {
    expect(sw).toContain("request.method !== 'GET'");
    expect(sw).toContain("request.mode !== 'navigate'");
    expect(sw).toContain('url.origin !== self.location.origin');
  });

  it('deletes caches other than the current version on activate', () => {
    expect(sw).toMatch(/keys\.filter\(\(key\) => key !== CACHE\)/);
  });
});
