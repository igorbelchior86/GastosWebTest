const CACHE = 'v5';   // bump para nova versão
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './icons/icon-192x192.png',
  './icons/icon-180x180.png',
  './site.webmanifest',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap',
  'https://fonts.googleapis.com/css2?family=Caveat&display=swap',
];

// Instalação e pré-cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Ativa novo SW imediatamente
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Cache-first, network-fallback for all GET requests
self.addEventListener('fetch', e =>
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  )
);

// Notify clients to flush queue when back online
self.addEventListener('sync', event => {
  if (event.tag === 'sync-tx') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client =>
          client.postMessage({ type: 'sync-tx' })
        );
      })
    );
  }
});