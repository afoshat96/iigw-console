/* IIGW Capacity Console service worker
 *
 * How updates work:
 *   1. Every deploy changes VERSION below (and the matching APP_VERSION in index.html).
 *   2. The page asks the browser to re-check sw.js when it opens, when it comes back to the
 *      foreground, and every 30 minutes. A changed file installs a new worker in the background.
 *   3. The page shows "A new version is ready · Update"; tapping it activates the new worker
 *      and reloads. Old caches are deleted on activation.
 *
 * Caching:
 *   - The page itself (index.html) is network-first: online users always get the latest copy,
 *     the cached copy is only a fallback when offline.
 *   - App files (logos, icons, manifest) are cached per VERSION.
 *   - Pinned CDN libraries (Firebase SDK, SheetJS, ExcelJS) and Google Fonts are
 *     stale-while-revalidate: instant from cache, refreshed in the background.
 *   - Firebase data, sign-in and Google APIs are never cached or touched here.
 */
const VERSION = '2026-11-22.4';
const APP_CACHE = 'iigw-app-' + VERSION;
const CDN_CACHE = 'iigw-cdn-v1';

const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/logos/moc.png',
  './assets/logos/supercell.png',
  './assets/logos/horizon.png',
  './assets/logos/masarat.png',
  './assets/logos/jazeera.png',
  './assets/logos/zain-iraq.png',
  './assets/logos/asiacell.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png',
  './assets/icons/moc-emblem.svg'
];
const CDN_HOSTS = ['cdnjs.cloudflare.com', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then(c => c.addAll(APP_FILES.map(u => new Request(u, { cache: 'reload' }))))
      .catch(() => {}) /* a missing optional file must not block the update */
  );
  /* do not skipWaiting here: the page decides when to switch, so nobody loses unsaved work */
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'GET_VERSION' && event.source) event.source.postMessage({ type: 'VERSION', version: VERSION });
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('iigw-app-') && k !== APP_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* the page: network first, never stale when online */
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const c = await caches.open(APP_CACHE);
        c.put('./index.html', fresh.clone());
        return fresh;
      } catch (_) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  /* our own files: cache first within this version, then network */
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/sw.js')) return;
    event.respondWith((async () => {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(APP_CACHE)).put(req, res.clone());
      return res;
    })());
    return;
  }

  /* pinned libraries and fonts: stale-while-revalidate */
  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith((async () => {
      const c = await caches.open(CDN_CACHE);
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })());
  }
  /* everything else (Firestore, Firebase Auth, Google APIs) goes straight to the network */
});
