/**
 * Service Worker for Offline Support and PWA Features
 * 
 * Features:
 * - Caches critical resources for offline access
 * - Network-first strategy for API calls
 * - Cache-first strategy for static assets
 * - Background sync for offline actions
 * - Cache versioning and cleanup
 * 
 * @version 2.1
 */

const CACHE_NAME = 'adriano-star-v31';
const API_CACHE_NAME = 'adriano-star-api-v2';
const IMAGE_CACHE_NAME = 'adriano-star-images-v2';
const CRITICAL_RESOURCES = [
    '/',
    '/index.html',
    '/offline.html',
    '/database.html',
    '/games.html',
    '/secure-chat.html',
    '/styles.css',
    '/loader.js',
    '/loader.css',
    '/pwa-loader.js',
    '/navigation.js',
    '/keyboard-shortcuts.js',
    '/cosmic-music-player.js',
    '/secure-chat.js',
    '/broadband-checker.js',
    '/games.js',
    '/theme-toggle.js',
    '/accessibility.js',
    '/i18n.js',
    '/color-schemes.js',
    '/offline-mode-enhancements.js',
    '/enhanced-notifications.js',
    '/quick-actions-toolbar.js',
    '/session-recovery.js',
    '/verify-buttons.js',
    '/exoplanet-xr-experience.js',
    '/exoplanet-api.js',
    '/interstellar-news.js',
    '/user-history.js',
    '/education.html',
    '/education.js',
    '/educational-games.js',
    '/star-system-builder.js',
    '/education-gamification.js',
    '/education-ai-tutor.js',
    '/projects.html',
    '/projects.css',
    '/projects-experimental.js',
    '/exoplanet-pioneer.html',
    '/exoplanet-pioneer.css',
    '/exoplanet-pioneer.js',
    '/market-system.js',
    '/captains-log.js',
    '/alien-ecosystem.js',
    '/galaxy-engine.js',
    '/military-system.js',
    '/planet-generator.js',
    '/production-system.js',
    '/drone-system.js',
    '/orbital-system.js',
    '/ship-designer.js',
    '/fleet-system.js',
    '/alien-generator.js',
    '/combat-system.js',
    '/archaeology-manager.js',
    '/victory-system.js',
    '/diplomacy-system.js',
    '/trade-system.js',
    '/achievement-system.js',
    '/event-system.js',
    '/multiplayer-system.js',
    '/performance-system.js',
    '/feature-flags.js'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching critical resources');
                const requests = CRITICAL_RESOURCES.map((url) => new Request(url, { cache: 'reload' }));
                return cache.addAll(requests).catch((error) => {
                    console.warn('Service Worker: Failed to cache some critical resources:', error);
                    // Continue install even if some assets fail
                    return Promise.resolve();
                });
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME &&
                        cacheName !== API_CACHE_NAME &&
                        cacheName !== IMAGE_CACHE_NAME &&
                        cacheName.startsWith('adriano-star')) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

const ALWAYS_FRESH_ASSETS = new Set([
    '/navigation.js',
    '/keyboard-shortcuts.js',
    '/theme-toggle.js',
    '/database-ai-search-suggestions-enhanced.js',
    '/ai-model-performance-metrics.js',
    '/shop.js',
    '/games.js',
    '/exoplanet-pioneer.js',
    '/planet-generator.js',
    '/archaeology-manager.js',
    '/terraforming-manager.js',
    '/space-combat.js',
    '/exoplanet-pioneer.css',
    '/file-storage-styles.css'
]);

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    const url = new URL(event.request.url);

    // Skip non-HTTP(S) protocols (e.g., chrome-extension:// in Edge)
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // API requests - Network first, then cache
    if (url.pathname.includes('/api/') || url.pathname.includes('supabase.co')) {
        event.respondWith(networkFirstStrategy(event.request, API_CACHE_NAME));
        return;
    }

    // Images - Cache first, then network
    if (event.request.destination === 'image') {
        event.respondWith(cacheFirstStrategy(event.request, IMAGE_CACHE_NAME));
        return;
    }

    if (ALWAYS_FRESH_ASSETS.has(url.pathname)) {
        event.respondWith(networkFirstStrategy(event.request, CACHE_NAME));
        return;
    }

    // Static assets - Cache first
    if (url.pathname.match(/\.(js|css|json|woff|woff2|ttf|eot)$/)) {
        event.respondWith(cacheFirstStrategy(event.request, CACHE_NAME));
        return;
    }

    // HTML pages - Network first with cache fallback
    if (event.request.destination === 'document') {
        event.respondWith(networkFirstStrategy(event.request, CACHE_NAME));
        return;
    }

    // Default: Network first
    event.respondWith(networkFirstStrategy(event.request, CACHE_NAME));
});

/**
 * Network-first strategy: Try network, fallback to cache
 * @param {Request} request - Fetch request
 * @param {string} cacheName - Cache name to use
 * @returns {Promise<Response>} Response from network or cache
 */
async function networkFirstStrategy(request, cacheName) {
    const requestUrl = new URL(request.url);
    // Extra guard: never attempt to cache non-HTTP(S) requests
    if (!requestUrl.protocol.startsWith('http')) {
        return fetch(request);
    }

    try {
        const fetchRequest = new Request(request, { cache: 'reload' });
        const response = await fetch(fetchRequest);

        // Cache successful responses
        if (response && response.status === 200) {
            try {
                const cache = await caches.open(cacheName);
                await cache.put(request, response.clone());
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.warn('SW: Quota exceeded. Unable to cache API response.');
                    // Optional: Try to clear old caches here if critical
                } else {
                    console.error('SW: Cache error:', e);
                }
            }
        }

        return response;
    } catch (error) {
        // Network failed, try cache
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // If it's a document request and no cache, return offline page
        if (request.destination === 'document' && !request.url.includes('/experimental/')) {
            const offlineCache = await caches.open(CACHE_NAME);
            const offlinePage = await offlineCache.match('/offline.html');
            if (offlinePage) return offlinePage;
        }

        throw error;
    }
}

/**
 * Cache-first strategy: Try cache, fallback to network
 * @param {Request} request - Fetch request
 * @param {string} cacheName - Cache name to use
 * @returns {Promise<Response>} Response from cache or network
 */
async function cacheFirstStrategy(request, cacheName) {
    const requestUrl = new URL(request.url);
    // Extra guard: never attempt to cache non-HTTP(S) requests
    if (!requestUrl.protocol.startsWith('http')) {
        return fetch(request);
    }

    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const fetchRequest = new Request(request, { cache: 'reload' });
        const response = await fetch(fetchRequest);

        // Cache successful responses
        if (response && response.status === 200) {
            try {
                await cache.put(request, response.clone());
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.warn('SW: Quota exceeded. Unable to cache asset.');
                } else {
                    console.error('SW: Cache error:', e);
                }
            }
        }

        return response;
    } catch (error) {
        // If network fails and no cache, return error or fallback
        if (request.destination === 'image') {
            // Return a simple SVG placeholder if image fails
            return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#333"/><text x="50" y="50" fill="#fff" text-anchor="middle" dy=".3em">IMG</text></svg>', {
                headers: { 'Content-Type': 'image/svg+xml' }
            });
        }
        throw error;
    }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-planet-claims') {
        event.waitUntil(syncPlanetClaims());
    }
});

/**
 * Sync planet claims when back online
 */
async function syncPlanetClaims() {
    // This would sync any offline claims when connection is restored
    // Implementation depends on backend API
    console.log('🔄 Syncing planet claims...');
}
