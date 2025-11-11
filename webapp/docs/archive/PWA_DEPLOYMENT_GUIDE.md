# 🚀 애슬리트 타임 PWA 배포 가이드

> **프로덕션 환경에 바로 배포 가능한 완성도**
> 
> 이 문서는 실제 사용자들이 PWA 기능을 100% 활용할 수 있도록 배포하는 방법을 설명합니다.

---

## 📋 목차

1. [배포 전 체크리스트](#-배포-전-체크리스트)
2. [파일 구조 확인](#-파일-구조-확인)
3. [배포 방법 (플랫폼별)](#-배포-방법-플랫폼별)
4. [배포 후 검증](#-배포-후-검증)
5. [사용자 테스트 시나리오](#-사용자-테스트-시나리오)
6. [트러블슈팅](#-트러블슈팅)

---

## ✅ 배포 전 체크리스트

### 1. 필수 파일 확인

```bash
# 루트 디렉토리에 있어야 할 파일들
✅ manifest.json          # PWA 설정 파일
✅ sw.js                  # Service Worker
✅ pwa-register.js        # PWA 등록 스크립트
✅ offline.html           # 오프라인 대체 페이지
✅ icons/                 # 아이콘 폴더 (15개 아이콘)
   ├── icon-72x72.png
   ├── icon-96x96.png
   ├── icon-128x128.png
   ├── icon-144x144.png
   ├── icon-152x152.png
   ├── icon-192x192.png
   ├── icon-384x384.png
   ├── icon-512x512.png
   ├── apple-touch-icon.png
   ├── favicon-16x16.png
   ├── favicon-32x32.png
   ├── chat-icon.png
   ├── pace-icon.png
   ├── community-icon.png
   └── icon.svg
```

### 2. HTML 파일 PWA 태그 확인

모든 주요 HTML 파일에 다음이 포함되어 있는지 확인:

```html
<!-- PWA 메타 태그 -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#00ffa3">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="애슬리트 타임">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">

<!-- PWA 등록 스크립트 (</body> 직전) -->
<script src="/pwa-register.js"></script>
```

**확인할 파일들:**
- ✅ index.html
- ✅ chat.html
- ✅ pace-calculator.html
- ✅ training-calculator.html
- ✅ competitions-calendar.html

### 3. HTTPS 필수 확인

⚠️ **중요**: PWA는 HTTPS에서만 작동합니다!

```
✅ 프로덕션 도메인이 HTTPS인지 확인
✅ SSL 인증서가 유효한지 확인
❌ HTTP에서는 Service Worker가 등록되지 않습니다
```

---

## 📁 파일 구조 확인

### 올바른 디렉토리 구조

```
webapp/
├── index.html                 # 메인 페이지
├── chat.html                  # 채팅 페이지
├── pace-calculator.html       # 계산기 페이지
├── training-calculator.html   # 훈련 페이지
├── competitions-calendar.html # 대회 일정
│
├── manifest.json              # ✅ 루트에 위치
├── sw.js                      # ✅ 루트에 위치
├── pwa-register.js            # ✅ 루트에 위치
├── offline.html               # ✅ 루트에 위치
│
└── icons/                     # ✅ 루트의 icons 폴더
    ├── icon-*.png
    └── ...
```

### ❌ 잘못된 구조 (작동 안 함)

```
webapp/
└── public/                    # ❌ public 폴더에 있으면 안 됨
    ├── manifest.json          # ❌
    ├── sw.js                  # ❌
    └── icons/                 # ❌
```

---

## 🚢 배포 방법 (플랫폼별)

### 1️⃣ Netlify 배포

```bash
# 1. Netlify에 로그인
netlify login

# 2. 빌드 및 배포
netlify deploy --prod --dir=.

# 3. netlify.toml 설정 확인
```

**netlify.toml 예시:**
```toml
[build]
  publish = "."
  command = "echo 'No build required'"

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"
    Service-Worker-Allowed = "/"

[[headers]]
  for = "/manifest.json"
  [headers.values]
    Content-Type = "application/manifest+json"

[[headers]]
  for = "/icons/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 2️⃣ Vercel 배포

```bash
# 1. Vercel 로그인
vercel login

# 2. 배포
vercel --prod

# 3. vercel.json 설정
```

**vercel.json 예시:**
```json
{
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        },
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/manifest+json"
        }
      ]
    },
    {
      "source": "/icons/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 3️⃣ GitHub Pages 배포

```bash
# 1. GitHub Pages 활성화
# Settings > Pages > Source: main branch

# 2. CNAME 파일 생성 (커스텀 도메인 사용 시)
echo "yourdomain.com" > CNAME

# 3. Push
git add .
git commit -m "Deploy PWA to GitHub Pages"
git push origin main
```

### 4️⃣ 일반 호스팅 (cPanel, FTP 등)

```bash
# 1. 모든 파일 업로드
- HTML 파일들
- manifest.json
- sw.js
- pwa-register.js
- offline.html
- icons/ 폴더

# 2. .htaccess 설정 (Apache)
```

**.htaccess 예시:**
```apache
# HTTPS 강제
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Service Worker 헤더
<Files "sw.js">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
  Header set Service-Worker-Allowed "/"
</Files>

# Manifest 헤더
<Files "manifest.json">
  Header set Content-Type "application/manifest+json"
</Files>

# 아이콘 캐싱
<FilesMatch "\.(png|jpg|jpeg|svg|ico)$">
  Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
```

---

## 🔍 배포 후 검증

### 1. Chrome DevTools 검증

```
1. 사이트 접속
2. F12 (개발자 도구 열기)
3. Application 탭 선택
4. 왼쪽 메뉴에서 확인:
   
   ✅ Manifest
      - Name: "애슬리트 타임 - 육상인 커뮤니티"
      - Short name: "애슬리트 타임"
      - Theme color: #00ffa3
      - Icons: 15개 표시
      - Start URL: /
   
   ✅ Service Workers
      - Status: Activated and is running
      - Scope: https://yourdomain.com/
      - Source: sw.js
   
   ✅ Storage > Cache Storage
      - precache-v1
      - runtime-cache-v1
      - image-cache-v1
```

### 2. Lighthouse PWA 점수

```bash
# Chrome DevTools > Lighthouse 탭
1. Categories: Performance, PWA 선택
2. Device: Mobile
3. "Generate report" 클릭

목표 점수:
✅ PWA: 100/100
✅ Performance: 90+/100
✅ Accessibility: 90+/100
```

### 3. PWA 설치 가능 여부 확인

#### Android Chrome:
```
✅ 주소창 오른쪽에 "설치" 아이콘 표시
✅ 설치 배너 자동 표시 (2-3초 후)
✅ 메뉴 > "홈 화면에 추가" 옵션 활성화
```

#### iOS Safari:
```
✅ 상단에 iOS 설치 배너 표시
✅ 공유 버튼 > "홈 화면에 추가" 활성화
✅ 앱 아이콘 정상 표시
```

#### Desktop Chrome/Edge:
```
✅ 주소창 오른쪽에 설치 아이콘
✅ 오른쪽 하단에 "앱 설치" 버튼 표시
✅ 설치 후 독립 창으로 실행
```

### 4. 콘솔 로그 확인

```javascript
// 정상 작동 시 콘솔 메시지:
✅ PWA 등록 스크립트 로드 완료
✅ Service Worker 등록 성공: https://yourdomain.com/
🔄 새 버전 발견! (첫 설치 시)

// 오류가 없어야 함:
❌ Failed to register service worker
❌ Manifest: Line X, column Y, Syntax error
❌ Failed to load resource: net::ERR_FILE_NOT_FOUND
```

---

## 👤 사용자 테스트 시나리오

### 시나리오 1: Android 사용자 (Chrome)

```
1. 사이트 접속
   https://yourdomain.com

2. 2-3초 대기
   → 오른쪽 하단에 "앱 설치" 버튼 등장 (그라데이션 효과)

3. "앱 설치" 버튼 클릭
   → 설치 확인 다이얼로그 표시
   → "설치" 클릭

4. 홈 화면 확인
   → "애슬리트 타임" 아이콘 생성됨

5. 아이콘 터치
   → 전체 화면으로 앱 실행 (주소창 없음)
   → 빠른 로딩 (0.1초)

6. 오프라인 테스트
   → 비행기 모드 켜기
   → 앱 실행
   → 캐시된 페이지 정상 표시
   → "오프라인 모드" 토스트 메시지
```

### 시나리오 2: iOS 사용자 (Safari)

```
1. 사이트 접속
   https://yourdomain.com

2. 2초 대기
   → 상단에 초록색 배너 등장
   → 내용: "Safari 하단 공유버튼 → 홈 화면에 추가"

3. 공유 버튼 탭 (하단 중앙 □↑)
   → 메뉴 스크롤
   → "홈 화면에 추가" 선택

4. 이름 확인 후 "추가" 탭
   → 홈 화면에 아이콘 생성

5. 아이콘 터치
   → Safari 없이 독립 앱으로 실행
   → 상태바 색상: 그라데이션
   → 전체 화면 모드
```

### 시나리오 3: Desktop 사용자 (Chrome/Edge)

```
1. 사이트 접속
   https://yourdomain.com

2. 주소창 오른쪽 확인
   → 💻 설치 아이콘 표시

3. 설치 아이콘 클릭
   → "애슬리트 타임을 설치하시겠습니까?"
   → "설치" 버튼 클릭

4. 독립 앱 창 생성
   → 브라우저와 별도로 실행
   → 바탕화면 바로가기 생성
   → 작업 표시줄 고정 가능

5. 앱처럼 사용
   → 브라우저 탭과 분리
   → Alt+Tab으로 전환 가능
   → 작업 표시줄에 별도 아이콘
```

---

## 🐛 트러블슈팅

### 문제 1: "설치" 버튼이 표시되지 않음

**원인:**
- ❌ HTTP로 접속 (HTTPS 필수)
- ❌ manifest.json 경로 오류
- ❌ 이미 설치됨
- ❌ 브라우저가 PWA 지원 안 함

**해결:**
```bash
# 1. HTTPS 확인
curl -I https://yourdomain.com | grep HTTP

# 2. manifest.json 접근 확인
curl https://yourdomain.com/manifest.json

# 3. 콘솔 오류 확인
F12 > Console 탭

# 4. 캐시 초기화
Application > Clear storage > Clear site data

# 5. 재접속
```

### 문제 2: Service Worker 등록 실패

**원인:**
- ❌ sw.js 파일 경로 오류
- ❌ CORS 문제
- ❌ 파일 권한 문제

**해결:**
```bash
# 1. sw.js 직접 접근 테스트
curl https://yourdomain.com/sw.js

# 2. 응답 헤더 확인
curl -I https://yourdomain.com/sw.js
# Content-Type: application/javascript 여야 함

# 3. Service Worker 재등록
navigator.serviceWorker.getRegistrations()
  .then(registrations => {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
location.reload();
```

### 문제 3: 아이콘이 표시되지 않음

**원인:**
- ❌ 아이콘 파일 경로 오류
- ❌ 파일 크기 불일치
- ❌ manifest.json 경로 오류

**해결:**
```bash
# 1. 아이콘 파일 확인
ls -lh icons/
# 모든 아이콘 파일 존재 확인

# 2. manifest.json 검증
cat manifest.json | jq .icons
# 모든 아이콘 경로 확인

# 3. 직접 접근 테스트
curl -I https://yourdomain.com/icons/icon-192x192.png
# HTTP 200 응답 확인

# 4. 캐시 초기화 후 재설치
```

### 문제 4: 오프라인에서 작동하지 않음

**원인:**
- ❌ Service Worker 미등록
- ❌ 캐시 전략 오류
- ❌ 네트워크 요청 차단

**해결:**
```javascript
// 1. Service Worker 상태 확인
navigator.serviceWorker.getRegistration()
  .then(reg => console.log('SW Status:', reg));

// 2. 캐시 확인
caches.keys().then(names => console.log('Caches:', names));

// 3. 특정 URL 캐시 확인
caches.open('precache-v1').then(cache => {
  cache.match('/').then(response => {
    console.log('Cached:', response ? 'Yes' : 'No');
  });
});
```

### 문제 5: iOS에서 전체 화면 모드 안 됨

**원인:**
- ❌ apple-mobile-web-app-capable 태그 누락
- ❌ manifest.json display 설정 오류

**해결:**
```html
<!-- HTML에 추가 -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
```

```json
// manifest.json 확인
{
  "display": "standalone",  // ← 이 값 확인
  "theme_color": "#00ffa3",
  "background_color": "#0f0f0f"
}
```

---

## 📊 성능 최적화 팁

### 1. Service Worker 버전 관리

```javascript
// sw.js에서 버전 업데이트 시:
const VERSION = 'v2.0.0';  // ← 변경 시 자동 업데이트
const PRECACHE = `precache-${VERSION}`;
```

### 2. 캐시 크기 제한

```javascript
// sw.js에서 캐시 크기 제한:
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxItems);
  }
}

// 이미지 캐시 제한 (최대 50개)
limitCacheSize('image-cache-v1', 50);
```

### 3. 배너 표시 빈도 조절

```javascript
// pwa-register.js에서:
const hoursPassed = (Date.now() - dismissTime) / (1000 * 60 * 60);
if (hoursPassed < 24) {  // ← 24시간 대신 72시간으로 변경 가능
  return;
}
```

---

## 🎯 배포 완료 확인

### 최종 체크리스트

```
✅ HTTPS 접속 가능
✅ manifest.json 접근 가능 (200 OK)
✅ sw.js 접근 가능 (200 OK)
✅ pwa-register.js 접근 가능 (200 OK)
✅ 모든 아이콘 접근 가능 (200 OK)
✅ Service Worker 등록 성공 (콘솔 확인)
✅ Lighthouse PWA 점수 100/100
✅ Android Chrome 설치 버튼 표시
✅ iOS Safari 설치 배너 표시
✅ Desktop Chrome 설치 아이콘 표시
✅ 설치 후 독립 앱으로 실행
✅ 오프라인 모드 정상 작동
✅ 캐시 전략 정상 작동
✅ 업데이트 알림 정상 작동
```

---

## 🚀 사용자에게 공지하기

배포 완료 후 사용자들에게 공지할 메시지 예시:

```markdown
# 🎉 애슬리트 타임 앱이 출시되었습니다!

이제 **홈 화면에 설치**하여 앱처럼 사용하세요!

## 📱 설치 방법

### Android
1. 사이트 접속
2. "앱 설치" 버튼 클릭
3. 홈 화면 아이콘 터치

### iOS
1. 사이트 접속
2. 공유 버튼(□↑) → "홈 화면에 추가"
3. 홈 화면 아이콘 터치

## ✨ 장점
- ⚡ 빠른 실행 (0.1초)
- 📡 오프라인에서도 사용 가능
- 📱 앱처럼 전체 화면
- 💾 데이터 절약
- 🔄 자동 업데이트

**지금 바로 설치하세요!**
```

---

## 📚 추가 자료

### 공식 문서
- [PWA 기준 (Google)](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

### 테스트 도구
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [PWA Builder](https://www.pwabuilder.com/)
- [WebPageTest](https://www.webpagetest.org/)

---

**✅ 배포 준비 완료!**

이 가이드대로 배포하면 사용자들이 즉시 PWA 기능을 활용할 수 있습니다.

문제 발생 시 트러블슈팅 섹션을 참고하세요! 🚀
