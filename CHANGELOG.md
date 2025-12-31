# 📝 Changelog

All notable changes to this project will be documented in this file.

---

## [4.0.0] - 2025-12-15

### 🎉 Major Release - React Integration

전체 애플리케이션을 Single Page Application(SPA)으로 통합하고 UI를 간소화했습니다.

#### ✨ Added

**새로운 페이지**
- `MainPage.tsx` - 메인 랜딩 페이지 (Hero, 기능 카드)
- `CommunityPage.tsx` - 익명 게시판 (HomePage 이름 변경)
- `PaceCalculatorPage.tsx` - 페이스 계산기 (임시)
- `TrainingCalculatorPage.tsx` - 훈련 계산기 (임시)
- `ChatPage.tsx` - 실시간 채팅 (임시)

**라우팅 통합**
- React Router 기반 SPA 구조
- `/` - 메인 페이지
- `/community` - 커뮤니티
- `/pace-calculator` - 페이스 계산기
- `/training-calculator` - 훈련 계산기
- `/chat` - 채팅

**Netlify 설정**
- `_redirects` 파일 추가 (SPA 라우팅)
- CSP 업데이트 (FontAwesome, WebSocket 허용)

#### 🔧 Changed

**UI 간소화**
- 좌측 사이드바 제거
- 우측 배너/광고 영역 제거
- 실시간 인기 태그 제거
- 메인 컨텐츠 중심 레이아웃

**배포 프로세스**
- Netlify 자체 빌드 비활성화
- Git 커밋된 빌드 파일 사용
- 배포 속도 개선 (3-5분 → 1-2분)

**Header 개선**
- `goToMain()` 함수 React Router 사용 (`navigate('/')`)
- 일관된 SPA 네비게이션

**Vite 설정**
- `base: '/community/'` → `base: '/'`
- 루트 경로 배포

#### 🐛 Fixed

**CSP 이슈**
- FontAwesome 폰트 로드 실패 해결
- WebSocket 연결 차단 해결
- 외부 CDN 스크립트 허용

**배포 불일치**
- Netlify 빌드 캐시 문제 해결
- 로컬-라이브 빌드 일관성 보장

#### 📚 Documentation

- `docs/REACT_INTEGRATION_2025-12-15.md` 추가
- `README.md` 업데이트
- `CHANGELOG.md` 업데이트

#### 🔗 Commits

```
43ed31d fix(netlify): 빌드 명령 수정 - 커밋된 빌드 파일 사용
cf008a0 build: Netlify 빌드 캐시 무효화
f7da8d8 refactor(ui): UI 정리 - 메인 이동 경로 수정 및 불필요한 UI 제거
c062fe0 fix(netlify): FontAwesome 폰트 로드를 위한 CSP 수정
6410273 fix(netlify): CSP 설정 업데이트 - 필요한 CDN 및 WebSocket 허용
83bbf91 feat: 계산기 및 채팅 페이지 React 통합
cf8fcd6 feat: React 통합 - 메인 페이지, 커뮤니티, 라우팅 전체 구조 개편
```

---

## [3.0.0] - 2025-10-29

### 🎉 Major Release - Complete System Rebuild

이 버전은 Claude (Sonnet)에 의해 처음부터 완전히 재구축되었습니다.

#### ✨ Added

**Backend**
- PostgreSQL 데이터베이스 통합 (11 tables, 20+ indexes)
- Cloudinary 이미지 CDN (최대 5장, 자동 최적화)
- WebSocket 실시간 알림 시스템
- 익명 사용자 추적 시스템 (anonymous_id)
- 회원 전환 기반 구조
- bcrypt 비밀번호 해싱
- Rate limiting 준비
- 트랜잭션 기반 게시물 생성
- Full-text search 지원 (tsvector)

**Frontend**
- React 19 + TypeScript 완전 재작성
- Vite 빌드 시스템
- Tailwind CSS 스타일링
- React Query (TanStack Query) 상태 관리
- 이미지 업로더 컴포넌트 (드래그앤드롭)
- 이미지 갤러리 (라이트박스)
- 익명 사용자 ID 관리 (localStorage)
- 투표 기록 추적
- 반응형 디자인

**Database Schema**
- `users` - 사용자 테이블
- `posts` - 게시물
- `categories` - 카테고리
- `comments` - 댓글
- `votes` - 투표
- `images` - Cloudinary 이미지
- `reports` - 신고
- `blocks` - 차단
- `rate_limit_records` - Rate limiting
- `notifications` - 알림
- `user_sessions` - 세션

**API Endpoints**
- `GET /health` - Health check
- `GET /api/categories` - 카테고리 목록
- `GET /api/posts` - 게시물 목록
- `GET /api/posts/:id` - 게시물 상세
- `POST /api/posts` - 게시물 작성 (multipart/form-data)
- `PUT /api/posts/:id` - 게시물 수정
- `DELETE /api/posts/:id` - 게시물 삭제
- `POST /api/posts/:id/comments` - 댓글 작성
- `POST /api/posts/:id/vote` - 투표

**Documentation**
- `README.md` - 프로젝트 개요
- `PROJECT_STRUCTURE.md` - 프로젝트 구조
- `CHANGELOG.md` - 변경 이력
- `docs/DEPLOYMENT_COMPLETE_SUMMARY.md` - 전체 시스템 설명
- `docs/NEXT_STEPS.md` - 배포 가이드
- `docs/CRITICAL_URLS.md` - URL 정보

#### 🔄 Changed
- JSON 파일 기반 → PostgreSQL 데이터베이스
- Base64 이미지 → Cloudinary CDN
- 단일 HTML 페이지 → React SPA
- 수동 상태 관리 → React Query
- 인라인 CSS → Tailwind CSS

#### 🗑️ Removed
- 구버전 JSON 서버 코드
- Base64 이미지 저장
- 레거시 HTML 페이지들
- 사용하지 않는 스크립트 파일들

#### 🏗️ Infrastructure
- **Backend**: Render.com (https://athletetime-backend.onrender.com)
- **Frontend**: Netlify (https://athlete-time.netlify.app/community)
- **Database**: Render PostgreSQL
- **CDN**: Cloudinary
- **Version Control**: GitHub

---

## [2.x] - 2025-10 (Legacy)

### 이전 버전들
이전 버전들은 JSON 파일 기반 백엔드와 단일 HTML 페이지로 구성되었습니다.
모든 레거시 코드는 `archive/` 폴더에 보관되어 있습니다.

---

## 📌 Notes

### 버전 번호 규칙
- Major (X.0.0) - 호환되지 않는 API 변경
- Minor (0.X.0) - 하위 호환되는 기능 추가
- Patch (0.0.X) - 하위 호환되는 버그 수정

### 배포 환경
- **Production**: v3.0.0 (배포 대기)
- **Development**: v3.0.0

---

**마지막 업데이트**: 2025-10-29
