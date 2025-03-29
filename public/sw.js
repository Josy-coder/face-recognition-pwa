const CACHE_NAME = 'facerecog-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/admin',
    '/history',
    '/search',
    '/crop',
    '/results',
    '/offline',
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png',
    '/icons/favicon.ico',
    '/profile-placeholder.jpg'
];

// Install Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Cache and return requests
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests and API calls
    if (
        !event.request.url.startsWith(self.location.origin) ||
        event.request.url.includes('/api/')
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                return fetch(event.request)
                    .then(response => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(error => {
                        // If fetch fails (offline), show the offline page
                        // Only do this for HTML navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/offline');
                        }

                        throw error;
                    });
            })
    );
});

// Update Service Worker
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