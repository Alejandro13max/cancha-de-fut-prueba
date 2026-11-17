/* Service Worker - MULTI CANCHA PWA */
const CACHE_NAME = 'multicancha-v2';
const CORE_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://code.jquery.com/jquery-3.7.1.min.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Teko:wght@500;700&family=Outfit:wght@300;500;700&display=swap'
];

/* Instalación: precachea el core */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CORE_ASSETS).catch(err => console.warn('Precache parcial:', err)))
            .then(() => self.skipWaiting())
    );
});

/* Activación: limpia cachés viejas */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        )).then(() => self.clients.claim())
    );
});

/* Fetch: cache-first con fallback a red; cachea imágenes locales on-the-fly */
self.addEventListener('fetch', event => {
    const req = event.request;

    // Solo GET
    if (req.method !== 'GET') return;

    // Imágenes locales de ./img/ → cache-first (para que funcionen offline)
    if (req.url.includes('/img/')) {
        event.respondWith(
            caches.match(req).then(cached => {
                if (cached) return cached;
                return fetch(req).then(res => {
                    if (res.ok) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then(c => c.put(req, clone));
                    }
                    return res;
                }).catch(() => caches.match('./index.html'));
            })
        );
        return;
    }

    // Resto: cache-first, luego red
    event.respondWith(
        caches.match(req).then(cached => {
            if (cached) return cached;
            return fetch(req).then(res => {
                // Cachear recursos de CDNs si son válidos
                if (res.ok && (req.url.includes('cdn.jsdelivr.net') ||
                               req.url.includes('cdnjs.cloudflare.com') ||
                               req.url.includes('fonts.googleapis.com'))) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(req, clone));
                }
                return res;
            }).catch(() => {
                // Fallback final: si es navegación, devuelve index
                if (req.mode === 'navigate') return caches.match('./index.html');
            });
        })
    );
});