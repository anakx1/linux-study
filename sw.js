/* Offline cache for the study guide. Bump CACHE when content changes. */
const CACHE = 'hlw-study-v2';
const ASSETS = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'data/book.js',
  'data/ch01.js',
  'data/ch02.js',
  'data/ch03.js',
  'data/ch04.js',
  'data/ch05.js',
  'data/ch06.js',
  'data/ch07.js',
  'data/ch08.js',
  'data/ch09.js',
  'data/ch10.js',
  'data/ch11.js',
  'data/ch12.js',
  'data/ch13.js',
  'data/ch14.js',
  'data/ch15.js',
  'data/ch16.js',
  'data/ch17.js',
  'manifest.webmanifest',
  'icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Refresh the cached copy in the background; serve the cache first for speed and offline use.
  const network = fetch(req).then(res => {
    if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
    return res;
  });
  event.waitUntil(network.catch(() => {}));

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;
      return network.catch(async () => {
        if (req.mode === 'navigate') {
          const fallback = await caches.match('index.html');
          if (fallback) return fallback;
        }
        return Response.error();
      });
    })
  );
});
