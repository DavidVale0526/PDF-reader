const CACHE_NAME = 'pdf-reader-pwa-cache-v1';

// All the assets we want to cache to run offline
const urlsToCache = [
  // Core pages
  '/',
  '/index.html',
  '/loader.html',
  
  // Viewer and UI
  '/web/viewer.html',
  '/web/viewer.css',
  '/web/viewer.mjs',
  '/web/locale/locale.json',
  
  // PDF.js Engine Scripts
  '/build/pdf.mjs',
  '/build/pdf.worker.mjs',
  
  // Custom scripts
  '/web/bridge.js',
  '/injector.js',
  '/content_bridge.js'
];

// Install Event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Archivos cacheados correctamente');
        // Usamos addAll de forma tolerante a errores, si uno falla, no rompe todo
        return Promise.allSettled(urlsToCache.map(url => cache.add(url)));
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Mágia Offline (Cache First, Network Fallback)
self.addEventListener('fetch', event => {
  // Ignoramos peticiones de chrome-extension:// o requests no-GET
  if (!event.request.url.startsWith('http') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Si no está en caché, intentamos obtener de red
        return fetch(event.request).then(
          function(response) {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANTE: Clonar el response porque es un Stream y se consume
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(err => {
            // Si estamos offline y no está en caché, podríamos devolver un fallback específico.
            console.error('[Service Worker] Falló el fetch y no está en caché:', event.request.url);
        });
      })
  );
});
