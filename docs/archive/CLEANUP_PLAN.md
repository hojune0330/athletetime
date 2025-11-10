# 🧹 프로젝트 정리 계획

## 현재 상태 분석 (2025-10-29)

### 📊 파일 통계
- 총 파일: 493개
- HTML: 162개 (대부분 테스트/데모)
- Markdown: 90개 (문서 과다)
- JavaScript: 71개
- TypeScript: 36개 (community-new/)

### 🎯 정리 목표
1. **명확한 구조**: 프로덕션 코드 vs 개발 자료 분리
2. **중복 제거**: 동일 기능 파일 통합
3. **문서 정리**: 핵심 문서만 루트에 유지
4. **아카이브 정리**: 불필요한 백업 삭제

---

## 📁 새로운 디렉토리 구조 (제안)

```
/home/user/webapp/
├── 📄 README.md                    # 프로젝트 메인 문서
├── 📄 DEPLOYMENT.md                # 배포 가이드
├── 📄 DEVELOPMENT.md               # 개발 가이드
├── 📄 CHANGELOG.md                 # 변경 이력
├── 📄 package.json                 # 백엔드 의존성
├── 📄 server.js                    # ✅ v3.0.0 백엔드
│
├── 📁 database/                    # 데이터베이스
│   ├── schema.sql                  # ✅ PostgreSQL 스키마
│   ├── seed.js                     # ✅ 초기 데이터
│   └── migrations/                 # 향후 마이그레이션
│
├── 📁 community-new/               # ✅ 프론트엔드 (React)
│   ├── src/                        # 소스 코드
│   ├── dist/                       # 빌드 결과
│   ├── public/                     # 정적 자산
│   └── package.json
│
├── 📁 community/                   # 배포용 (dist 복사본)
│
├── 📁 docs/                        # 📚 문서 아카이브
│   ├── deployment/
│   ├── development/
│   └── changelog/
│
├── 📁 archive/                     # 🗄️ 히스토리 (읽기 전용)
│   ├── old-servers/
│   ├── old-frontend/
│   └── migration-history/
│
└── 📁 scripts/                     # 🔧 유틸리티 스크립트
    ├── deploy.sh
    ├── db-reset.sh
    └── build.sh
```

---

## 🗑️ 삭제 대상

### 1. Root 레벨 정리

#### 삭제할 HTML (테스트/데모 파일)
- `test-*.html` (18개)
- `*-demo.html`
- `*-test.html`
- `*-validation*.html`
- `*-verification*.html`
- `*-status.html`

#### 삭제할 백업 파일
- `*.backup`
- `*.backup2`
- `*-old.html`
- `data-backup.json`

#### 삭제할 중복 디렉토리
- `athletetime-complete/` (구버전)
- `athletetime-deployment/` (구버전)
- `athletetime-netlify/` (구버전)
- `athletetime-websocket-server/` (구버전)
- `deploy-ready/` (사용 안함)
- `backup/` → `archive/`로 이동
- `data/` (사용 안함)

#### 삭제할 압축 파일
- `*.zip`
- `*.tar.gz`

### 2. 문서 정리

#### 루트에 유지 (통합 및 정리 후)
- `README.md` ← 메인 문서
- `DEPLOYMENT.md` ← 배포 가이드
- `DEVELOPMENT.md` ← 개발 가이드
- `CHANGELOG.md` ← 버전 히스토리

#### docs/로 이동
- 모든 다른 .md 파일들 (90개 → 4개로 통합)

### 3. 코드 정리

#### 삭제할 JavaScript 파일 (Root)
- `add-*.js` (샘플 데이터 스크립트)
- `apply-*.js` (일회성 스크립트)
- `check-*.js`
- `clear-*.js`
- `download-*.js`
- `fix-*.js`
- `migrate-*.js`
- `poll-handler.js`
- `remove-*.js`
- `security-implementation.js`
- `test-*.js`
- `validate-*.js`

#### scripts/로 이동
- 유용한 유틸리티만 선별

---

## ✅ 유지할 핵심 파일

### 백엔드
- ✅ `server.js` (v3.0.0)
- ✅ `package.json`
- ✅ `database/schema.sql`
- ✅ `database/seed.js`
- ✅ `.env.example`

### 프론트엔드
- ✅ `community-new/` 전체 (React 프로젝트)
- ✅ `community/` (배포용 빌드)

### 설정 파일
- ✅ `netlify.toml`
- ✅ `render.yaml`
- ✅ `.gitignore`

### 문서 (통합 후)
- ✅ `README.md`
- ✅ `DEPLOYMENT.md`
- ✅ `DEVELOPMENT.md`
- ✅ `CHANGELOG.md`

---

## 🔄 정리 작업 순서

1. **백업 생성** (안전장치)
2. **새 디렉토리 생성** (docs/, scripts/)
3. **파일 이동** (문서, 스크립트)
4. **파일 삭제** (테스트, 백업, 중복)
5. **문서 통합** (README, DEPLOYMENT 등)
6. **Git 정리** (커밋, 푸시)
7. **검증** (빌드 테스트)

---

## 📝 정리 후 예상 결과

### 파일 수 감소
- 현재: **493개**
- 목표: **~100개** (80% 감소)

### 디렉토리 구조
- 현재: **복잡, 중복 많음**
- 목표: **명확, 3-레벨 최대**

### 문서
- 현재: **90개 MD 파일**
- 목표: **4개 핵심 문서 + docs/ 아카이브**

---

## 🎯 성공 기준

✅ 새로운 개발자가 5분 안에 프로젝트 이해  
✅ README 하나로 전체 구조 파악 가능  
✅ 배포 문서만 보고 배포 가능  
✅ 불필요한 파일 0개  
✅ Git 히스토리 정리  

---

**작성일**: 2025-10-29  
**작성자**: Claude (Sonnet) - 프로젝트 정리 전문가
