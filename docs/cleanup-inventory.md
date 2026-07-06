# 정리 후보 인벤토리 (Cleanup Inventory)

> 작성: Claude (humanities/trust/legal + frontend) · 2026-06-13
> **갱신: 2026-06-20 — Codex의 4커밋(auth refresh / records UX / data rights / operator guide) 머지 후 재검증.**
> 목적: **삭제 실행이 아니라 기록.** 곧 실제 운영 사이트로 이식하기 전,
> 사용하지 않는 파일·중복 구조를 의존성 그래프로 검증해 둔다.
> **이 문서 시점에는 어떤 파일도 삭제하지 않았다.** 이식/정리 시 참고용 체크리스트.

> ### 📌 2026-06-20 변경 반영
> - Codex가 `data/sample*.json` 4개를 이미 삭제(fake-data 제거 맥락). → 아래 D 항목에서 제외.
> - Codex가 `AthleteInsightShowcase.tsx`를 삭제하고 `RecordSearchResults.tsx`로 대체.
>   그 여파로 프론트 dead가 **16개 → 20개**로 증가(아래 신규 4개는 Showcase 전용 의존성이 고아가 된 것).
> - Codex가 `src/` 레거시(B 항목)를 **삭제하지 않고 `card-studio/`와 함께 양쪽 미러링 수정** 중
>   (`src/DATA_POLICY.js`, `src/routes/publicRoutes.js`, `src/services/competitionService.js`).
>   → "src/는 레거시 중복" 진단은 유효하며, 정리 시 양쪽 동기화 부담을 없애는 효과.
> - `competitionService.js`의 `src/DATA_POLICY.js 참조` 주석은 아직 미갱신(주의 유지).

## 검증 방법
- 프론트엔드: `main.tsx` → `App.tsx`에서 시작하는 import 그래프를 추적
  (상대경로 + `@/` alias 모두 반영). 도달 불가 파일 = dead.
- 백엔드: 실제 구동 진입점 `src/server.js`에서 시작하는 `require` 그래프 추적.
  도달 불가 + `package.json` 스크립트 미참조 = dead.
- 모든 후보는 "이름 문자열/동적 import/주석 참조"까지 교차 확인.

---

## A. 프론트엔드 dead 파일 — **20개** (Claude 영역, 안전 삭제 가능)
`frontend/src/` 기준. App/main에서 import되지 않으며, `@/` alias 재검증에서도 동일.
**2026-06-20 재스캔: reachable 123 / DEAD 20.**

| 파일 | 비고 (대체물) |
|------|---------------|
| `pages/HomePage.tsx` (302줄) | 구 커뮤니티 홈 → `MainPage.tsx`로 대체 |
| `components/auth/LoginModal.tsx` | Header 내장 로그인 모달로 대체 |
| `components/common/SearchBar.tsx` | 검색이 `Header.tsx`/`MainPage.tsx` 인라인으로 통합됨 |
| `components/trending/HotRecordsFeed.tsx` | (구) 인사이트 피드 → 삭제됨 |
| `components/trending/FlashPoll.tsx` | 🆕 Showcase 삭제로 고아화 |
| `components/trending/TrendPulse.tsx` | 🆕 Showcase 삭제로 고아화 |
| `lib/recordInsights.ts` | 🆕 Showcase 전용 유틸 → 고아화 |
| `components/post/ImageGallery.tsx` | 미사용 |
| `components/ui/command.tsx` | 미사용 shadcn 프리미티브 |
| `components/ui/dialog.tsx` | 〃 |
| `components/ui/dropdown-menu.tsx` | 〃 |
| `components/ui/separator.tsx` | 〃 |
| `components/ui/skeleton.tsx` | 〃 |
| `components/ui/tabs.tsx` | 〃 |
| `components/ui/badge.tsx` | 🆕 Showcase 삭제 후 사용처 0회 → 고아화 |
| `components/ui/index.ts` | 미사용 ui 배럴 (앱에서 `@/components/ui` import 0회) |
| `config/constants.ts` | 미참조 |
| `api/index.ts` | 미참조 배럴 |
| `pages/index.ts` | 미참조 배럴 |
| `pages/TrainingCalculatorPage/utils/index.ts` | 미참조 |

> **참고:** `AthleteInsightShowcase.tsx`는 Codex가 `RecordSearchResults.tsx`로 대체하며 삭제 완료.
> 그 결과 Showcase가 쓰던 `FlashPoll/TrendPulse/recordInsights/badge`가 새로 dead가 됨(🆕 표시).
> **유지:** `components/ui/{button,card,input,trainoracle}.tsx`는 사용 중. 즉 `ui/`는 일부만 정리 대상.

