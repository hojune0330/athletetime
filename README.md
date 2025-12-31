# 🏃 Athlete Time - 육상 커뮤니티

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/hojune0330/athletetime)
[![Status](https://img.shields.io/badge/status-production-green.svg)](https://athlete-time.netlify.app/community)

> 익명 게시판에서 시작하여 회원 기반 커뮤니티로 성장하는 육상 전문 플랫폼

## 🌐 라이브 서비스

- **메인 페이지**: https://athlete-time.netlify.app/
- **커뮤니티**: https://athlete-time.netlify.app/community
- **백엔드 API**: https://athletetime-backend.onrender.com
- **GitHub**: https://github.com/hojune0330/athletetime

---

## 🚀 빠른 시작

### 백엔드 서버 실행

```bash
cd /home/user/webapp
npm install
npm start
```

### 프론트엔드 개발

```bash
cd /home/user/webapp/community-new
npm install
npm run dev
```

### 프로덕션 빌드 및 배포

```bash
# 1. React 앱 빌드
cd /home/user/webapp/community-new
npm run build

# 2. 빌드 파일을 루트로 복사
cd /home/user/webapp
rm -rf assets index.html _redirects vite.svg
cp -r community-new/dist/* .

# 3. Git 커밋 및 푸시
git add .
git commit -m "수정 내용"
git push origin main

# 4. Netlify 자동 배포 (1-2분 소요)
# https://athlete-time.netlify.app
```

---

## 📁 프로젝트 구조

```
/home/user/webapp/
├── server.js              # 🟢 통합 백엔드 (PostgreSQL + Cloudinary + WebSocket)
├── package.json           # 백엔드 의존성
├── index.html             # 메인 진입점 (React 빌드 결과)
├── assets/                # 빌드된 JS/CSS 파일
├── _redirects             # Netlify SPA 라우팅
│
├── database/              # 데이터베이스
│   ├── schema.sql        # PostgreSQL 스키마 (11 tables)
│   └── seed.js           # 초기 데이터
│
├── community-new/         # React 프론트엔드 소스
│   ├── src/              # 소스 코드
│   │   ├── pages/        # MainPage, CommunityPage, etc.
│   │   ├── components/   # Header, Layout, PostList, etc.
│   │   ├── hooks/        # React Query hooks
│   │   └── api/          # API 클라이언트
│   ├── dist/             # 빌드 결과 (Git에 커밋 안 됨)
│   └── package.json      # 프론트엔드 의존성
│
├── docs/                  # 📚 문서
│   ├── REACT_INTEGRATION_2025-12-15.md  # ⭐ React 통합 작업 문서
│   ├── DEPLOYMENT_COMPLETE_SUMMARY.md
│   ├── NEXT_STEPS.md
│   └── ...
│
└── archive/               # 🗄️ 구버전 백업
```

---

## 🛠️ 기술 스택

### 백엔드
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL (Render)
- **Storage**: Cloudinary CDN
- **Real-time**: WebSocket
- **Security**: bcrypt, Rate Limiting

### 프론트엔드
- **Framework**: React 19 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS
- **State**: React Query (TanStack Query)
- **Routing**: React Router v7
- **Icons**: Heroicons + Lucide React

### 배포
- **Frontend**: Netlify
- **Backend**: Render.com
- **Database**: Render PostgreSQL
- **CDN**: Cloudinary

---

## 📚 핵심 기능

### ✅ 현재 구현됨

1. **익명 게시판** 
   - 게시물 작성/수정/삭제
   - 카테고리별 분류
   - 이미지 업로드 (최대 5장, Cloudinary)
   - 댓글 시스템
   - 투표 (좋아요/싫어요)
   - 조회수 추적

2. **이미지 관리**
   - Cloudinary CDN 통합
   - 자동 최적화 (WebP 변환)
   - 썸네일 생성
   - 라이트박스 갤러리

3. **익명 사용자 시스템**
   - localStorage 기반 ID 추적
   - 투표 기록 저장
   - 회원 전환 기반 마련

4. **실시간 기능**
   - WebSocket 연결
   - 새 게시물/댓글 알림

### 🚧 개발 예정

1. **회원 시스템**
   - 닉네임 등록
   - 이메일 인증
   - 프로필 페이지

2. **커뮤니티 기능**
   - 사용자 팔로우
   - 내가 쓴 글/댓글
   - 랭킹 시스템

3. **검색 & 필터**
   - Full-text search (PostgreSQL tsvector)
   - 카테고리 필터
   - 정렬 옵션

---

## 🔧 환경 변수

### 백엔드 (.env)

```bash
# Database
DATABASE_URL=postgresql://...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Security
JWT_SECRET=your_jwt_secret
BCRYPT_ROUNDS=10

# CORS
FRONTEND_URL=https://athlete-time.netlify.app
CORS_ORIGIN=https://athlete-time.netlify.app

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_POSTS=5
RATE_LIMIT_MAX_COMMENTS=10
RATE_LIMIT_MAX_VOTES=50

# Server
NODE_ENV=production
PORT=10000
```

### 프론트엔드 (.env.production)

```bash
VITE_API_BASE_URL=https://athletetime-backend.onrender.com
```

---

## 🗄️ 데이터베이스

### 스키마

총 **11개 테이블**:
- `users` - 사용자 (익명 → 회원)
- `posts` - 게시물
- `categories` - 카테고리
- `comments` - 댓글
- `votes` - 투표
- `images` - 이미지 (Cloudinary)
- `reports` - 신고
- `blocks` - 차단
- `rate_limit_records` - Rate limiting
- `notifications` - 알림
- `user_sessions` - 세션

### 초기화

```bash
cd /home/user/webapp
npm run db:migrate  # 스키마 생성
npm run db:seed     # 초기 데이터
```

---

## 📖 문서

- **⭐ React 통합 작업 (2025-12-15)**: [`docs/REACT_INTEGRATION_2025-12-15.md`](./docs/REACT_INTEGRATION_2025-12-15.md)
- **프로젝트 구조**: [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md)
- **배포 가이드**: [`docs/NEXT_STEPS.md`](./docs/NEXT_STEPS.md)
- **전체 시스템**: [`docs/DEPLOYMENT_COMPLETE_SUMMARY.md`](./docs/DEPLOYMENT_COMPLETE_SUMMARY.md)
- **URL 정보**: [`docs/CRITICAL_URLS.md`](./docs/CRITICAL_URLS.md)

---

## 🤝 기여

이 프로젝트는 Claude (Sonnet)에 의해 완전히 재구축되었습니다.

### 개발 워크플로우

1. Feature branch 생성
2. 개발 및 테스트
3. Pull Request 생성
4. 리뷰 및 머지

---

## 📄 라이선스

MIT License

---

## 📞 지원

- **Issues**: https://github.com/hojune0330/athletetime/issues
- **Instagram**: @athlete_time

---

**Last Updated**: 2025-12-15  
**Version**: 4.0.0 (React Integration)  
**Status**: Production Ready
