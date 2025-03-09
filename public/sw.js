// Service Worker para PWA
const CACHE_NAME = 'gendaia-v1';
const urlsToCache = [
    '/',
    '/dashboard',
    '/login',
    '/manifest.json',
    '/images/icon-192x192.png',
    '/images/icon-512x512.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
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

// Estratégia de cache: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone da resposta para armazenar no cache
                const responseToCache = response.clone();

                caches.open(CACHE_NAME)
                    .then((cache) => {
                        // Armazena a resposta no cache apenas para requisições GET
                        if (event.request.method === 'GET') {
                            cache.put(event.request, responseToCache);
                        }
                    });

                return response;
            })
            .catch(() => {
                // Se falhar, tenta buscar do cache
                return caches.match(event.request);
            })
    );
}); 