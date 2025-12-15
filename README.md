# 🏃 Athlete Time - 육상 커뮤니티

[![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)](https://github.com/hojune0330/athletetime)
[![Status](https://img.shields.io/badge/status-production-green.svg)](https://athlete-time.netlify.app)

> 익명 게시판에서 시작하여 회원 기반 커뮤니티로 성장하는 육상 전문 플랫폼

## 🌐 라이브 서비스

- **프론트엔드**: https://athlete-time.netlify.app
- **백엔드 API**: https://athletetime-backend.onrender.com
- **GitHub**: https://github.com/hojune0330/athletetime

---

## 📁 프로젝트 구조 (Monorepo)

```
/home/user/webapp/
├── frontend/              # ⚛️ React 프론트엔드
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/         # 페이지 컴포넌트
│   │   │   ├── PaceCalculatorPage/
│   │   │   ├── TrainingCalculatorPage/
│   │   │   ├── ChatPage/
│   │   │   ├── CommunityPage.tsx
│   │   │   └── ...
│   │   ├── components/    # 공통 컴포넌트
│   │   ├── hooks/         # 커스텀 훅
│   │   ├── api/           # API 클라이언트
│   │   └── context/       # React Context
│   ├── dist/              # 빌드 결과물
│   └── package.json
│
├── backend/               # 🟢 Node.js 백엔드
│   ├── server.js          # 메인 서버
│   ├── routes/            # API 라우터
│   ├── middleware/        # 미들웨어
│   ├── utils/             # 유틸리티
│   ├── database/          # DB 스키마 & 마이그레이션
│   ├── auth/              # 인증 관련
│   └── package.json
│
├── docs/                  # 📚 문서
├── archive/               # 🗄️ 레거시 파일 보관
│   ├── legacy-html/       # 기존 HTML 파일들
│   ├── legacy-assets/     # 기존 CSS/JS 파일들
│   └── community/         # 기존 빌드 파일
│
├── netlify.toml           # Netlify 배포 설정
└── README.md
```

---

## 🚀 빠른 시작

### 프론트엔드 개발

```bash
cd frontend
npm install
npm run dev
```

### 백엔드 개발

```bash
cd backend
npm install
npm run dev
```

### 프로덕션 빌드

```bash
# 프론트엔드 빌드
cd frontend
npm run build

# 백엔드는 Render.com에서 자동 배포
```

---

## 🛠️ 기술 스택

### 프론트엔드 (`/frontend`)
- **Framework**: React 19 + TypeScript
- **Build**: Vite 7
- **Styling**: Tailwind CSS
- **State**: React Query (TanStack Query)
- **Routing**: React Router v7
- **Deploy**: Netlify

### 백엔드 (`/backend`)
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL (Render)
- **Storage**: Cloudinary CDN
- **Real-time**: WebSocket
- **Deploy**: Render.com

---

## 📚 핵심 기능

### ✅ 페이지 (React 컴포넌트)

| 페이지 | 경로 | 설명 |
|--------|------|------|
| 메인 | `/` | 랜딩 페이지 |
| 페이스 계산기 | `/pace-calculator` | 러닝 페이스 차트, 트랙 레인 계산 |
| 훈련 계산기 | `/training-calculator` | VDOT 기반 훈련 계획 |
| 실시간 채팅 | `/chat` | WebSocket 채팅 |
| 커뮤니티 | `/community` | 익명 게시판 |

### ✅ API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/health` | 헬스체크 |
| GET | `/api/categories` | 카테고리 목록 |
| GET | `/api/posts` | 게시글 목록 |
| POST | `/api/posts` | 게시글 작성 |
| GET | `/api/posts/:id` | 게시글 상세 |
| POST | `/api/posts/:id/comments` | 댓글 작성 |
| POST | `/api/posts/:id/vote` | 투표 |

---

## 🔧 환경 변수

### 백엔드 (`backend/.env`)

```bash
DATABASE_URL=postgresql://...
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
JWT_SECRET=xxx
NODE_ENV=production
PORT=10000
```

### 프론트엔드 (`frontend/.env.production`)

```bash
VITE_API_BASE_URL=https://athletetime-backend.onrender.com
```

---

## 🚢 배포

### 프론트엔드 (Netlify)

`netlify.toml` 설정:
```toml
[build]
  base = "frontend"
  command = "npm ci && npm run build"
  publish = "dist"
```

### 백엔드 (Render.com)

- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

> ⚠️ **중요**: Render.com 대시보드에서 "Root Directory"를 `backend`로 설정해야 합니다.
> 설정 방법: Render Dashboard → Service → Settings → Root Directory → `backend` 입력

---

## 📖 문서

- [배포 가이드](./docs/NEXT_STEPS.md)
- [전체 시스템 요약](./docs/DEPLOYMENT_COMPLETE_SUMMARY.md)

---

**Last Updated**: 2025-12-15  
**Version**: 4.0.0  
**Status**: Production Ready - Full React Integration + Monorepo Structure
