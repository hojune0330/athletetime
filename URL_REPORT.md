# AthleTime - URL 및 리소스 내용 보고서

> 작성일: 2026-04-01  
> 프로젝트: AthleTime (athletetime-unified v4.0.0)  
> 저장소 브랜치: `genspark_ai_developer`

---

## 1. GitHub / 버전 관리

| # | URL | 내용 요약 |
|---|-----|-----------|
| 1 | https://github.com/hojune0330/2026-first-item | **현재 작업 저장소** (origin). `genspark_ai_developer` 브랜치에서 PaceRise 통합, 2차 창작 면책 강화, KAAF 직접 언급 제거 작업 진행 중. |
| 2 | https://github.com/hojune0330/2026-first-item/pull/1 | **Pull Request #1** — PaceRise 데이터 통합 + 2차 창작물 면책 강화 + KAAF/연맹 직접 언급 완전 제거. `genspark_ai_developer` → `main` 머지 요청. |
| 3 | https://github.com/hojune0330/athletetime | **원본 AthleTime 저장소**. 육상 커뮤니티 + 카드 스튜디오 통합 플랫폼 소스코드. README에 메인 프로젝트로 명시됨. |
| 4 | https://github.com/hojune0330/athletetime/issues | 원본 저장소 이슈 트래커. 버그 리포트 및 기능 요청 관리. |

---

## 2. 프로덕션 배포 URL (프론트엔드 / 백엔드)

| # | URL | 내용 요약 |
|---|-----|-----------|
| 5 | https://athlete-time.netlify.app | **프론트엔드 프로덕션** (Netlify). React SPA — 메인페이지, 대회·기록 조회, 프로필 카드, 커뮤니티, 실업 LIVE, 페이스 계산기 등 제공. |
| 6 | https://athlete-time.netlify.app/community | 커뮤니티 게시판 페이지. 육상인 커뮤니티 기능 (게시글, 댓글, 투표). |
| 7 | https://athletetime-backend.onrender.com | **백엔드 프로덕션 API** (Render.com). Express.js 서버 — 인증, 게시글, 카드 스튜디오, PaceRise 프록시, 프로필 카드 생성 등 모든 API 호스팅. |

---

## 3. 외부 데이터 소스

| # | URL | 내용 요약 |
|---|-----|-----------|
| 8 | https://pace-rise-node.com | **PaceRise 원본 API 서버** (실업 대회 오퍼레이터 시스템). 실업 대회 목록, 종목, 조(heat), 결과, 선수 데이터를 제공. AthleTime 백엔드가 이 API를 프록시하여 프론트엔드에 전달. |
| 9 | http://result.kaaf.or.kr/tourInfo/resultInfo.do | **(레거시) KAAF 경기결과 사이트**. `src/config.js`의 `kaaf.resultBase`에 설정됨. 스크래퍼(`src/scraper.js`), 파이프라인(`src/pipeline.js`), 감시(`src/watcher.js`)의 CLI 예시에 사용. 프론트엔드에서는 직접 참조 제거 완료. |

---

## 4. 백엔드 API 엔드포인트 (내부 라우트)

### 4-1. PaceRise 프록시 API (`/api/pacerise/*`)

| # | 엔드포인트 | 내용 요약 |
|---|-----------|-----------|
| 10 | `GET /api/pacerise/health` | PaceRise 서버 연결 상태 확인 (헬스체크). |
| 11 | `GET /api/pacerise/competitions` | PaceRise 대회 목록 조회. |
| 12 | `GET /api/pacerise/competitions/:id` | 특정 대회 상세 정보 (종목 포함). |
| 13 | `GET /api/pacerise/competitions/:id/results` | 대회 전체 경기 결과. |
| 14 | `GET /api/pacerise/competitions/:id/schedule` | 대회 시간표. |
| 15 | `GET /api/pacerise/competitions/:id/athletes` | 대회 선수 명단. |
| 16 | `GET /api/pacerise/events/:eventId/results` | 특정 종목 결과. |
| 17 | `GET /api/pacerise/live` | 현재 진행 중인 대회 요약 (LIVE). |

### 4-2. 공개 API (`/api/*` — publicRoutes.js, 15개)

