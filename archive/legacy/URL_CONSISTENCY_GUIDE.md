# 🌐 URL 일관성 가이드

## 🚨 문제: 반복적인 하이픈 에러

**증상**: 프론트엔드가 백엔드에 연결하지 못해 흰 화면 또는 에러 발생

**근본 원인**: 
- 프론트엔드: `athlete-time` (하이픈 있음)
- 백엔드: `athletetime` (하이픈 없음)
- 이름 불일치로 인한 반복적인 실수

---

## ✅ 해결 방안

### 1. 중앙화된 상수 파일 (`config/constants.ts`)

모든 URL을 **한 곳**에서 관리합니다.

```typescript
// community-new/src/config/constants.ts

export const BACKEND_URL = 'https://athletetime-backend.onrender.com';
export const FRONTEND_URL = 'https://athlete-time.netlify.app';

export const getApiBaseUrl = () => {
  if (import.meta.env.PROD) {
    return BACKEND_URL;
  }
  // ... 개발 환경 자동 감지
};
```

**장점**:
- ✅ 한 곳만 수정하면 전체 적용
- ✅ 코드 전체에 URL 하드코딩 방지
- ✅ 타입 안전성 보장

### 2. 환경 변수 (`.env` 파일)

환경별로 다른 URL 설정 가능

**프로덕션** (`.env.production`):
```bash
VITE_API_BASE_URL=https://athletetime-backend.onrender.com
VITE_FRONTEND_URL=https://athlete-time.netlify.app
```

**개발** (`.env.development`):
```bash
VITE_API_BASE_URL=http://localhost:3005
VITE_FRONTEND_URL=http://localhost:5173
```

**장점**:
- ✅ 환경별 자동 전환
- ✅ 배포 시 설정 변경 불필요
- ✅ 민감한 정보 보호 (`.gitignore` 추가)

### 3. 자동 체크 스크립트 (`scripts/check-urls.js`)

잘못된 URL 패턴을 자동으로 찾아냅니다.

```bash
# 수동 실행
npm run check:urls

# 빌드 전 자동 실행 (package.json에 설정됨)
npm run build  # → 자동으로 check:urls 실행
```

**검출 패턴**:
- ❌ `athlete-time-backend` (잘못됨)
- ❌ `athletetime.netlify` (잘못됨)

**장점**:
- ✅ 배포 전 자동 검증
- ✅ 실수 사전 방지
- ✅ CI/CD 파이프라인 통합 가능

---

## 📋 올바른 URL 규칙 (반드시 암기!)

| 서비스 | URL | 하이픈 | 비고 |
|--------|-----|--------|------|
| **프론트엔드** | `athlete-time.netlify.app` | ✅ **있음** | Netlify 도메인 (변경 불가) |
| **백엔드** | `athletetime-backend.onrender.com` | ❌ **없음** | v3.0.0 신규 서비스 |
| **데이터베이스** | `athletetime-db` | ❌ **없음** | v3.0.0 신규 서비스 |
| **GitHub** | `github.com/hojune0330/athletetime` | ❌ **없음** | 원본 저장소 |

### 🧠 기억법

```
프론트엔드 = athlete-time (하이픈 O)
백엔드 = athletetime (하이픈 X)
```

**이유**:
- 프론트엔드는 기존 Netlify 도메인 유지 (변경 불가)
- 백엔드는 v3.0.0에서 신규 생성 (레거시 정리 후)

---

## 🛠️ 사용 방법

### API 호출 시

**❌ 직접 하드코딩 (나쁨)**:
```typescript
// 절대 이렇게 하지 마세요!
const response = await fetch('https://athlete-time-backend.onrender.com/api/posts');
```

**✅ 상수 파일 사용 (좋음)**:
```typescript
import { getApiBaseUrl, API_ENDPOINTS } from '@/config/constants';

const baseUrl = getApiBaseUrl();
const response = await fetch(`${baseUrl}${API_ENDPOINTS.POSTS.LIST}`);
```

**✅ API 클라이언트 사용 (최고)**:
```typescript
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/config/constants';

const response = await apiClient.get(API_ENDPOINTS.POSTS.LIST);
```

### 새로운 엔드포인트 추가

**`config/constants.ts`에 추가**:
```typescript
export const API_ENDPOINTS = {
  // ... 기존 코드
  
  // 새로운 엔드포인트
  ANALYTICS: {
    STATS: '/api/analytics/stats',
    EVENTS: '/api/analytics/events',
  },
} as const;
```

**사용**:
```typescript
import { API_ENDPOINTS } from '@/config/constants';
import { apiClient } from '@/api/client';

const stats = await apiClient.get(API_ENDPOINTS.ANALYTICS.STATS);
```

---

## 🔄 배포 워크플로우

### 1. 코드 수정
```bash
# constants.ts 또는 .env 파일 수정
```

