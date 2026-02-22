// ── Service Worker — App Shell Cache ──
// Derives the base path from its own URL so it works at any subpath.

const CACHE_NAME = 'bjj-openmats-v1';

// The SW lives at {base}sw.js, so strip "sw.js" to get the base path.
// e.g. "/bjj-open-mats-mn/sw.js" → "/bjj-open-mats-mn/"
// e.g. "/sw.js" → "/"
const SW_PATH = self.location.pathname;
const BASE = SW_PATH.slice(0, SW_PATH.lastIndexOf('/') + 1);

// Pages and assets to pre-cache, relative to BASE
const SHELL_PATHS = [
  '',            // index
  'calendar/',
  'settings/',
  'dev/',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

const SHELL_URLS = SHELL_PATHS.map(p => BASE + p);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll ignores failures on individual entries so a missing icon
      // won't break the install
      Promise.allSettled(SHELL_URLS.map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    // Network-first for page navigations; fall back to cache or offline page
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              caches.match(BASE).then(
                (root) =>
                  root ||
                  new Response(
                    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head>' +
                    '<body style="font-family:system-ui;padding:2rem"><h1>Offline</h1>' +
                    '<p>You are offline. Please check your connection.</p></body></html>',
                    { headers: { 'Content-Type': 'text/html' } }
                  )
              )
          )
        )
    );
  } else {
    // Cache-first for assets
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
