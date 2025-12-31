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

**작성일**: 2025-12-15