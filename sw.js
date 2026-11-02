// Пути относительные: приложение может жить не в корне домена,
// а в подпапке — с абсолютными "/..." там ничего бы не нашлось.
/* VERSION обязан совпадать с ?v= у файлов в index.html: страница
   просит стили и скрипты именно с этой меткой, и кэш ищет их по
   полному адресу. Без метки заготовленные файлы не находились ни разу
   и лежали в кэше зря. */
const VERSION = '29';
const CACHE_NAME = 'golden-workout-v' + VERSION;
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css?v=' + VERSION,
  './js/app.js?v=' + VERSION,
  './js/db.js?v=' + VERSION,
  './js/store.js?v=' + VERSION,
  './js/i18n.js?v=' + VERSION,
  './js/data.js?v=' + VERSION,
  './js/methodology.js?v=' + VERSION,
  './js/eyes.js?v=' + VERSION,
  './js/treadmill.js?v=' + VERSION,
  './js/recovery.js?v=' + VERSION,
  './js/timer.js?v=' + VERSION,
  './js/speech.js?v=' + VERSION,
  './js/workout.js?v=' + VERSION,
  './js/ui.js?v=' + VERSION,
  './js/account/account.css?v=' + VERSION,
  './js/account/texts.js?v=' + VERSION,
  './js/account/session.js?v=' + VERSION,
  './js/account/sync.js?v=' + VERSION,
  './js/account/panel.js?v=' + VERSION
];

/* addAll работает по принципу «всё или ничего»: один недоступный файл
   отменял установку целиком. Кладём файлы по одному: что не доехало
   сейчас, докачается при первом же запросе.

   cache: 'reload' — мимо браузерного кэша. GitHub разрешает браузеру
   держать файл десять минут, и новая версия могла сложить в свой кэш
   вчерашние файлы, а потом отдавать их до следующей выкладки. */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(url => cache.add(new Request(url, { cache: 'reload' }))))
    )
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

  /* Сама страница — сначала из сети, кэш только без интернета. Из кэша
     первой она держала телефон на старой сборке: новые скрипты с новой
     меткой ?v= страница просто не просила. Скрипты и стили ниже идут из
     кэша — их адрес меняется с каждой сборкой, устареть они не могут. */
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() =>
        caches.match(request).then(cached => cached || caches.match('./index.html'))
      )
    );
    return;
  }

  /* App shell: сначала кэш, иначе сеть — и сразу кладём ответ в кэш.
     Раньше недостающий файл каждый раз тянулся заново и в офлайне
     не появлялся вовсе, из-за чего страница собиралась неполной. */
  if (url.origin === location.origin && request.destination !== 'image') {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Свои картинки лежат рядом и не меняются — берём из кэша сразу
  if (request.destination === 'image' && url.origin === location.origin) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        // Отказ сервера в кэш не кладём, иначе он отдавался бы вечно
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }))
    );
  }
});