| # | 엔드포인트 | 내용 요약 |
|---|-----------|-----------|
| 18 | `GET /api/search/competitions` | 검색 가능한 대회 목록 반환. |
| 19 | `GET /api/search` | 선수/소속 검색 (이름, 팀명 기반). |
| 20 | `GET /api/profile-card/search` | 프로필 카드용 선수 기록 검색. |
| 21 | `POST /api/profile-card/generate` | 프로필 카드 이미지 생성 (위자드 모드). |
| 22 | `GET /api/profile-card/templates` | 사용 가능 카드 템플릿 목록. |
| 23 | `GET /api/profile-card/layouts` | 카드 레이아웃 옵션. |
| 24 | `GET /api/profile-card/presets` | 모듈러 프리셋 목록. |
| 25 | `GET /api/profile-card/presets/:id/options` | 특정 프리셋의 토글 옵션. |
| 26 | `POST /api/profile-card/generate-modular` | 모듈러 카드 생성. |
| 27 | `POST /api/profile-card/preview-html` | 모듈러 카드 HTML 프리뷰. |
| 28 | `GET /api/competitions` | 연도별 대회 목록 조회. |
| 29 | `GET /api/competitions/current` | 현재/직전/다음 대회 정보. |
| 30 | `GET /api/competitions/calendar` | 캘린더 뷰 데이터. |
| 31 | `GET /api/competitions/:id` | 대회 상세 정보. |
| 32 | `GET /api/results/competitions` | 결과 보유 대회 목록 (연도별). |
| 33 | `GET /api/results/:filename/events` | 대회별 전 종목 결과. |
| 34 | `GET /api/data-policy` | 데이터 사용 정책 (법적 고지). |

### 4-3. 관리자 API (`/api/admin/*` — adminRoutes.js, 32개+)

| # | 엔드포인트 | 내용 요약 |
|---|-----------|-----------|
| 35 | `GET /api/admin/status` | 전체 시스템 상태. |
| 36 | `GET /api/admin/system/info` | 시스템 상세 정보 (메모리, 프로세스 등). |
| 37 | `GET /api/admin/gallery` | 카드뉴스 이미지 목록. |
| 38 | `GET /api/admin/gallery/:filename` | 단일 이미지 정보. |
| 39 | `DELETE /api/admin/gallery/:filename` | 이미지 삭제. |
| 40 | `GET /api/admin/pipeline/status` | 파이프라인 실행 상태. |
| 41 | `GET /api/admin/pipeline/history` | 파이프라인 실행 기록. |
| 42 | `POST /api/admin/pipeline/run` | 파이프라인 실행 (수동 트리거). |
| 43 | `GET /api/admin/watcher/status` | 감시(Watcher) 상태. |
| 44 | `GET /api/admin/watcher/logs` | 감시 로그. |
| 45 | `POST /api/admin/watcher/start` | 감시 시작. |
| 46 | `POST /api/admin/watcher/stop` | 감시 중지. |
| 47 | `POST /api/admin/watcher/scan` | 수동 스캔 1회. |
| 48 | `POST /api/admin/watcher/reset` | 감시 데이터 초기화. |
| 49 | `POST /api/admin/schedule/parse-pdf` | 시간표 PDF 파싱. |
| 50 | `POST /api/admin/schedule/parse-and-generate` | 시간표 일괄 생성. |
| 51 | `POST /api/admin/schedule/preview` | 시간표 미리보기. |
| 52 | `POST /api/admin/schedule/generate` | 시간표 생성. |
| 53 | `POST /api/admin/notice/preview` | 공지사항 미리보기. |
| 54 | `POST /api/admin/notice/generate` | 공지사항 생성. |
| 55 | `GET /api/admin/result/events` | 경기결과 종목 목록. |
| 56 | `GET /api/admin/result/event-detail` | 종목 상세 결과. |
| 57 | `POST /api/admin/result/preview` | 경기결과 미리보기. |
| 58 | `POST /api/admin/result/batch-generate` | 경기결과 일괄 생성. |
| 59 | `POST /api/admin/result/generate` | 경기결과 생성. |
| 60 | `GET /api/admin/competitions/:id/events` | 대회 종목 목록 (관리자용). |
| 61 | `POST /api/admin/competitions/import-kaaf` | 레거시 KAAF 데이터 임포트. |
| 62 | `POST /api/admin/pacerise/sync` | PaceRise 데이터 동기화 (단일 대회 ID 또는 전체 일괄). |
| 63 | `GET /api/admin/pacerise/status` | PaceRise 동기화 상태 (기존 파일 + 대회 목록). |
| 64 | `GET /api/admin/auto-queue/status` | 자동 생성 큐 상태. |
| 65 | `POST /api/admin/auto-queue/toggle` | 큐 활성/비활성. |
| 66 | `GET /api/admin/auto-queue/log` | 큐 로그. |
| 67 | `POST /api/admin/auto-queue/clear` | 큐 초기화. |
| 68 | `GET /api/admin/history` | 생성 이력 목록. |
| 69 | `GET /api/admin/history/:id/image` | 생성 이미지 조회. |
| 70 | `DELETE /api/admin/history/:id` | 이력 삭제. |
| 71 | `DELETE /api/admin/history` | 전체 이력 삭제. |
| 72 | `POST /api/admin/profile-card/presets/reload` | 프리셋 캐시 새로고침. |

