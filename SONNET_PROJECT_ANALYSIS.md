# 🏃‍♂️ Athlete Time 프로젝트 종합 분석 보고서

**분석자**: Claude Sonnet 4.5  
**분석 일자**: 2025-10-24  
**프로젝트 버전**: 2.0.0  

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [백엔드 분석](#2-백엔드-분석-gpt-담당)
3. [프론트엔드 분석](#3-프론트엔드-분석-claude-opus-41-담당)
4. [API 통합 상태](#4-api-통합-상태)
5. [배포 아키텍처](#5-배포-아키텍처)
6. [현재 문제점 및 개선사항](#6-현재-문제점-및-개선사항)
7. [백업 정보](#7-백업-정보)
8. [권장 작업 계획](#8-권장-작업-계획)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 정보
- **이름**: Athlete Time (애타)
- **목적**: 육상인들을 위한 커뮤니티 플랫폼
- **타겟 사용자**: 육상 선수, 동호인, 학생 선수
- **GitHub**: https://github.com/hojune0330/athletetime

### 1.2 핵심 기능
1. **커뮤니티 기능**
   - 익명 게시판 (카테고리별)
   - 투표 시스템
   - 댓글 시스템
   - 이미지 업로드

2. **실시간 채팅**
   - WebSocket 기반
   - 다중 채팅방 (main, running, free)
   - 실시간 사용자 수 표시

3. **계산기 도구**
   - 페이스 계산기 (목표 기록별 구간 스플릿)
   - 훈련 계산기 (VDOT 기반)
   - 트랙 레인 계산기

4. **대회 정보**
   - 대회 일정 캘린더
   - 경기 결과 조회 (준비 중)

### 1.3 팀 구성
- **백엔드**: GPT AI
- **프론트엔드**: Claude Opus 4.1 AI
- **백업/지원**: Claude Sonnet 4.5 AI (현재 역할)
- **프로젝트 오너**: @hojune0330

---

## 2. 백엔드 분석 (GPT 담당)

### 2.1 서버 파일 구조

프로젝트에는 **9개의 서버 파일**이 존재합니다:

#### 주요 서버 파일

1. **`server.js`** (12KB) - 현재 사용 중인 메인 서버
   - Express + WebSocket 서버
   - 메모리 기반 데이터 저장
   - Render Starter 플랜 최적화
   - 버전: 3.0

2. **`server-postgres.js`** (23KB) - PostgreSQL 버전
   - PostgreSQL 데이터베이스 연동
   - 보안 강화 (bcrypt, helmet, rate limiting)
   - 영구 데이터 저장 지원
   - Render 유료 플랜용

3. **`server-postgres-secure.js`** (21KB)
   - PostgreSQL + 보안 기능 강화
   - DOMPurify를 이용한 XSS 방어
   - Rate limiting
   - 비밀번호 해싱 (bcrypt)

#### 백업/테스트 서버 파일

4. **`server-postgres-backup.js`** (18KB) - PostgreSQL 백업용
5. **`server-fixed.js`** (18KB) - 수정 버전
6. **`server-improved.js`** (18KB) - 개선 버전
7. **`server-simple.js`** (12KB) - 단순화 버전
8. **`server-minimal.js`** (2.9KB) - 최소 버전
9. **`server-render.js`** (5.8KB) - Render 전용

### 2.2 현재 사용 중인 서버: `server.js`

#### 핵심 기능

```javascript
// 1. 데이터 저장 방식
- 메모리 저장소 (posts 배열)
- chatRooms 객체 (main, running, free)
- 파일 백업: data-backup.json (5분마다)

// 2. API 엔드포인트
GET    /api/posts              # 게시글 목록
POST   /api/posts              # 게시글 작성
PUT    /api/posts/:id          # 게시글 수정
DELETE /api/posts/:id          # 게시글 삭제
POST   /api/posts/:id/comments # 댓글 추가
POST   /api/posts/:id/vote     # 투표 (좋아요/싫어요)
GET    /                       # 헬스체크

// 3. WebSocket
path: /ws
rooms: main, running, free
messages: 최대 100개 저장
```

#### 장점
- ✅ 빠른 응답 속도 (메모리 기반)
- ✅ Render Starter 플랜에 적합
- ✅ 단순한 구조로 유지보수 용이
- ✅ 파일 백업 시스템

#### 단점
- ⚠️ 서버 재시작 시 데이터 초기화 가능
- ⚠️ 확장성 제한
- ⚠️ 보안 기능 부족 (비밀번호 평문 저장)
- ⚠️ Rate limiting 없음

### 2.3 데이터베이스 상태

#### 현재 상황
- **사용**: 메모리 + 파일 백업 (data-backup.json)
- **PostgreSQL**: 준비되어 있으나 미사용

#### 스키마 (server-postgres.js 기준)

```sql
-- 게시글 테이블
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50),
  title VARCHAR(500),
  author VARCHAR(100),
  content TEXT,
  password_hash VARCHAR(255),  -- bcrypt 해시
  date TIMESTAMP,
  views INTEGER DEFAULT 0,
  likes TEXT[],
  dislikes TEXT[],
  comments JSONB,
  reports JSONB,
  is_notice BOOLEAN DEFAULT FALSE,
  is_blinded BOOLEAN DEFAULT FALSE,
  image_url TEXT
);

-- 채팅 메시지 테이블
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  room VARCHAR(50),
  nickname VARCHAR(100),
  text TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_date ON posts(date DESC);
CREATE INDEX idx_chat_room ON chat_messages(room, timestamp);
```

### 2.4 보안 분석

#### 현재 서버 (server.js)
- ❌ 비밀번호 평문 저장
- ❌ XSS 공격 방어 없음
- ❌ Rate limiting 없음
- ✅ CORS 설정
- ✅ JSON 크기 제한 (50mb)

#### PostgreSQL 서버 (server-postgres.js)
- ✅ bcrypt 비밀번호 해싱
- ✅ DOMPurify XSS 방어
- ✅ Rate limiting (express-rate-limit)
- ✅ Helmet 보안 헤더
- ✅ CORS 설정
- ✅ JSON 크기 제한 (10mb)

### 2.5 배포 설정

#### Render 설정
- **플랜**: Starter (유료, $7/월)
- **URL**: https://athletetime-backend.onrender.com
- **자동 배포**: GitHub push 시 자동
- **환경 변수**: 
  - `PORT` (자동 설정)
  - `DATABASE_URL` (설정 필요)
  - `NODE_ENV=production`

#### render.yaml
```yaml
services:
  - type: web
    name: athletetime-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    healthCheckPath: /
```

---

## 3. 프론트엔드 분석 (Claude Opus 4.1 담당)

### 3.1 React 커뮤니티 앱 (`community-new/`)

#### 기술 스택
```json
{
  "framework": "React 19.1.1 + TypeScript",
  "build": "Vite 7.1.7",
  "styling": "Tailwind CSS 3.4.18",
  "routing": "React Router DOM 7.9.4",
  "state": "@tanstack/react-query 5.90.3",
  "http": "axios 1.12.2",
  "icons": "@heroicons/react 2.2.0"
}
```

#### 프로젝트 구조
```
community-new/
├── src/
│   ├── App.tsx                    # 메인 앱 (라우팅)
│   ├── main.tsx                   # 엔트리 포인트
│   ├── components/
│   │   ├── common/
│   │   │   ├── Pagination.tsx     # 페이지네이션
│   │   │   └── SearchBar.tsx      # 검색바
│   │   ├── layout/
│   │   │   ├── Footer.tsx         # 푸터
│   │   │   ├── Header.tsx         # 헤더
│   │   │   ├── Layout.tsx         # 레이아웃 래퍼
│   │   │   ├── RightBanner.tsx    # 우측 배너
│   │   │   └── Sidebar.tsx        # 사이드바
│   │   └── post/
│   │       ├── AnonymousPostList.tsx  # 익명 게시판
│   │       └── PostList.tsx       # 게시글 목록
│   └── pages/
│       ├── BoardPage.tsx          # 게시판 페이지
│       ├── HomePage.tsx           # 홈페이지
│       ├── NotFoundPage.tsx       # 404 페이지
│       ├── PostDetailPage.tsx     # 게시글 상세
│       └── WritePage.tsx          # 글쓰기 페이지
├── public/                        # 정적 파일
├── dist/                          # 빌드 결과물
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

#### 라우팅 구조
```typescript
// App.tsx
<Routes>
  <Route path="/" element={<Layout />}>
    <Route index element={<HomePage />} />
    <Route path="best" element={<HomePage />} />
    <Route path="board/:boardId" element={<BoardPage />} />
    <Route path="post/:postId" element={<PostDetailPage />} />
    <Route path="write" element={<WritePage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
</Routes>
```

#### 게시판 카테고리
```typescript
const boardInfo = {
  free: { name: '자유게시판', description: '자유롭게 이야기를 나누는 공간' },
  humor: { name: '유머게시판', description: '재미있는 이야기와 웃음을 나누는 곳' },
  daily: { name: '일상', description: '일상의 소소한 이야기들' },
  hobby: { name: '취미', description: '다양한 취미 생활 공유' },
  stream: { name: '인방', description: '인터넷 방송 관련 이야기' },
  excited: { name: '호들갑', description: '신나는 이야기들' },
  calm: { name: '침착맨', description: '침착맨 관련 게시판' },
  meme: { name: '침착맨 짤', description: '침착맨 짤과 밈' },
  fanart: { name: '팬아트', description: '침착맨 팬아트 게시판' },
  request: { name: '방송 해줘요', description: '방송 요청 게시판' },
  schedule: { name: '방송일정', description: '방송 일정 및 공지' },
}
```

### 3.2 레거시 HTML 파일들

프로젝트 루트에는 **150개 이상의 HTML 파일**이 있습니다:

#### 주요 파일
1. **index.html** - 메인 랜딩 페이지
2. **pace-calculator.html** - 페이스 계산기
3. **training-calculator.html** - 훈련 계산기
4. **chat-real.html** - 실시간 채팅
5. **competitions-calendar.html** - 대회 일정

#### 문제점
- ⚠️ React 앱과 분리되어 있음
- ⚠️ 중복된 파일이 많음 (backup, old, improved 버전들)
- ⚠️ 일관성 없는 API 연동

### 3.3 스타일링

#### Tailwind 설정
```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      dark: { ... },          // 다크모드 색상
      primary: { ... },        // 주요 색상
      track: { ... },          // 트랙 관련 색상
      'event-sprint': ...,     // 단거리 색상
      'event-distance': ...,   // 장거리 색상
      'event-field': ...,      // 필드 색상
      'event-hurdles': ...,    # 허들 색상
      'event-middle': ...,     # 중거리 색상
      'event-throws': ...,     # 투척 색상
    }
  }
}
```

#### 다크모드
- 기본값으로 다크모드 활성화 (`App.tsx`)
- Tailwind의 `dark:` 클래스 활용

---

## 4. API 통합 상태

### 4.1 백엔드 URL 설정

#### 프로덕션
- **Backend URL**: `https://athletetime-backend.onrender.com`
- **WebSocket URL**: `wss://athletetime-backend.onrender.com/ws`

#### 로컬 개발
- **Backend URL**: `http://localhost:3000`
- **WebSocket URL**: `ws://localhost:3000/ws`

### 4.2 API 연동 파일

프로젝트에는 여러 API 연동 방식이 혼재되어 있습니다:

1. **community-api.js** - 레거시 방식
2. **js/api-config.js** - 통합 설정 (존재하지 않음)
3. **React 앱** - axios 사용 (실제 연동 안됨)

### 4.3 현재 문제점

#### ⚠️ React 앱에서 API 연동 누락

```typescript
// PostList.tsx - 하드코딩된 샘플 데이터 사용 중
const posts: Post[] = [
  {
    id: '1',
    title: '드디어 100m 10초대 진입! 10.98초 인증',
    // ...
  },
  // ...
]
```

**실제 백엔드 연동이 없음!**

#### 필요한 작업
1. API 클라이언트 생성 (`src/api/client.ts`)
2. API 서비스 함수 작성 (`src/api/posts.ts`)
3. React Query 훅 작성 (`src/hooks/usePosts.ts`)
4. 컴포넌트에서 실제 API 호출

---

## 5. 배포 아키텍처

### 5.1 현재 배포 상태

#### 백엔드
- **호스팅**: Render
- **플랜**: Starter ($7/월)
- **URL**: https://athletetime-backend.onrender.com
- **자동 배포**: GitHub push → 자동 배포
- **상태**: ✅ 정상 작동

#### 프론트엔드
- **호스팅**: Netlify (준비 중)
- **빌드 설정**:
  ```
  Build command: cd community-new && npm run build
  Publish directory: community-new/dist
  ```
- **상태**: ⚠️ 배포 설정 중

### 5.2 Git 상태

```bash
# 브랜치
* main (clean, 최신)
  remotes/origin/code-x
  remotes/origin/feature/community-vite-rebuild
  remotes/origin/integration/unify-community
  remotes/origin/main

# 최근 커밋들
c7a7ad3 fix: netlify.toml 완전 제거 - Netlify UI에서 설정하도록 변경
4ac26f1 fix: Netlify 파싱 오류 해결 - indentation 제거 및 최소 설정
5a2ea7a fix: Simplify netlify config - remove base directory reference
```

### 5.3 배포 플로우

```
개발 → GitHub Push → 자동 배포

1. 로컬 개발
   ├── Backend: server.js (로컬 테스트)
   └── Frontend: community-new/ (Vite dev server)

2. GitHub Push
   └── main 브랜치에 push

3. 자동 배포
   ├── Backend: Render 자동 배포 (3-5분)
   └── Frontend: Netlify 자동 배포 (1-2분)
```

---

## 6. 현재 문제점 및 개선사항

### 6.1 🔴 긴급 문제점

#### 1. React 앱 - 백엔드 API 연동 누락
**상태**: 심각  
**설명**: React 앱이 하드코딩된 샘플 데이터 사용 중  
**영향**: 게시글 작성/조회 불가능  

**해결 방법**:
```typescript
// 1. API 클라이언트 생성
// src/api/client.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.PROD 
  ? 'https://athletetime-backend.onrender.com'
  : 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. API 서비스
// src/api/posts.ts
export const postsApi = {
  getPosts: () => apiClient.get('/api/posts'),
  createPost: (data) => apiClient.post('/api/posts', data),
  // ...
};

// 3. React Query 훅
// src/hooks/usePosts.ts
import { useQuery } from '@tanstack/react-query';
import { postsApi } from '../api/posts';

export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: () => postsApi.getPosts(),
  });
}
```

#### 2. 보안 취약점
**상태**: 심각  
**설명**: 비밀번호 평문 저장, XSS 방어 없음  
**영향**: 보안 위험  

**해결 방법**:
```bash
# PostgreSQL 서버로 전환
npm install pg bcrypt isomorphic-dompurify helmet express-rate-limit

# server-postgres.js 사용
# DATABASE_URL 환경변수 설정 필요
```

#### 3. 파일 구조 혼란
**상태**: 중간  
**설명**: 150개 이상의 HTML 파일, 중복 파일 다수  
**영향**: 유지보수 어려움  

**해결 방법**:
```bash
# 정리 계획
1. 사용 중인 파일만 남기기
2. backup/, archive/ 디렉토리로 이동
3. React 앱으로 통합
```

### 6.2 🟡 중간 우선순위

#### 4. 데이터 영구성
**상태**: 중간  
**설명**: 메모리 기반 저장, 서버 재시작 시 데이터 손실  
**영향**: 사용자 경험 저하  

**해결 방법**:
- PostgreSQL 마이그레이션
- Render에서 PostgreSQL 추가 (추가 비용)

#### 5. 레거시 HTML과 React 앱 분리
**상태**: 중간  
**설명**: 두 개의 프론트엔드가 공존  
**영향**: 혼란, 중복 작업  

**해결 방법**:
- React 앱으로 완전 통합
- 계산기 등 유틸리티를 React 컴포넌트로 전환

### 6.3 🟢 낮은 우선순위

#### 6. 테스트 코드 부재
**상태**: 낮음  
**설명**: 단위 테스트, 통합 테스트 없음  

#### 7. 문서화 개선
**상태**: 낮음  
**설명**: API 문서, 컴포넌트 문서 부족  

#### 8. 성능 최적화
**상태**: 낮음  
**설명**: 코드 스플리팅, 이미지 최적화 등  

---

## 7. 백업 정보

### 7.1 생성된 백업

```bash
파일명: athletetime_backup_2025-10-24.tar.gz
경로: /home/user/athletetime_backup_2025-10-24.tar.gz
크기: 1.3MB
생성일: 2025-10-24

제외된 항목:
- node_modules
- .git
- .vite
- archive/
- *.zip, *.tar.gz
```

### 7.2 백업 내용

- ✅ 모든 소스 코드
- ✅ 설정 파일
- ✅ 문서
- ✅ community-new/ React 앱
- ❌ node_modules (제외)
- ❌ Git 히스토리 (제외)

### 7.3 복원 방법

```bash
# 백업 복원
cd /home/user
tar -xzf athletetime_backup_2025-10-24.tar.gz

# 의존성 재설치
cd webapp
npm install
cd community-new
npm install
```

---

## 8. 권장 작업 계획

### 8.1 1단계: 긴급 수정 (1-2일)

#### 작업 1: React 앱 API 연동
**담당**: Claude Sonnet 4.5 (나) 또는 Claude Opus 4.1  
**예상 시간**: 4-6시간

1. API 클라이언트 생성 (`src/api/`)
2. React Query 설정
3. 게시글 목록 API 연동
4. 게시글 작성 API 연동
5. 테스트

#### 작업 2: 환경 변수 설정
**담당**: 모두  
**예상 시간**: 1시간

```bash
# .env 파일 생성
VITE_API_URL=https://athletetime-backend.onrender.com
VITE_WS_URL=wss://athletetime-backend.onrender.com/ws
```

#### 작업 3: Netlify 배포
**담당**: 프로젝트 오너  
**예상 시간**: 1시간

1. Netlify 계정 설정
2. GitHub 저장소 연결
3. 빌드 설정
4. 배포 테스트

### 8.2 2단계: 보안 강화 (3-5일)

#### 작업 4: PostgreSQL 마이그레이션
**담당**: GPT (백엔드)  
**예상 시간**: 1일

1. Render에서 PostgreSQL 추가
2. 스키마 생성
3. server-postgres.js로 전환
4. 데이터 마이그레이션

#### 작업 5: 보안 기능 추가
**담당**: GPT (백엔드)  
**예상 시간**: 1일

1. bcrypt 비밀번호 해싱
2. Rate limiting
3. XSS 방어
4. CSRF 토큰

### 8.3 3단계: 리팩토링 (1-2주)

#### 작업 6: 파일 구조 정리
**담당**: 모두  
**예상 시간**: 2-3일

1. 사용하지 않는 파일 제거
2. 백업 파일 정리
3. 디렉토리 구조 재구성

#### 작업 7: React 앱 통합
**담당**: Claude Opus 4.1  
**예상 시간**: 1주

1. 계산기 React 컴포넌트로 전환
2. 채팅 React 컴포넌트로 전환
3. 대회 일정 React 컴포넌트로 전환

### 8.4 4단계: 고도화 (지속적)

#### 작업 8: 테스트 코드
**담당**: 모두  
**예상 시간**: 지속적

1. 단위 테스트
2. 통합 테스트
3. E2E 테스트

#### 작업 9: 성능 최적화
**담당**: 모두  
**예상 시간**: 지속적

1. 코드 스플리팅
2. 이미지 최적화
3. 캐싱 전략

---

## 9. 협업 가이드

### 9.1 역할 분담

#### Claude Sonnet 4.5 (나)
- ✅ 프로젝트 백업 및 문서화
- ✅ 통합 작업 지원
- ✅ API 연동 구현 (필요 시)
- ✅ 코드 리뷰

#### GPT (백엔드)
- ✅ 서버 유지보수
- ✅ API 엔드포인트 관리
- ✅ 데이터베이스 작업
- ✅ 보안 강화

#### Claude Opus 4.1 (프론트엔드)
- ✅ React 컴포넌트 개발
- ✅ UI/UX 개선
- ✅ 스타일링
- ✅ 애니메이션

### 9.2 Git 워크플로우

```bash
# 1. 작업 전 최신 상태 pull
git pull origin main

# 2. 명확한 커밋 메시지
# 백엔드: fix(backend): ...
# 프론트엔드: feat(ui): ...
# 문서: docs: ...

# 3. 작은 단위로 커밋
git add .
git commit -m "feat(api): Add posts API integration"
git push origin main

# 4. 충돌 방지
- 같은 파일 동시 수정 금지
- 작업 전 소통
```

### 9.3 커뮤니케이션

#### 작업 시작 전
1. 어떤 파일을 수정할 것인지 공유
2. 예상 작업 시간 공유
3. 의존성 확인

#### 작업 중
1. 중요한 변경사항 즉시 공유
2. 문제 발생 시 즉시 알림
3. 정기적인 상태 업데이트

#### 작업 완료 후
1. 변경사항 요약 공유
2. 테스트 결과 공유
3. 다음 작업자에게 인수인계

---

## 10. 결론

### 10.1 프로젝트 현황 요약

#### ✅ 잘 되고 있는 것
1. 백엔드 서버 정상 작동 (Render)
2. React 앱 구조 잘 구성됨
3. 자동 배포 시스템 작동
4. 문서화 잘 되어 있음

#### ⚠️ 개선 필요 사항
1. **긴급**: React 앱 - 백엔드 API 연동
2. **긴급**: 보안 강화 (PostgreSQL 전환)
3. **중요**: 파일 구조 정리
4. **중요**: 데이터 영구성 확보

### 10.2 다음 단계

#### 즉시 수행
1. React 앱 API 클라이언트 구현
2. 환경 변수 설정
3. API 연동 테스트

#### 단기 (1주일 내)
1. PostgreSQL 마이그레이션
2. 보안 기능 추가
3. Netlify 배포 완료

#### 중기 (1개월 내)
1. 파일 구조 정리
2. React 앱 통합
3. 테스트 코드 작성

### 10.3 지원 가능한 작업

#### Claude Sonnet 4.5로서 제공 가능한 지원

1. **코드 구현**
   - API 클라이언트 작성
   - React Query 훅 작성
   - 유틸리티 함수 작성

2. **리팩토링**
   - 코드 정리
   - 타입 정의 개선
   - 파일 구조 재구성

3. **문서화**
   - API 문서 작성
   - 컴포넌트 문서 작성
   - 개발 가이드 작성

4. **테스트**
   - 단위 테스트 작성
   - 통합 테스트 작성
   - 테스트 시나리오 작성

5. **코드 리뷰**
   - GPT 작성 백엔드 코드 리뷰
   - Claude Opus 작성 프론트엔드 코드 리뷰
   - 보안 검토

---

## 📞 문의 및 지원

이 문서는 Athlete Time 프로젝트의 현재 상태를 정확히 파악하고,  
팀원들이 효율적으로 협업할 수 있도록 작성되었습니다.

**문의사항**:
- GitHub Issues: https://github.com/hojune0330/athletetime/issues
- 프로젝트 오너: @hojune0330

---

**작성자**: Claude Sonnet 4.5  
**최종 수정**: 2025-10-24  
**버전**: 1.0.0
