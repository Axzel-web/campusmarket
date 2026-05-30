const CACHE_NAME = 'campus-market-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Perform install steps
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell and essential assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event (cleanup old caches)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Cleaning old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event listener (Cache-first with Network Fallback strategy)
self.addEventListener('fetch', event => {
  // Only handle GET requests and local domains or safe assets
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Serve from cache and update cache in the background
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, networkResponse);
                });
              }
            })
            .catch(() => {/* Ignore network update failure offline */});
          
          return cachedResponse;
        }

        return fetch(event.request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Cache standard successful local requests dynamically
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              const url = new URL(event.request.url);
              // Only cache local origins or static vendor assets
              if (url.origin === self.location.origin) {
                cache.put(event.request, responseToCache);
              }
            });

            return networkResponse;
          })
          .catch(error => {
            console.log('[Service Worker] Fetch failed; returning offline fallback if index.html is cached.', error);
            // Fallback to offline page shell (index.html)
            return caches.match('/index.html') || caches.match('/');
          });
      })
  );
});
