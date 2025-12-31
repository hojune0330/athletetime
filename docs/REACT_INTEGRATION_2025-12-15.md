# React 통합 및 UI 개선 작업 (2025-12-15)

## 📋 작업 개요

기존 정적 HTML 페이지들을 React 기반 Single Page Application(SPA)으로 통합하고, UI를 간소화하는 작업을 완료했습니다.

---

## 🎯 작업 목표

1. **전체 애플리케이션 React 통합**: 메인, 커뮤니티, 계산기, 채팅을 하나의 React 앱으로 통합
2. **라우팅 통합**: React Router를 사용한 SPA 방식으로 전환
3. **UI 간소화**: 불필요한 사이드바, 배너, 태그 제거

---

## ✅ 완료된 작업

### 1. React 페이지 구조 변경

#### 1.1 메인 페이지 생성
- **파일**: `community-new/src/pages/MainPage.tsx`
- **경로**: `/`
- **특징**:
  - Hero 섹션 (로고, 타이틀, 서브타이틀)
  - 기능 카드 그리드 (6개)
  - CTA 버튼 (페이스 계산기, 커뮤니티)
  - 레이아웃 없음 (풀스크린)

#### 1.2 커뮤니티 페이지 분리
- **변경**: `HomePage.tsx` → `CommunityPage.tsx`
- **경로**: `/community`
- **특징**:
  - 익명 게시판 기능 유지
  - 레이아웃 포함 (Header, Footer)

#### 1.3 계산기 페이지 생성
- **파일**: 
  - `PaceCalculatorPage.tsx` (페이스 계산기)
  - `TrainingCalculatorPage.tsx` (훈련 계산기)
- **경로**: `/pace-calculator`, `/training-calculator`
- **구현**: 
  - 임시 페이지 (Coming Soon)
  - 기존 HTML 페이지로 리다이렉트 링크 제공

#### 1.4 채팅 페이지 생성
- **파일**: `ChatPage.tsx`
- **경로**: `/chat`
- **구현**: 
  - 임시 페이지 (Coming Soon)
  - 기존 HTML 페이지로 리다이렉트 링크 제공

---

### 2. 라우팅 구조 변경

#### 2.1 App.tsx 업데이트

**이전**:
```tsx
<Route path="/" element={<Layout />}>
  <Route index element={<HomePage />} />
  <Route path="community" element={<CommunityPage />} />
  ...
</Route>
```

**현재**:
```tsx
{/* 메인 페이지 (레이아웃 없음) */}
<Route path="/" element={<MainPage />} />

{/* 계산기 페이지 (레이아웃 포함) */}
<Route path="/pace-calculator" element={<Layout />}>
  <Route index element={<PaceCalculatorPage />} />
</Route>
<Route path="/training-calculator" element={<Layout />}>
  <Route index element={<TrainingCalculatorPage />} />
</Route>

{/* 채팅 페이지 (레이아웃 포함) */}
<Route path="/chat" element={<Layout />}>
  <Route index element={<ChatPage />} />
</Route>

{/* 커뮤니티 페이지 (레이아웃 포함) */}
<Route path="/community" element={<Layout />}>
  <Route index element={<CommunityPage />} />
  <Route path="post/:postId" element={<PostDetailPage />} />
  <Route path="write" element={<WritePage />} />
  ...
</Route>
```

#### 2.2 Vite 설정 변경

**파일**: `community-new/vite.config.ts`

**변경**:
```diff
- base: '/community/',
+ base: '/',
```

#### 2.3 _redirects 파일 생성

**파일**: `community-new/public/_redirects`

```
# SPA Routing - Community Section
/community/* /index.html 200

# SPA Routing - All other paths
/* /index.html 200
```

---

### 3. UI 간소화

#### 3.1 Header.tsx 수정
- **변경**: `goToMain()` 함수 경로 수정
  ```tsx
  // 이전
  const goToMain = () => {
    window.location.href = '/index.html'
  }
  
  // 현재
  const goToMain = () => {
    navigate('/')
  }
  ```

#### 3.2 Layout.tsx 수정
- **변경**: 좌측 사이드바 및 우측 배너 주석 처리

```tsx
{/* 좌측 사이드바 */}
{/* <aside className="hidden lg:block w-64 shrink-0">
  <Sidebar />
</aside> */}

{/* 메인 컨텐츠 */}
<main className="flex-1 min-w-0">
  <Outlet />
</main>

{/* 우측 배너/광고 영역 */}
{/* <aside className="hidden xl:block w-72 shrink-0">
  <RightBanner />
</aside> */}
```
---

## 📂 현재 라우팅 구조

