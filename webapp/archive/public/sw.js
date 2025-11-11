// 애슬리트 타임 Service Worker
// Version: 1.0.0

const CACHE_NAME = 'athlete-time-v1';
const RUNTIME_CACHE = 'athlete-time-runtime-v1';
const IMAGE_CACHE = 'athlete-time-images-v1';

// 오프라인에서도 작동할 핵심 파일들
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/chat-improved-chzzk.html',
  '/pace-calculator.html',
  '/training-calculator.html',
  '/track-lane-calculator.html',
  '/public/manifest.json',
  '/public/icons/icon-192x192.png',
  '/public/icons/icon-512x512.png'
];

// 설치 이벤트: 핵심 파일 캐싱
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker 설치 중...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 핵심 파일 캐싱 시작');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('✅ 핵심 파일 캐싱 완료');
        return self.skipWaiting(); // 즉시 활성화
      })
      .catch((error) => {
        console.error('❌ 캐싱 실패:', error);
      })
  );
});

// 활성화 이벤트: 오래된 캐시 정리
self.addEventListener('activate', (event) => {
  console.log('⚡ Service Worker 활성화 중...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 현재 버전이 아닌 캐시 삭제
            if (cacheName !== CACHE_NAME && 
                cacheName !== RUNTIME_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('🗑️  오래된 캐시 삭제:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker 활성화 완료');
        return self.clients.claim(); // 모든 클라이언트 제어
      })
  );
});

// Fetch 이벤트: 네트워크 요청 처리
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API 요청은 네트워크 우선 (항상 최신 데이터)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 이미지는 캐시 우선 (빠른 로딩)
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // HTML, CSS, JS는 네트워크 우선 + 캐시 폴백
  if (request.destination === 'document' ||
      request.destination === 'style' ||
      request.destination === 'script') {
    event.respondWith(networkFirst(request));
    return;
  }

  // 기타 모든 요청은 캐시 우선
  event.respondWith(cacheFirst(request, RUNTIME_CACHE));
});

// 전략 1: 캐시 우선 (Cache First)
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    console.log('📦 캐시에서 로드:', request.url);
    return cached;
  }

  try {
    const response = await fetch(request);
    
    // 성공적인 응답만 캐시
    if (response && response.status === 200) {
      cache.put(request, response.clone());
      console.log('💾 새로 캐시:', request.url);
    }
    
    return response;
  } catch (error) {
    console.error('❌ 네트워크 & 캐시 실패:', request.url);
    
    // 오프라인 폴백 페이지
    if (request.destination === 'document') {
      return caches.match('/offline.html') || new Response('오프라인입니다', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    }
    
    throw error;
  }
}

// 전략 2: 네트워크 우선 (Network First)
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    
    // 성공적인 응답 캐시
    if (response && response.status === 200) {
      cache.put(request, response.clone());
      console.log('🔄 업데이트 & 캐시:', request.url);
    }
    
    return response;
  } catch (error) {
    console.log('📡 네트워크 실패, 캐시 확인:', request.url);
    
    const cached = await cache.match(request);
    
    if (cached) {
      console.log('📦 캐시에서 복구:', request.url);
      return cached;
    }
    
    // 오프라인 폴백
    if (request.destination === 'document') {
      return caches.match('/offline.html') || new Response('오프라인입니다', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    }
    
    throw error;
  }
}

// 메시지 이벤트: 캐시 수동 업데이트
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⚡ 즉시 활성화 요청');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_CLEAR') {
    console.log('🗑️  캐시 전체 삭제 요청');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// 백그라운드 동기화 (미래 기능)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts') {
    console.log('🔄 백그라운드 동기화 시작');
    event.waitUntil(syncPosts());
  }
});

async function syncPosts() {
  // 오프라인 시 작성한 게시글 동기화
  try {
    const db = await openDatabase();
    const posts = await db.getAll('pending-posts');
    
    for (const post of posts) {
      await fetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify(post)
      });
      await db.delete('pending-posts', post.id);
    }
    
    console.log('✅ 백그라운드 동기화 완료');
  } catch (error) {
    console.error('❌ 동기화 실패:', error);
  }
}

// 푸시 알림 (미래 기능)
self.addEventListener('push', (event) => {
  console.log('🔔 푸시 알림 수신');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || '애슬리트 타임';
  const options = {
    body: data.body || '새로운 알림이 있습니다',
    icon: '/public/icons/icon-192x192.png',
    badge: '/public/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || 1
    },
    actions: [
      {
        action: 'explore',
        title: '확인하기',
        icon: '/public/icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: '닫기'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 알림 클릭 이벤트
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 알림 클릭:', event.action);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('✅ Service Worker 로드 완료');