### 4-4. Card Studio API (`/api/card-studio/*` — competitions.ts 프론트엔드 클라이언트)

| # | 엔드포인트 | 내용 요약 |
|---|-----------|-----------|
| 73 | `GET /api/card-studio/competitions` | 대회 목록 (연도/카테고리/상태/검색 필터). |
| 74 | `GET /api/card-studio/competitions/:id` | 단일 대회 상세. |
| 75 | `GET /api/card-studio/competitions/current` | 현재/직전/다음 대회 (연도별). |
| 76 | `GET /api/card-studio/competitions/calendar` | 월별 대회 캘린더. |
| 77 | `GET /api/card-studio/results/competitions` | 결과 보유 대회 목록. |
| 78 | `GET /api/card-studio/results/:filename/events` | 대회별 종목 결과 (이벤트 타입 필터). |
| 79 | `GET /api/card-studio/search` | 선수 기록 검색 (쿼리 + 타입 필터). |
| 80 | `GET /api/match-results/competition/:competitionId` | 대회별 매치 결과 (종목/부문/라운드 필터). |
| 81 | `GET /api/match-results/:id` | 매치 결과 상세. |
| 82 | `POST /api/match-results` | 매치 결과 생성. |
| 83 | `PUT /api/match-results/:id` | 매치 결과 수정. |
| 84 | `DELETE /api/match-results/:id` | 매치 결과 삭제. |

### 4-5. 인증 / 커뮤니티 API

| # | 엔드포인트 | 내용 요약 |
|---|-----------|-----------|
| 85 | `POST /api/auth/login` | 로그인 (이메일/비밀번호 → JWT 토큰). |
| 86 | `POST /api/auth/register` | 회원가입. |
| 87 | `POST /api/auth/logout` | 로그아웃. |
| 88 | `POST /api/auth/refresh` | 토큰 갱신. |
| 89 | `GET /api/posts` | 게시글 목록 조회. |
| 90 | `POST /api/posts` | 게시글 작성. |
| 91 | `GET /api/posts/:id` | 게시글 상세. |
| 92 | `PUT /api/posts/:id` | 게시글 수정. |
| 93 | `DELETE /api/posts/:id` | 게시글 삭제. |
| 94 | `POST /api/posts/:id/vote` | 게시글 투표 (좋아요). |
| 95 | `GET /api/posts/:postId/comments` | 댓글 목록. |
| 96 | `POST /api/posts/:postId/comments` | 댓글 작성. |
| 97 | `PUT /api/posts/:postId/comments/:commentId` | 댓글 수정. |
| 98 | `DELETE /api/posts/:postId/comments/:commentId` | 댓글 삭제. |
| 99 | `GET /api/user/profile` | 사용자 프로필. |
| 100 | `GET /api/user/stats` | 사용자 통계. |
| 101 | `GET /api/user/posts` | 사용자 작성 게시글. |
| 102 | `GET /api/notifications` | 알림 목록. |
| 103 | `PUT /api/notifications/:id/read` | 알림 읽음 처리. |
| 104 | `POST /api/notifications/read-all` | 전체 알림 읽음 처리. |
| 105 | `GET /health` | 서버 헬스체크. |

---

## 5. 프론트엔드 라우트 (React SPA)

