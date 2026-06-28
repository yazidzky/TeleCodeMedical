/**
 * TeleCode Medical — Service Worker
 * Offline-first PWA strategy:
 *   - Cache First for static assets (JS, CSS, fonts)
 *   - Network First for navigation (HTML)
 *   - Stale-While-Revalidate for images
 */

const CACHE_NAME    = 'tcm-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── Install: pre-cache shell ──────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch strategy ────────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET and non-http requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // Navigation — Network First (SPA fallback to index.html)
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets (JS, CSS, fonts, icons) — Cache First
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|ico)$/) ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return resp;
        });
      })
    );
    return;
  }

  // Everything else — Stale While Revalidate
  e.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request).then(resp => {
        caches.open(CACHE_NAME).then(c => c.put(request, resp.clone()));
        return resp;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