```
/ (MainPage - 레이아웃 없음)
├── /community (CommunityPage - 레이아웃 포함)
│   ├── /community/post/:postId (PostDetailPage)
│   ├── /community/write (WritePage)
│   └── /community/best (CommunityPage)
│
├── /pace-calculator (PaceCalculatorPage - 레이아웃 포함)
├── /training-calculator (TrainingCalculatorPage - 레이아웃 포함)
├── /chat (ChatPage - 레이아웃 포함)
│
├── /register (RegisterPage - 레이아웃 없음)
├── /login (LoginPage - 레이아웃 없음)
└── /verify-email (VerifyEmailPage - 레이아웃 없음)

# 레거시 HTML 페이지 (기존 기능 유지)
├── /pace-calculator.html (Netlify redirect)
├── /training-calculator.html (Netlify redirect)
└── /chat.html (Netlify redirect)
```

---

## 🔧 주요 파일 변경 이력

### 생성된 파일
- `community-new/src/pages/MainPage.tsx`
- `community-new/src/pages/CommunityPage.tsx`
- `community-new/src/pages/PaceCalculatorPage.tsx`
- `community-new/src/pages/TrainingCalculatorPage.tsx`
- `community-new/src/pages/ChatPage.tsx`
- `community-new/public/_redirects`

### 수정된 파일
- `community-new/src/App.tsx` (라우팅 구조 변경)
- `community-new/src/components/layout/Header.tsx` (goToMain 수정)
- `community-new/src/components/layout/Layout.tsx` (사이드바/배너 주석)
- `community-new/vite.config.ts` (base 경로 변경)
- `community-new/index.html` (타이틀, FontAwesome 추가)
- `netlify.toml` (빌드 명령 변경, CSP 수정)

### 삭제 예정 파일 (미래 작업)
- `pace-calculator.html`
- `training-calculator.html`
- `chat.html`
- `index.html` (정적 버전)

---

## 📊 성능 개선

### 빌드 최적화
- **번들 크기**: 
  - `index.js`: 297.01 KB (gzip: 82.92 KB)
  - `vendor.js`: 44.76 KB (gzip: 16.10 KB)
  - `query.js`: 71.70 KB (gzip: 24.93 KB)
  - `index.css`: 42.39 KB (gzip: 7.45 KB)

### 배포 속도
- **이전**: 3-5분 (Netlify 빌드 포함)
- **현재**: 1-2분 (빌드 없이 파일만 배포)

---

## 🐛 해결된 문제

### 1. FontAwesome 아이콘 로드 실패
- **문제**: CSP에서 FontAwesome 폰트 차단
- **해결**: `font-src`에 `https:` 와일드카드 추가

### 2. Netlify 빌드 불일치
- **문제**: 로컬과 Netlify 빌드 결과가 다름
- **해결**: Netlify 빌드 비활성화, Git 커밋 파일 사용

### 3. 라우팅 경로 불일치
- **문제**: `/community` base path 문제
- **해결**: Vite base를 `/`로 변경, `_redirects` 추가

---

## 🔄 업데이트 (2025-12-31)

### 1. 실시간 채팅 기능 구현

#### 1.1 WebSocket 기반 채팅 시스템
- **파일**: `frontend/src/pages/ChatPage/`
- **경로**: `/chat`
- **특징**:
  - WebSocket 실시간 연결 (`wss://athletetime-backend.onrender.com`)
  - 채팅방 4개 (자유게시판, 훈련, 대회, 부상)
  - 방별 채팅 히스토리 (메모리, 최대 50개)
  - 점진적 재연결 로직 (3s → 6s → 9s → 12s → 15s, 최대 5회)
  - 연결 상태 3단계 UI (연결됨/연결 중/연결 끊김)

#### 1.2 닉네임 관리
- **중복 체크 API**: `GET /api/chat/check-nickname?nickname=xxx`
- **sessionStorage 저장**: `chat_nickname`, `chat_user_id`
- **자동 입장**: 페이지 이동 후 재방문 시 닉네임 모달 없이 바로 입장
- **익명성 보장**: 탭/브라우저 닫으면 초기화

#### 1.3 중복 접속 처리
- 같은 닉네임으로 여러 탭 접속 시 1명으로 카운트
- 첫 번째 연결 시에만 입장 알림
- 마지막 연결 해제 시에만 퇴장 알림

---

### 2. 채팅 UI/UX 개선

#### 2.1 레이아웃 변경
- **변경**: Layout 래퍼 유지하면서 채팅 영역 전체 높이 사용
  ```tsx
  <div style={{ height: 'calc(100vh - 64px)' }}>
  ```

#### 2.2 z-index 조정
- 헤더: `z-50`
- 모바일 사이드바: `z-40`
- 데스크톱 사이드바: `z-0`

#### 2.3 고정 영역 처리
- 헤더/입력창: `flex-shrink-0`으로 고정
- 메시지 영역: `flex-1 overflow-y-auto`로 스크롤

#### 2.4 모바일 개선
- 홈 버튼 제거 (헤더에 이미 존재)
- 채팅방 전환 버튼 헤더로 이동
- 오버레이 클릭 시 사이드바 닫힘

---

### 3. GNB 및 메인페이지 연동