| # | 경로 | 페이지 컴포넌트 | 내용 요약 |
|---|------|----------------|-----------|
| 106 | `/` | MainPage | 메인 랜딩 — Hero 섹션, 소셜 프루프, 핵심 기능 카드, 사용 방법, 로그인 모달. |
| 107 | `/competitions` | CompetitionsPage | 대회·기록 허브 — 시간표(schedule), 결과(results), 검색(search) 3탭. |
| 108 | `/pacerise` | PaceRisePage | 실업 LIVE 대시보드 — PaceRise 실시간 결과, 시간표, 선수 명단 3탭. |
| 109 | `/profile-card` | ProfileCardPage | 프로필 카드 생성 — 위자드/모듈러 모드 선택 후 iframe 빌더. |
| 110 | `/community` | CommunityPage | 육상인 커뮤니티 게시판. |
| 111 | `/pace-calculator` | PaceCalculatorPage | 페이스 계산기 도구. |
| 112 | `/login` | LoginPage | 로그인 페이지. |
| 113 | `/register` | RegisterPage | 회원가입 페이지. |
| 114 | `/marketplace` | MarketplacePage | 마켓플레이스 (비활성). |
| 115 | `/board` | BoardPage | 게시판 페이지. |

---

## 6. 외부 리소스 / CDN / 서비스

| # | URL | 내용 요약 |
|---|-----|-----------|
| 116 | https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=2070&auto=format&fit=crop | MainPage Hero 섹션 배경 이미지 (Unsplash 스톡 — 육상 트랙 사진). |
| 117 | https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+KR:wght@300;400;500;600;700;800;900&display=swap | Google Fonts CDN — Inter + Noto Sans KR 폰트 (카드뉴스 생성용). |
| 118 | https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css | Tailwind CSS CDN — 페이스 계산기 차트 다운로드 HTML에서 사용. |

---

## 7. CORS 허용 도메인

| # | URL | 내용 요약 |
|---|-----|-----------|
| 119 | https://athlete-time.netlify.app | 프론트엔드 메인 도메인 (CORS 허용). |
| 120 | https://athletetime.netlify.app | 프론트엔드 대체 도메인 (CORS 허용). |
| 121 | https://community.athletetime.com | 커뮤니티 커스텀 도메인 (CORS 허용). |
| 122 | http://localhost:5173 | 프론트엔드 로컬 개발 (Vite). |
| 123 | http://localhost:3000 | 백엔드 로컬 개발. |
| 124 | http://localhost:3001 | 백엔드 대체 로컬 포트. |
| 125 | http://localhost:3005 | 프론트엔드에서 참조하는 로컬 API 서버 URL. |

---

## 8. 참고 자료 / 디자인 레퍼런스

| # | URL | 내용 요약 |
|---|-----|-----------|
| 126 | https://www.chopdawg.com/ui-ux-design-trends-in-mobile-apps-for-2025/ | 2025 UI/UX 디자인 트렌드 참고 문서. |
| 127 | https://stormotion.io/blog/fitness-app-ux/ | 피트니스 앱 UX 디자인 원칙 참고. |
| 128 | https://www.w3.org/WAI/WCAG21/quickref/ | WCAG 2.1 접근성 가이드라인. |
| 129 | https://m3.material.io/ | Material Design 3 디자인 시스템 참고. |
| 130 | https://tailwindcss.com/docs | Tailwind CSS 공식 문서 (프론트엔드 스타일링 기반). |
| 131 | https://www.strava.com | Strava — 육상/피트니스 앱 UX 벤치마크. |
| 132 | https://www.nike.com/nrc-app | Nike Run Club — 러닝 앱 벤치마크. |
| 133 | https://connect.garmin.com | Garmin Connect — 스포츠 기기 플랫폼 벤치마크. |
| 134 | https://www.mcmillanrunning.com | McMillan Running — 페이스 계산 참고. |

---

## 9. 버전 뱃지 URL

| # | URL | 내용 요약 |
|---|-----|-----------|
| 135 | https://img.shields.io/badge/version-3.0.0-blue.svg | README 버전 뱃지 (v3.0.0). |
| 136 | https://img.shields.io/badge/status-production-green.svg | README 상태 뱃지 (production). |

---

## 요약 통계

| 카테고리 | 개수 |
|---------|------|
| GitHub 저장소 / PR | 4 |
| 프로덕션 배포 URL | 3 |
| 외부 데이터 소스 | 2 |
| 백엔드 API 엔드포인트 | 96 |
| 프론트엔드 라우트 | 10 |
| 외부 CDN / 서비스 | 3 |
| CORS 허용 도메인 | 7 |
| 참고 자료 / 디자인 | 9 |
| 뱃지 URL | 2 |
| **합계** | **136** |
