// Service Worker para PWA
const CACHE_NAME = 'gendaia-v2';
const urlsToCache = [
    '/',
    '/dashboard',
    '/login',
    '/manifest.json',
    '/images/icon-192x192.png',
    '/images/icon-512x512.png',
    '/images/ios-add-to-home.png',
    '/favicon.ico'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
    // Take control of all clients as soon as the service worker activates
    event.waitUntil(clients.claim());

    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Estratégia de cache: Stale-while-revalidate
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // For HTML requests - network first, then cache
    if (event.request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }

    // For all other requests - stale-while-revalidate
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return cached response immediately if available
            const fetchPromise = fetch(event.request)
                .then((networkResponse) => {
                    // Update the cache
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                    });
                    return networkResponse;
                })
                .catch((error) => {
                    console.error('Fetch failed:', error);
                });

            return cachedResponse || fetchPromise;
        })
    );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
}); 