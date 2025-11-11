# 🏃 Athlete Time - 육상 커뮤니티 플랫폼

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/hojune0330/athletetime)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-production-success.svg)](https://athlete-time.netlify.app)

**프로덕션 레벨 익명 게시판 + 육상 트레이닝 도구**

---

## 📋 목차

- [소개](#-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [빠른 시작](#-빠른-시작)
- [배포](#-배포)
- [개발](#-개발)
- [문서](#-문서)

---

## 🎯 소개

Athlete Time은 육상 선수들을 위한 종합 플랫폼입니다:

1. **익명 커뮤니티** - PostgreSQL + Cloudinary + WebSocket
2. **페이스 계산기** - Jack Daniels VDOT 기반
3. **트레이닝 계산기** - 훈련 페이스 추천
4. **대회 캘린더** - 국내 육상 대회 정보

### 현재 버전: 3.0.0 (2025-10-29)

- ✅ PostgreSQL 데이터베이스
- ✅ Cloudinary 이미지 CDN
- ✅ WebSocket 실시간 알림
- ✅ 익명 → 회원 마이그레이션 지원
- ✅ React + TypeScript 프론트엔드

---

## ✨ 주요 기능

### 1. 익명 게시판 (Community)

**핵심 기능**:
- 📝 게시물 작성 (최대 5장 이미지)
- 💬 댓글 시스템
- 👍 투표 (좋아요/싫어요)
- 🔍 검색 & 필터링 (준비됨)
- 🔔 실시간 알림 (WebSocket)

**회원 시스템 기반**:
- 익명 사용자 ID 추적 (`anonymous_id`)
- 향후 닉네임 등록 → 회원 가입 전환 지원
- 사용자 히스토리 (작성 글/댓글)
- 프로필 시스템 준비

**기술**:
- Backend: Node.js + PostgreSQL
- Frontend: React + TypeScript
- Images: Cloudinary CDN
- Real-time: WebSocket

### 2. 페이스 계산기

**기능**:
- Jack Daniels VDOT 기반 정확한 계산
- 거리별 예상 기록
- 트레이닝 페이스 추천
- 모바일 최적화

### 3. 트레이닝 계산기

**기능**:
- Easy/Long/Marathon/Threshold/Interval/Repetition 페이스
- 거리별 훈련 시간
- VDOT 자동 계산
- 맞춤형 훈련 계획

### 4. 대회 캘린더

**기능**:
- 국내 육상 대회 일정
- 대회 상세 정보
- 참가 신청 링크
- 월별 필터링

---

## 🛠️ 기술 스택

### Backend

```
Node.js 18+
├── Express.js          # Web framework
├── PostgreSQL          # Database
├── Cloudinary          # Image CDN
├── WebSocket (ws)      # Real-time
├── bcryptjs            # Password hashing
├── multer              # File upload
└── pg                  # PostgreSQL client
```

### Frontend

```
React 19+
├── TypeScript          # Type safety
├── React Router        # Navigation
├── React Query         # Data fetching
├── Axios               # HTTP client
├── Tailwind CSS        # Styling
└── Vite                # Build tool
```

### Infrastructure

```
Production
├── Backend: Render.com (PostgreSQL)
├── Frontend: Netlify
├── Images: Cloudinary
├── Domain: athlete-time.netlify.app
└── Database: PostgreSQL 14+
```

---

## 📁 프로젝트 구조

```
/home/user/webapp/
├── 📄 README.md                    # 이 파일
├── 📄 DEPLOYMENT_COMPLETE_SUMMARY.md  # 배포 가이드
├── 📄 NEXT_STEPS.md                # 다음 단계
├── 📄 CRITICAL_URLS.md             # 중요 URL 정리
│
├── 📄 server.js                    # 백엔드 v3.0.0
├── 📄 package.json                 # Node.js 의존성
│
├── 📁 database/                    # 데이터베이스
│   ├── schema.sql                  # PostgreSQL 스키마
│   └── seed.js                     # 초기 데이터
│
├── 📁 community-new/               # 프론트엔드 (React)
│   ├── src/
│   │   ├── api/                    # API 클라이언트
│   │   ├── components/             # React 컴포넌트
│   │   ├── hooks/                  # Custom hooks
│   │   ├── pages/                  # 페이지
│   │   ├── types/                  # TypeScript 타입
│   │   └── utils/                  # 유틸리티
│   ├── dist/                       # 빌드 결과
│   └── package.json
│
├── 📁 community/                   # 배포용 (dist 복사)
│
├── 📁 docs/                        # 문서 아카이브
│   ├── deployment/
│   ├── development/
│   └── archive/                    # 구 문서들
│
├── 📁 archive/                     # 히스토리 보관
│   ├── old-servers/
│   ├── old-html/
│   └── backup-files/
│
└── 📁 scripts/                     # 유틸리티 스크립트
    ├── deploy.sh
    └── db-reset.sh
```

---

## 🚀 빠른 시작

### 1. 저장소 클론

```bash
git clone https://github.com/hojune0330/athletetime.git
cd athletetime
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일 편집 (DATABASE_URL, CLOUDINARY 등)
```

### 3. 백엔드 실행

```bash
# 의존성 설치
npm install

# 데이터베이스 마이그레이션
npm run db:migrate

# 초기 데이터 생성
npm run db:seed

# 서버 시작
npm start
```

### 4. 프론트엔드 실행

```bash
cd community-new

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev

# 빌드
npm run build
```

---

## 📦 배포

### Backend (Render.com)

1. **환경 변수 설정** (15개 필요)
   - `DATABASE_URL`
   - `CLOUDINARY_*` (3개)
   - `FRONTEND_URL`
   - 기타 (자세한 내용은 [DEPLOYMENT_COMPLETE_SUMMARY.md](DEPLOYMENT_COMPLETE_SUMMARY.md) 참고)

2. **수동 배포**
   - Render Dashboard → Manual Deploy

3. **검증**
   ```bash
   curl https://athletetime-backend.onrender.com/health
   # "version": "3.0.0" 확인
   ```

### Frontend (Netlify)

1. **GitHub 푸시**
   ```bash
   git push origin main
   ```

2. **자동 배포**
   - Netlify가 자동으로 감지하고 배포

3. **확인**
   - https://athlete-time.netlify.app/community

**자세한 배포 가이드**: [DEPLOYMENT_COMPLETE_SUMMARY.md](DEPLOYMENT_COMPLETE_SUMMARY.md)

---

## 🔧 개발

### 백엔드 개발

```bash
# 개발 모드 (nodemon)
npm run dev

# 데이터베이스 리셋
npm run db:reset

# 테스트 API
curl http://localhost:3005/health
curl http://localhost:3005/api/posts
```

### 프론트엔드 개발

```bash
cd community-new

# 개발 서버
npm run dev

# 타입 체크
npm run type-check

# 빌드 (TypeScript 체크 포함)
npm run build:check
```

### 코드 구조

#### 백엔드 주요 엔드포인트

- `GET /health` - Health check
- `GET /api/categories` - 카테고리 목록
- `GET /api/posts` - 게시물 목록
- `GET /api/posts/:id` - 게시물 상세
- `POST /api/posts` - 게시물 작성 (multipart/form-data)
- `POST /api/posts/:id/comments` - 댓글 작성
- `POST /api/posts/:id/vote` - 투표

#### 프론트엔드 주요 컴포넌트

- `WritePage.tsx` - 게시물 작성 (이미지 업로드)
- `PostDetailPage.tsx` - 게시물 상세 (댓글, 투표)
- `ImageUploader.tsx` - 이미지 드래그앤드롭 업로더
- `ImageGallery.tsx` - 이미지 라이트박스 갤러리
- `anonymousUser.ts` - 익명 사용자 관리

---

## 📚 문서

### 핵심 문서

- **[README.md](README.md)** ← 이 파일
- **[DEPLOYMENT_COMPLETE_SUMMARY.md](DEPLOYMENT_COMPLETE_SUMMARY.md)** - 전체 시스템 설명서
- **[NEXT_STEPS.md](NEXT_STEPS.md)** - 배포 다음 단계
- **[CRITICAL_URLS.md](CRITICAL_URLS.md)** - 중요 URL 정리
- **[CLEANUP_PLAN.md](CLEANUP_PLAN.md)** - 프로젝트 정리 계획

### 아카이브 문서

- `docs/archive/` - 구 문서들 (참고용)

---

## 🎯 향후 계획

### 단기 (1-2주)
- [ ] WebSocket 클라이언트 통합
- [ ] 사용자 히스토리 페이지
- [ ] 검색 기능 구현
- [ ] 프로필 시스템 기초

### 중기 (1-2개월)
- [ ] 닉네임 등록 시스템
- [ ] 회원 가입 플로우
- [ ] 이메일 인증
- [ ] 비밀번호 재설정

### 장기 (3-6개월)
- [ ] 사용자 프로필 커스터마이징
- [ ] 팔로우/팔로워 시스템
- [ ] 커뮤니티 형성 도구
- [ ] 사용자 랭킹 & 뱃지

---

## 🤝 기여

이 프로젝트는 개인 프로젝트이지만, 제안이나 버그 리포트는 환영합니다!

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## 📄 라이선스

MIT License - 자유롭게 사용하세요!

---

## 📞 연락처

- **GitHub**: [@hojune0330](https://github.com/hojune0330)
- **Website**: https://athlete-time.netlify.app
- **Instagram**: @athlete_time

---

## 🙏 감사

- Jack Daniels VDOT 공식
- React 팀
- PostgreSQL 커뮤니티
- Cloudinary
- Render & Netlify

---

**Last Updated**: 2025-10-29  
**Version**: 3.0.0  
**Status**: ✅ Production Ready
