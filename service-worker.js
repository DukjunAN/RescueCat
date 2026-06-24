const CACHE_NAME = 'rescuecat-assets-v1';

// 이미지/아이콘만 사전 캐시 (코드 파일은 항상 네트워크에서 직접 로드)
const PRECACHE_FILES = [
  '/manifest.json',
  '/assets/image/Cat_Sprite_Sheet.png',
  '/assets/image/icon-192.png',
  '/assets/image/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        const oldKeys = keys.filter(k => k !== CACHE_NAME);
        const isUpdate = oldKeys.length > 0;
        return Promise.all(oldKeys.map(k => caches.delete(k))).then(() => isUpdate);
      })
      .then(isUpdate => self.clients.claim().then(() => isUpdate))
      .then(isUpdate => {
        if (!isUpdate) return;
        // 업데이트 시 열려 있는 모든 탭에 새로고침 신호 전송
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

const BYPASS_DOMAINS = [
  'supabase.co',
  'googleapis.com',
  'accounts.google.com'
];

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 외부 API: 서비스워커 개입 없음
  if (BYPASS_DOMAINS.some(d => url.hostname.endsWith(d))) return;

  const path = url.pathname;

  // HTML / JS / CSS → 항상 네트워크 우선, 캐시하지 않음
  // 배포 후 다음 방문부터 즉시 최신 코드 적용 (수동 캐시 삭제 불필요)
  if (/\.(html|js|css)(\?.*)?$/.test(path) || path === '/' || path.endsWith('/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then(r => r || caches.match('/index.html'))
      )
    );
    return;
  }

  // 이미지 / 오디오 → 캐시 우선 (대용량, 변경 거의 없음)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          caches.open(CACHE_NAME).then(c => c.put(event.request, response.clone()));
        }
        return response;
      });
    }).catch(() => caches.match('/index.html'))
  );
});