---

## B. 백엔드 `src/` 레거시 중복 — 30개 (⚠️ Codex 영역, 위임)
현재 서버는 백엔드 로직으로 `card-studio/` + `backend/`를 사용한다.
`src/` 안에는 그 **이전 세대 백엔드가 통째로 중복**으로 남아 있다.
`package.json` 스크립트(`pipeline/generate/scrape/watch`)는 모두 `card-studio/` 버전을 가리킨다.

**살아있는 src 파일 (절대 삭제 금지) — 5개:**
`src/server.js`, `src/config.js`, `src/pacerise-client.js`, `src/pacerise-routes.js`, `src/services/paceriseImporter.js`

**dead (card-studio로 대체됨) — 30개:**
- 스크래퍼 묶음: `src/scraper.js`, `generate.js`, `pipeline.js`, `watcher.js`, `normalizer.js`, `templateEngine.js`, `screenshot.js`, `eventClassifier.js`
- 서비스 12개: `src/services/{adminContentService, autoGenerateQueue, competitionService, eventClassifier, galleryService, historyManager, pipelineService, profileCardService, recordDetector, searchService, systemService, watcherService}.js`
- 라우트 3개: `src/routes/{adminRoutes, api, publicRoutes}.js`
- 미들웨어 4개: `src/middleware/{auth, errorHandler, rateLimiter, security}.js`
- 웹소켓: `src/websocket/wsManager.js`
- 정책/매니페스트: `src/DATA_POLICY.js`, `src/MIGRATION_MANIFEST.js`, `src/selectors.json`

> **소프트 의존성 주의:** `card-studio/services/competitionService.js`에
> `⚖️ 법적 근거: src/DATA_POLICY.js 참조` 라는 **주석**이 있다. 실제 정책 로직은
> `card-studio/DATA_POLICY.js`로 이미 이전됨. `src/DATA_POLICY.js` 제거 시 이 주석을
> `card-studio/DATA_POLICY.js`로 갱신해야 함(코드 동작엔 영향 없음, 문서 정합성만).
> `card-studio/` 내 `scraper.js`/`generate.js` 등의 JSDoc 예시도 `node src/...`로
> 적혀 있으나 이는 주석일 뿐 실제 require 아님.

---

## C. 정적/데이터 디렉토리 (판단 필요)

| 대상 | 크기 | 상태 | 영역 |
|------|------|------|------|
| `data/raw_duplicates/` | 156K | 같은 대회 4회 중복 스크래핑 raw. 라이브 서비스가 읽지 않음 | ⚠️ Codex(data) |
| `deliverable/` | 204K | 디자인 핸드오프 목업 HTML. 코드 0회 참조 (순수 산출물 문서) | 공용 |
| `dashboard/` | 232K | `/legacy-dashboard`로 정적 서빙되나, 라이브 SPA에서 링크 0회 | 공용 |
| `url-report.html` / `URL_REPORT.md` / `spa-server.py` | 64K | 옛 리포트/대체서버. 미참조 | 공용 |

---

## D. 유지 확정 (삭제 금지)
- `templates/profile-card/*-v2.html` — 중복처럼 보이지만 `card-studio/routes/publicRoutes.js`가
  폴더 전체를 **런타임에 동적 나열**(`GET /profile-card/templates`)하므로 삭제 시 API가 깨진다.
- ~~`data/sample*.json`~~ — **2026-06-20 Codex가 삭제 완료**(fake-data 제거). package.json 스크립트 참조도 함께 정리됨.
- `data/results/*.json`, `data/competitions/*.json` — 실제 기록 데이터. **절대 건드리지 않음.**
- `frontend/.env.{development,example,production}` — 정상 설정.

---

## 권장 정리 순서 (이식 시)
1. **프론트 dead 16개** 삭제 → `type-check` + `build` 통과 확인 (Claude가 안전 수행 가능).
2. **백엔드 `src/` dead 30개** → Codex가 라이브 5개만 남기고 제거 + `competitionService.js`
   법적-근거 주석 경로 갱신.
3. `data/raw_duplicates/`, `url-report.*`, `spa-server.py` → 정리.
4. `deliverable/`, `dashboard/` → 운영 이식 후 불필요하면 아카이브/제거(기록물이라 신중).

**현재 PR에서는 위 어떤 것도 삭제하지 않는다.** 이식 시점에 이 문서를 기준으로 단계별 진행.
