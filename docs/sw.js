/* FC Hanley Service Worker – network-first strategy */
const CACHE_NAME = 'fchanley-v3';
const PRECACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/images/HanleyBadge.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  /* Only handle GET requests — skip POST etc */
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        /* Got a fresh response — clone it into cache for offline fallback */
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return networkResponse;
      })
      .catch(() => {
        /* Network failed (offline) — fall back to cache */
        return caches.match(event.request);
      })
  );
});