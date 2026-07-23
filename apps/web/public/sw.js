/*
 * Lazy Patta service worker — an honest offline shell (Release Train 2, PR 16).
 *
 * Its job is narrow on purpose: make the installed app open to a friendly
 * offline screen instead of the browser's dinosaur when there is no network. It
 * is deliberately NOT a general read-through cache. It only ever intercepts
 * same-origin top-level navigations and serves them network-first, falling back
 * to a precached /offline page when the network is unreachable. Every other
 * request — API calls, Supabase realtime, static assets, cross-origin — passes
 * straight through to the browser untouched, so there is no stale-cache class of
 * bug and gameplay state is never served from a snapshot.
 */

const CACHE = 'lazy-patta-shell-v2';
const OFFLINE_URL = '/offline';
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only same-origin, top-level page navigations get the offline fallback. GET
  // only; everything else is left to the browser's default handling.
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL, { ignoreSearch: true })));
});
