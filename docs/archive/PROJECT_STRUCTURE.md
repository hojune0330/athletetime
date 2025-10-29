# 🗂️ Athlete Time - 프로젝트 구조 (v3.0.0)

## 📁 핵심 디렉토리 (작업 필수)

```
/home/user/webapp/
├── server.js                    # 🟢 통합 백엔드 서버 (PostgreSQL + Cloudinary + WebSocket)
├── package.json                  # 🟢 Node.js 의존성
├── package-lock.json
│
├── database/                     # 🟢 데이터베이스 스키마 및 시드
│   ├── schema.sql               # PostgreSQL 스키마 (11 tables)
│   └── seed.js                  # 초기 데이터 (관리자, 공지사항)
│
├── community-new/                # 🟢 React 프론트엔드 소스
│   ├── src/
│   │   ├── api/                 # API 클라이언트
│   │   ├── components/          # React 컴포넌트
│   │   ├── hooks/               # React Query 훅
│   │   ├── pages/               # 페이지 컴포넌트
│   │   ├── types/               # TypeScript 타입
│   │   └── utils/               # 유틸리티 (anonymousUser 등)
│   ├── dist/                    # 빌드 결과물
│   ├── package.json
│   └── vite.config.ts
│
├── community/                    # 🟢 Netlify 배포용 (dist 복사본)
│   ├── index.html
│   └── assets/
│
└── docs/                         # 🟢 문서화
    ├── DEPLOYMENT_COMPLETE_SUMMARY.md
    ├── NEXT_STEPS.md
    ├── DEPLOYMENT_INSTRUCTIONS.md
    └── CRITICAL_URLS.md
```

## 📦 보관 디렉토리 (참고용)

```
├── archive/                      # 🟡 구버전 백업
│   ├── old-servers/             # 이전 서버 파일들
│   ├── old-html/                # 이전 HTML 페이지들
│   └── old-configs/             # 이전 설정 파일들
│
└── backup/                       # 🟡 백업 데이터
```

## 🚫 제외할 항목 (.gitignore)

```
node_modules/
dist/
*.log
.env
.env.local
*.zip
*.tar.gz
.DS_Store
```

## 📝 핵심 파일 설명

### 백엔드
- `server.js` - Express + PostgreSQL + Cloudinary + WebSocket
- `database/schema.sql` - 전체 DB 스키마
- `database/seed.js` - 초기 데이터 생성

### 프론트엔드
- `community-new/src/` - React 소스 코드
- `community-new/dist/` - 프로덕션 빌드
- `community/` - Netlify 배포용 (빌드 복사본)

### 문서
- `README.md` - 프로젝트 개요
- `docs/DEPLOYMENT_COMPLETE_SUMMARY.md` - 전체 시스템 설명
- `docs/NEXT_STEPS.md` - 배포 가이드

## 🔧 작업 시 필요한 명령어

### 백엔드 개발
```bash
cd /home/user/webapp
npm install
npm run dev
```

### 프론트엔드 개발
```bash
cd /home/user/webapp/community-new
npm install
npm run dev
```

### 프로덕션 빌드
```bash
# 프론트엔드 빌드
cd /home/user/webapp/community-new
npm run build

# community/ 폴더로 복사
cd /home/user/webapp
rm -rf community/*
cp -r community-new/dist/* community/
```

### 데이터베이스 초기화
```bash
cd /home/user/webapp
npm run db:migrate
npm run db:seed
```

## 🌐 배포 URL

- **Frontend**: https://athlete-time.netlify.app/community
- **Backend**: https://athletetime-backend.onrender.com
- **GitHub**: https://github.com/hojune0330/athletetime

---

**최종 업데이트**: 2025-10-29
**버전**: v3.0.0
