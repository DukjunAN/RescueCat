const CACHE_NAME = 'rescuecat-cache-v4';
const CACHE_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/image/Cat_Sprite_Sheet.png',
  '/assets/image/icon-192.png',
  '/assets/image/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

const BYPASS_DOMAINS = [
  'supabase.co',
  'googleapis.com',
  'accounts.google.com'
];

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (BYPASS_DOMAINS.some(d => url.hostname.endsWith(d))) {
    return;
  }

  // JS·CSS 파일은 항상 네트워크 우선 — 업데이트가 즉시 반영되도록
  const isCode = /\.(js|css)(\?|$)/.test(url.pathname);
  if (isCode) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // 이미지·폰트 등 정적 파일은 캐시 우선
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return response;
      });
    }).catch(() => caches.match('/index.html'))
  );
});
