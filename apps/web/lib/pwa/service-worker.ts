/**
 * Service-worker registration (Release Train 2, PR 16). Kept as a tiny, pure
 * helper so the "is this environment capable, and did we ask to register" logic
 * is unit-testable without a browser. Registration is always best-effort: the
 * app is fully functional without a service worker, so any failure is swallowed.
 */

export const SERVICE_WORKER_PATH = '/sw.js';

/** Register the offline-shell service worker when the browser supports it. */
export function registerServiceWorker(nav: Navigator | undefined = globalThisNavigator()): void {
  if (!nav || !('serviceWorker' in nav)) return;
  void nav.serviceWorker.register(SERVICE_WORKER_PATH).catch(() => {
    // Best-effort: the app works fully without a service worker.
  });
}

function globalThisNavigator(): Navigator | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator;
}