#### 3.1 메인페이지 변경
- **파일**: `MainPage.tsx`
- **변경**: 실시간 채팅 카드 활성화 ("준비중" 뱃지 제거)
  ```tsx
  // 이전
  { onClick: () => showComingSoon('실시간 채팅'), available: false }
  
  // 현재
  { link: '/chat', available: true }
  ```

#### 3.2 Header.tsx 변경
- **변경**: GNB에 "💭 실시간 채팅" 메뉴 추가
  ```tsx
  const navItems = [
    { path: '/community', label: '💬 익명 커뮤니티' },
    { path: '/pace-calculator', label: '⏱️ 페이스 계산기' },
    { path: '/training-calculator', label: '💪 훈련 계산기' },
    { path: '/competitions', label: '🏆 경기 결과' },
    { path: '/chat', label: '💭 실시간 채팅' },  // 추가
  ]
  ```

---

### 4. 커뮤니티 페이지 개선

#### 4.1 정렬 버튼 분리
- **이전**: PageHeader 내부
- **현재**: 글 목록 우측 상단
  ```tsx
  <div className="flex justify-end mb-4">
    <div className="flex gap-2">
      <button>최신순</button>
      <button>인기순</button>
      <button>댓글순</button>
    </div>
  </div>
  ```

#### 4.2 관리자 글쓰기
- **닉네임 readonly**: 관리자는 마이페이지 닉네임 자동 적용
- **UI 표시**: 회색 배경 + "🛡️ 관리자" 뱃지
  ```tsx
  <input
    value={isAdmin ? user?.nickname : newPost.author}
    readOnly={isAdmin}
    className={isAdmin ? 'bg-neutral-100 cursor-not-allowed' : ''}
  />
  ```

---

### 5. 모바일 햄버거 메뉴 개선

#### 5.1 사용자 버튼 스타일 변경
- **이전**: 선택된 페이지와 동일한 스타일 (`bg-primary-50`)
- **현재**: 테두리 스타일 (`border border-neutral-200`)
  ```tsx
  <Link
    to="/profile"
    className="border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
  >
    <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full">
      {user.nickname.charAt(0)}
    </div>
    <span>{user.nickname}</span>
    <span>내 프로필 →</span>
  </Link>
  ```

---

## 📂 업데이트된 라우팅 구조 (2025-12-31)

```
/ (MainPage - 레이아웃 없음)
├── /community (CommunityPage - 레이아웃 포함)
│   ├── /community/post/:postId (PostDetailPage)
│   ├── /community/write (WritePage)
│   └── /community/best (CommunityPage)
│
├── /pace-calculator (PaceCalculatorPage - 레이아웃 포함)
├── /training-calculator (TrainingCalculatorPage - 레이아웃 포함)
├── /competitions (CompetitionsPage - 레이아웃 포함)
├── /chat (ChatPage - 레이아웃 포함) ← 구현 완료
│
├── /register (RegisterPage - 레이아웃 없음)
├── /login (LoginPage - 레이아웃 없음)
├── /verify-email (VerifyEmailPage - 레이아웃 없음)
└── /profile (ProfilePage - 레이아웃 없음)
```

---

## 🔧 추가된 파일 (2025-12-31)

### 프론트엔드
- `frontend/src/pages/ChatPage/index.tsx`
- `frontend/src/pages/ChatPage/components/ChatHeader.tsx`
- `frontend/src/pages/ChatPage/components/MessageList.tsx`
- `frontend/src/pages/ChatPage/components/MessageInput.tsx`
- `frontend/src/pages/ChatPage/components/RoomSidebar.tsx`
- `frontend/src/pages/ChatPage/components/NicknameModal.tsx`
- `frontend/src/pages/ChatPage/hooks/useChat.ts`
- `frontend/src/pages/ChatPage/hooks/useWebSocket.ts`
- `frontend/src/pages/ChatPage/types/index.ts`
- `frontend/src/pages/ChatPage/styles/chat.css`

### 백엔드
- `backend/utils/websocket.js` (기존 파일 수정)
- `backend/server.js` (닉네임 체크 API 추가)

---

## 🐛 해결된 문제 (2025-12-31)

### 1. WebSocket URL 오류
- **문제**: `wss://athlete-time-backend.onrender.com` (하이픈 오류)
- **해결**: `wss://athletetime-backend.onrender.com` (하이픈 제거)

### 2. 메시지 중복 전송
- **문제**: 방 이동 후 메시지가 여러 개 전송됨
- **해결**: `useCallback` 의존성 최적화, `useRef`로 최신 값 참조

### 3. 사이드바 z-index
- **문제**: 사이드바가 헤더 위로 올라감
- **해결**: 헤더 `z-50`, 사이드바 `z-40`으로 조정

### 4. 모바일 메뉴 스타일
- **문제**: 사용자 버튼이 선택된 페이지와 동일하게 보임
- **해결**: 테두리 스타일로 변경하여 구분

---

**작성일**: 2025-12-15
**최종 업데이트**: 2025-12-31