### 2. URL 체크
```bash
npm run check:urls
```

### 3. 빌드
```bash
cd community-new
npm run build  # → 자동으로 check:urls 실행됨
```

### 4. 배포
```bash
# 빌드 결과를 community/ 폴더로 복사
cp -r community-new/dist/* community/

# _redirects 파일 복사 (SPA 라우팅)
cp community-new/dist/_redirects community/

# Git 커밋 및 푸시
git add .
git commit -m "deploy: update frontend"
git push origin main

# → Netlify 자동 배포
```

---

## 🧪 테스트 방법

### 로컬 테스트

```bash
# 백엔드 실행
npm run dev

# 프론트엔드 실행 (다른 터미널)
cd community-new
npm run dev

# 브라우저에서 확인
# http://localhost:5173/community
```

**확인 사항**:
- ✅ API 요청이 `http://localhost:3005`로 전송되는지
- ✅ 콘솔에 URL 관련 에러 없는지
- ✅ 데이터가 정상적으로 로드되는지

### 프로덕션 테스트

```bash
# 백엔드 헬스체크
curl https://athletetime-backend.onrender.com/health

# 프론트엔드 접속
# https://athlete-time.netlify.app/community

# 브라우저 개발자 도구 (F12) → Network 탭
# API 요청이 athletetime-backend.onrender.com으로 가는지 확인
```

---

## 🚫 금지 사항

### 절대로 하지 말 것

1. **❌ 코드에 URL 직접 작성**
   ```typescript
   // 절대 금지!
   fetch('https://athlete-time-backend.onrender.com/api/posts')
   ```

2. **❌ 여러 파일에 URL 중복 작성**
   ```typescript
   // api/posts.ts
   const BASE_URL = 'https://athletetime-backend.onrender.com';
   
   // api/comments.ts
   const BASE_URL = 'https://athletetime-backend.onrender.com';
   // → 한 곳만 수정하면 다른 곳은 오래된 URL 사용!
   ```

3. **❌ 하이픈 혼동**
   ```typescript
   // 잘못됨
   'athlete-time-backend.onrender.com'
   
   // 올바름
   'athletetime-backend.onrender.com'
   ```

4. **❌ 환경 변수 없이 배포**
   ```bash
   # .env.production 파일 없이 빌드하면
   # 기본값(로컬 URL)이 사용됨!
   ```

---

## 📚 파일 구조

```
/home/user/webapp/
├── community-new/
│   ├── src/
│   │   ├── config/
│   │   │   └── constants.ts          # ⭐ 모든 URL 정의
│   │   └── api/
│   │       └── client.ts             # constants.ts 사용
│   ├── .env.development              # 개발 환경 변수
│   └── .env.production               # 프로덕션 환경 변수
│
├── scripts/
│   └── check-urls.js                 # ⭐ URL 자동 체크
│
├── .env                              # 백엔드 환경 변수
├── package.json                      # check:urls 스크립트 정의
└── URL_CONSISTENCY_GUIDE.md         # 이 문서
```

---

## 🎯 체크리스트

새로운 기능 개발 시 확인:

- [ ] URL은 `constants.ts`에서만 관리하는가?
- [ ] 새로운 API 엔드포인트를 `API_ENDPOINTS`에 추가했는가?
- [ ] `npm run check:urls`를 실행했는가?
- [ ] 로컬 환경에서 테스트했는가?
- [ ] `.env.production`이 올바른 URL을 가지고 있는가?
- [ ] Git 커밋 전 `npm run build`를 실행했는가?

---

## 🔧 트러블슈팅

### 문제: 프론트엔드가 백엔드에 연결 안 됨

**증상**: 흰 화면, 콘솔에 404 에러

**해결**:
1. `constants.ts`의 `BACKEND_URL` 확인
   ```typescript
   export const BACKEND_URL = 'https://athletetime-backend.onrender.com';
   //                                  ^^^^^^^^^^^^
   //                                  하이픈 없음!
   ```

2. 빌드 다시 실행
   ```bash
   cd community-new
   npm run build
   cp -r dist/* ../community/
   ```

3. 재배포
   ```bash
   git add .
   git commit -m "fix: correct backend URL"
   git push origin main
   ```

### 문제: URL 체크 스크립트 실패

**증상**: `npm run check:urls` 실행 시 에러

**해결**:
1. 파일에서 `athlete-time-backend` 검색
2. `athletetime-backend`로 수정
3. 다시 실행

---

## 📞 추가 도움말

문제가 계속되면:
1. `URL_CONSISTENCY_GUIDE.md` (이 문서) 재확인
2. `community-new/src/config/constants.ts` 파일 점검
3. `npm run check:urls` 실행하여 자동 검증
4. 브라우저 개발자 도구 Network 탭에서 실제 요청 URL 확인

---

**이 가이드를 따르면 URL 관련 에러가 재발하지 않습니다!** ✨
