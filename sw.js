// 가계부 서비스워커 — 오프라인 지원 + 안전한 업데이트
// HTML은 '네트워크 우선'이라 온라인에서 앱을 새로 열면 항상 최신 버전을 불러옵니다.
// (앱 사용 중 강제 새로고침/강제 takeover를 하지 않아 데이터가 안전합니다.
//  새 버전은 앱을 완전히 껐다 켜면 자연스럽게 적용됩니다.)

const CACHE = 'gagyebu-v2';
const ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
];

self.addEventListener('install', e => {
  // ★ skipWaiting() 제거: 사용 중인 페이지를 강제로 가로채지 않음
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', e => {
  // 오래된 캐시만 정리 (clients.claim() 없음 → 라이브 페이지 강제 제어 안 함)
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 같은 출처만 처리

  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // 네트워크 우선 → 최신 HTML, 실패하면 캐시(오프라인)
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // 정적 파일 → 캐시 우선
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
