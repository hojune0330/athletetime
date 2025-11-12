# 📝 Changelog

All notable changes to this project will be documented in this file.

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
