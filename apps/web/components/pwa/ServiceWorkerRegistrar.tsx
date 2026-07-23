'use client';

import { useEffect } from 'react';

import { registerServiceWorker } from '../../lib/pwa/service-worker';

/**
 * Registers the offline-shell service worker on mount (Release Train 2, PR 16).
 * Renders nothing. Deliberately gated to production builds so local development
 * never installs a caching worker that could serve stale assets while iterating.
 */
export function ServiceWorkerRegistrar(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    registerServiceWorker();
  }, []);
  return null;
}
