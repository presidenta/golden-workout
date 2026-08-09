// Пути относительные: приложение может жить не в корне домена,
// а в подпапке — с абсолютными "/..." там ничего бы не нашлось.
const CACHE_NAME = 'golden-workout-v16';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/store.js',
  './js/i18n.js',
  './js/data.js',
  './js/methodology.js',
  './js/eyes.js',
  './js/timer.js',
  './js/speech.js',
  './js/workout.js',
  './js/ui.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // App shell: Cache First
  if (url.origin === location.origin && request.destination !== 'image') {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
    return;
  }

  // Свои картинки лежат рядом и не меняются — берём из кэша сразу
  if (request.destination === 'image' && url.origin === location.origin) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      }))
    );
    return;
  }

  // Images: Network First with cache fallback + offline placeholder
  if (request.destination === 'image') {
    e.respondWith(
      fetch(request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      }).catch(() =>
        caches.match(request).then(cached => {
          if (cached) return cached;
          // Return inline SVG placeholder for broken images
          return new Response(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect fill="#121217" width="400" height="300"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#d4af37" font-size="18">🏋️ GIF недоступен</text></svg>`,
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        })
      )
    );
  }
});
