/**
 * AthleTime 이식 매니페스트 (Migration Manifest)
 * 
 * 이 파일은 카드 스튜디오 시스템을 athletetime 레포지토리에
 * 이식할 때 참조하는 설정 파일입니다.
 * 
 * =========================================================================
 * 이식 매핑
 * =========================================================================
 * 
 * [현재 구조]              →  [athletetime 구조]
 * ─────────────────────────────────────────────────
 * src/routes/publicRoutes.js  → backend/routes/cardStudio.js
 * src/routes/adminRoutes.js   → backend/routes/cardStudioAdmin.js
 * src/middleware/auth.js       → backend/middleware/auth.js (기존 것 사용)
 * src/middleware/rateLimiter.js → backend/middleware/rateLimiter.js (새로 추가)
 * src/middleware/security.js   → backend/middleware/ (기존 보안 헤더에 병합)
 * src/services/*              → backend/services/card-studio/
 * src/card-engine/            → backend/services/card-studio/card-engine/
 * src/DATA_POLICY.js          → backend/config/dataPolicy.js
 * templates/                  → backend/templates/card-studio/
 * data/competitions/          → backend/data/competitions/ (Git 추적)
 * dashboard/profile-card-*.html → frontend 또는 정적 서빙
 * dashboard/admin.html        → frontend (관리자 전용)
 * dashboard/index.html        → frontend (관리자 전용)
 * 
 * [라우트 매핑]
 * /api/profile-card/*   → /api/card-studio/profile-card/*  (공개)
 * /api/search            → /api/card-studio/search          (공개)
 * /api/competitions      → /api/card-studio/competitions    (공개, 충돌 회피)
 * /api/data-policy       → /api/card-studio/data-policy     (공개)
 * /api/status            → /api/card-studio/admin/status    (관리자)
 * /api/admin/*           → /api/card-studio/admin/*         (관리자)
 * /api/gallery/*         → /api/card-studio/admin/gallery/* (관리자)
 * /api/pipeline/*        → /api/card-studio/admin/pipeline/* (관리자)
 * /api/watcher/*         → /api/card-studio/admin/watcher/* (관리자)
 * 
 * [인증 교체]
 * 현재: requireAdmin (ADMIN_TOKEN 환경변수)
 * 이식 후: authenticateToken + requireAdmin (JWT + PostgreSQL)
 * 교체 방법: require('../middleware/auth') 경로만 변경
 * 
 * [의존성 추가]
 * athletetime에 추가해야 할 의존성:
 * - puppeteer: ^23.0.0  (카드 이미지 생성)
 * - pdf-parse: ^2.4.5   (시간표 PDF 파싱)
 * - ws: ^8.19.0         (이미 존재)
 * 
 * [환경 변수 추가]
 * - ADMIN_TOKEN: 불필요 (JWT 기반으로 교체)
 * - CORS_ORIGIN: 불필요 (기존 CORS 설정 사용)
 * 
 * [Render 배포 주의사항]
 * - Puppeteer는 ~300MB RAM 추가 사용
 * - Free 티어 (512MB)에서는 OOM 위험
 * - Starter 이상 또는 온디맨드 실행 권장
 * - Chromium buildpack 또는 Docker 이미지 필요
 * 
 * [파일 저장 전략]
 * - 생성 이미지: 로컬 임시 → 즉시 다운로드 → 삭제
 * - Cloudinary 불필요 (이미지 저장 안 함)
 * - 대회 데이터: JSON 파일 → Git 추적 또는 PostgreSQL
 * 
 * =========================================================================
 */

module.exports = {
  version: '3.0.0',
  sourceRepo: 'hojune0330/2026-first-item',
  targetRepo: 'hojune0330/athletetime',
  
  // 충돌 회피 네임스페이스
  apiNamespace: '/api/card-studio',
  
  // 공개 라우트 (인증 불필요)
  publicRoutes: [
    'GET /api/card-studio/search',
    'GET /api/card-studio/search/competitions',
    'GET /api/card-studio/profile-card/search',
    'POST /api/card-studio/profile-card/generate',
    'GET /api/card-studio/profile-card/templates',
    'GET /api/card-studio/profile-card/layouts',
    'GET /api/card-studio/profile-card/presets',
    'GET /api/card-studio/profile-card/presets/:id/options',
    'POST /api/card-studio/profile-card/generate-modular',
    'POST /api/card-studio/profile-card/preview-html',
    'GET /api/card-studio/competitions',
    'GET /api/card-studio/competitions/current',
    'GET /api/card-studio/competitions/calendar',
    'GET /api/card-studio/competitions/:id',
    'GET /api/card-studio/data-policy',
  ],
  
  // 관리자 라우트 (authenticateToken + requireAdmin)
  adminRoutes: [
    'GET /api/card-studio/admin/status',
    'GET /api/card-studio/admin/system/info',
    // ... 나머지 32개
  ],
  
  // Express 버전 호환성
  expressCompatibility: {
    current: '5.2.1',
    target: '4.18.2',
    changes: [
      'Express 5의 path() 메서드 비호환 → 사용하지 않으므로 문제 없음',
      'Express 5의 promise rejection → try-catch 처리 필요',
      'multer 버전 차이 → athletetime의 multer 버전 확인 필요',
    ]
  }
};
