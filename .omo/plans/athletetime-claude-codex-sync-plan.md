# AthleteTime Claude-Codex Sensitive Data Sync & Pre-Launch Plan

## TL;DR

- **Goal**: Claude와 Codex가 같은 PR/브랜치에서 갈라지지 않도록 동기화하고, AthleteTime의 검색/기록/공공데이터 기능을 실제 서비스 가능한 수준으로 발전시키되 법적·윤리적 리스크를 먼저 잠근다.
- **Decision**: 다음 개발은 바로 기능을 더 붙이는 것이 아니라, `origin/codex/athletetime-product-ux-refresh`의 최신 커밋 `4899eed`를 기준점으로 삼아 동기화한 뒤 진행한다.
- **Strategy**: public-data, identity PoC, record analytics, unified search를 하나의 “신뢰 가능한 검색 허브”로 묶되, 개인 식별자·미성년 데이터·공식 랭킹 오해·삭제/정정 정책을 시스템 불변식으로 둔다.
- **Parallelism**: 가능하다. 단, Claude는 문서/정책/카피/운영 신뢰 프레임을 맡고, Codex는 데이터 계약/API/검색 UX/검증 자동화를 맡는다. 같은 파일을 동시에 만지지 않는다.
- **Primary Risk**: 기능 실패보다 “잘못된 기준으로 출시한 뒤 나중에 삭제해도 회복이 안 되는 신뢰·법적 문제”가 더 크다. 그래서 모든 작업은 안전 게이트를 통과해야 한다.

## Current Baseline

### Repository / PR State

- Repository: `hojune0330/2026-first-item`
- Working project: AthleteTime의 실험/개발 본체로 사용 중
- Active PR: `https://github.com/hojune0330/2026-first-item/pull/2`
- PR state: open
- Base branch: `genspark_ai_developer`
- Head branch: `codex/athletetime-product-ux-refresh`
- Latest PR head confirmed: `4899eed feat: pre-launch prep - IA/search diagnosis, S3 identity PoC, public-data API`
- Local known state before this plan:
  - Local branch: `codex/athletetime-product-ux-refresh`
  - Local HEAD: `9fd2312 Add record analytics search MVP`
  - Remote head: `4899eed`
  - Local is behind remote by Claude/Genspark commits and must fast-forward before implementation.

### Claude/Genspark Work Already Landed On PR

- `card-studio/services/publicDataService.js`
  - 공공데이터포털 대한체육회 선수등록정보 CSV ingestion skeleton
  - No dependency CSV parser
  - Anonymous macro statistics only
  - No network call
  - Graceful fallback when CSV is missing
  - Source metadata bundled

- `card-studio/routes/publicDataRoutes.js`
  - `GET /api/public-data/status`
  - `GET /api/public-data/distribution`
  - `GET /api/public-data/breakdown`

- `tools/identity-poc.js`
  - Offline identity matching PoC
  - No writes by default
  - No network
  - No `person_no` leak
  - Quantified same-name risk

- `card-studio/services/identityResolver.js`
  - Internal identity map abstraction
  - No raw person identifier storage
  - confidence threshold based resolver

- `docs/athletetime-ia-search-redesign-plan.md`
  - Diagnosed split search UX
  - Header search currently incomplete
  - Main search goes to competitions
  - Real analytics search exists under records
  - Sidebar has legacy/broken links

### Codex Work Already Landed Earlier

- `card-studio/services/recordAnalyticsService.js`
  - record analytics MVP
  - athlete timelines
  - rankings
  - comparisons
  - interesting facts
  - suppression masking/exclusion

- `frontend/src/pages/RecordsPage.tsx`
  - record analytics/search UI MVP

- `frontend/src/api/recordAnalytics.ts`
  - typed frontend API wrapper

- `card-studio/routes/publicRoutes.js`
  - analytics route wiring

## Non-Negotiable Product Position

AthleteTime should not present itself as a perfect official archive. The safer and stronger positioning is:

- “공식 기록을 대체하는 곳”이 아니라 “공개된 경기 기록을 탐색하기 쉽게 만든 검색/분석 서비스”
- “개인을 단정하는 시스템”이 아니라 “기록 단위와 공개 출처 단위로 연결된 탐색 도구”
- “랭킹 확정 발표”가 아니라 “보유 데이터 기준의 시즌/전체 보기”
- “삭제를 기본으로 강제하는 서비스”가 아니라 “공개 경기 결과는 보존하되, 민감성·오류·정정 요청은 단계별로 처리하는 서비스”

This gives the product a reason to exist while lowering legal and trust risk.

## Legal / Data Guardrails

This section is not legal advice. It is an engineering and product-risk operating standard to reduce avoidable risk before launch.

### Must Do

- Preserve source attribution for every public-data and record-derived surface.
- Use “보유 데이터 기준”, “공개 경기 결과 기준”, “비공식 집계” copy near ranking/statistics surfaces.
- Keep correction/non-display request flow visible and working.
- Treat minors/youth athlete data with extra caution even when records are publicly visible.
- Separate public macro statistics from identifiable athlete records.
- Keep person matching as an internal quality process, not a public claim of identity.
- Make all identity confidence thresholds auditable.
- Maintain operational logs for correction/removal/restoration actions.
- Prefer masking/review states over immediate irreversible deletion when factual integrity matters.

### Must Not Do

- Do not store `person_no`, resident-number-like IDs, full birth dates, or raw unique identifiers from external/private datasets.
- Do not expose identity matching internals through API responses, logs, browser bundles, screenshots, or PR comments.
- Do not claim KAAF/Korea athletics federation endorsement unless explicitly granted.
- Do not expose bulk dumps of federation-like record databases.
- Do not commit production CSV data to Git.
- Do not create a public “official ranking” impression.
- Do not merge same-name athletes automatically unless backed by an approved identifier policy and high-confidence rules.
- Do not treat “publicly viewable” as equal to “safe to aggregate, republish, and rank without limits.”

### Sensitive Data Rules

- Public-data macro statistics from data.go.kr are allowed as an anonymous aggregate layer.
- Athlete performance records can be used as searchable public facts, but must keep provenance and correction channels.
- Identity resolution must use stable internal keys and confidence metadata, not raw external personal identifiers.
- If a workflow temporarily touches sensitive identifiers, those identifiers must be discarded before commit, log, API, or artifact creation.
- Any unexpected PII discovery during development is a stop-the-line event.

## Source / Law References

- Public data source: [공공데이터포털 대한체육회_선수등록정보](https://www.data.go.kr/data/15052695/fileData.do)
- Personal data statute reference: [개인정보 보호법](https://www.law.go.kr/법령/개인정보보호법)
- Copyright/database-risk statute reference: [저작권법](https://www.law.go.kr/법령/저작권법)
- Active collaboration PR: [PR #2](https://github.com/hojune0330/2026-first-item/pull/2)

## Ownership Model

### Claude / Genspark Lane

Claude is best used for the language, policy, editorial, and trust layer:

- Legal-risk copy and disclaimers
- Public-facing explanation of source/data limitations
- Correction/removal request language
- IA narrative and service positioning
- Community/content framing
- Data strategy documentation
- PR comments summarizing policy decisions

### Codex Lane

Codex should own the deterministic/system side:

- Branch synchronization and conflict prevention
- API contract checks
- Route/search consolidation
- Frontend data flow
- Type/build verification
- Data-shape invariants
- No-PII assertions
- Browser smoke testing
- Regression checks

### Shared Hot Zones

Only one agent should edit these at a time:

- `card-studio/services/recordAnalyticsService.js`
- `card-studio/routes/publicRoutes.js`
- `src/server.js`
- `frontend/src/pages/RecordsPage.tsx`
- `frontend/src/App.tsx`
- global layout/search/sidebar files
- shared documentation roadmap files

### Conflict Prevention Rule

Before either agent edits a shared hot-zone file:

1. Pull/fetch latest PR head.
2. State intended files in PR comment or chat.
3. Finish one small commit.
4. Push.
5. Report changed files and verification.

## Execution Waves

## Wave 0 - Branch Sync And Work Freeze

### Objective

Prevent split-brain development.

### Tasks

- Fetch latest remote refs.
- Confirm local branch and PR head.
- Fast-forward local branch to `origin/codex/athletetime-product-ux-refresh`.
- Do not implement new source changes before this sync.
- Record baseline SHA, changed files, and current failing/passing tests.

### Commands

```powershell
git fetch origin --prune
git status --short
git branch --show-current
git log --oneline --decorate -n 8
git diff --stat HEAD..origin/codex/athletetime-product-ux-refresh
git merge --ff-only origin/codex/athletetime-product-ux-refresh
```

### Acceptance Criteria

- Local `HEAD` equals remote PR head.
- No uncommitted source changes are introduced by Codex.
- Untracked `.omo/` planning artifacts are preserved or intentionally committed later.

## Wave 1 - Safety Contract Audit

### Objective

Confirm that the branch’s data/legal architecture is safe enough to build on.

### Tasks

- Review `publicDataService.js` for:
  - no network calls
  - no writes
  - no throws on missing CSV
  - no row-level personal exposure
  - source metadata included

- Review `identityResolver.js` for:
  - no raw external identifier storage
  - no `person_no`
  - no full birth date
  - confidence threshold applied
  - no public API exposure

- Review `recordAnalyticsService.js` for:
  - suppression respected in search, details, rankings, comparisons, facts
  - masked rows cannot leak record/time/team through secondary fields
  - rankings include “보유 데이터 기준” semantics

- Review `publicDataRoutes.js` for:
  - graceful missing-data behavior
  - 400 only for invalid dimensions
  - source included in responses
  - rate limiter mounted

### Commands

```powershell
node --check card-studio/services/publicDataService.js
node --check card-studio/services/identityResolver.js
node --check card-studio/services/recordAnalyticsService.js
node --check card-studio/routes/publicDataRoutes.js
node --check card-studio/routes/publicRoutes.js
node --check src/server.js
node tools/identity-poc.js --json
```

### Acceptance Criteria

- No syntax errors.
- Identity PoC output does not contain raw sensitive identifiers.
- No source code path commits production CSV or generated PII artifacts.
- Any safety concern pauses implementation and is documented before proceeding.

## Wave 2 - Single Search And IA Consolidation

### Objective

Fix the core “검색하면 중구난방” problem without expanding the product surface too early.

### Decision

Use `/records` as the single V1 search destination instead of creating another `/search` route immediately.

Reason:

- `/records` already owns athlete/record analytics.
- It avoids adding another half-finished route.
- It can later be renamed or wrapped as a broader search hub.
- It keeps the PR smaller and easier to verify.

### Tasks

- Make header search navigate to `/records?q=<query>`.
- Make homepage/main search navigate to `/records?q=<query>`.
- Make `/records` read the `q` URL parameter as initial search state.
- Keep competitions search separate only when the user is explicitly browsing competitions.
- Remove or rewrite search affordances that only `console.log`.
- Add concise empty states:
  - “선수 이름, 종목, 학교/팀으로 검색해보세요.”
  - “보유 데이터 기준으로 보여드려요.”
  - “공식 기록 확인은 출처를 함께 확인하세요.”

### Sidebar / Navigation Cleanup

- Replace broken legacy links with valid SPA routes.
- Avoid `.html` direct links.
- Do not introduce a top-level public-data dashboard yet.
- Keep public-data as context inside records/search or an admin/research-only route until IA is cleaner.

### Acceptance Criteria

- There is one obvious global search action.
- The same query entered from header/home lands in the same search experience.
- No broken sidebar links remain for primary navigation.
- No route gives the impression of an official federation archive.

## Wave 3 - Public Data Integration Without IA Sprawl

### Objective

Use the safe public macro-statistics layer to strengthen AthleteTime without making the UI heavier or legally confusing.

### Decision

Do not create a broad public-data dashboard for V1. Integrate public data as lightweight context cards inside search/records.

Examples:

- “이 종목 등록 선수 추이”
- “지역별 등록 분포”
- “연도별 등록 규모”
- “자료 출처: 공공데이터포털 대한체육회_선수등록정보”

### Tasks

- Consume `/api/public-data/status` to determine availability.
- If CSV is missing, show no scary error; show a small admin/dev hint only where appropriate.
- If data exists, expose one compact context section near relevant record search pages.
- Use “등록 통계” rather than “선수 DB” in public copy.
- Keep all public-data cards aggregate-only.
- Do not combine public macro statistics with identifiable athlete profiles unless the copy clearly says they are separate data layers.

### Acceptance Criteria

- A user can understand the data source without needing technical knowledge.
- Public data enriches the product but does not become a confusing parallel product.
- CSV absence does not break the site.
- Aggregates cannot be used to identify a specific minor or athlete.

## Wave 4 - Identity PoC Decision Gate

### Objective

Decide how far AthleteTime can safely go with “same athlete across years/team changes” before acquiring better identifiers or official cooperation.

### Known Finding

Claude’s PoC found:

- Same-name clusters are common.
- Name-only matching is unsafe.
- Name + team matching can still over-merge or under-merge.
- Automatic merging should be extremely conservative.

### Decision

For V1:

- Do not claim perfect person identity.
- Do not auto-merge low-confidence same-name records.
- Prefer “동명이인 가능성” / “기록 단위 묶음” language where needed.
- Use identity resolution only when confidence is high and traceable.
- Do not expose internal match confidence to normal users.

### Tasks

- Run `tools/identity-poc.js --json` after every identity-related change.
- Add or keep assertions that output contains no sensitive ID.
- Compare analytics counts before/after identity map application.
- Document threshold reasoning in data strategy progress log.

### Acceptance Criteria

- No person identity is inferred beyond approved confidence rules.
- The product can still show useful athlete timelines without pretending every same-name record is one person.
- Mismatches can be corrected through the existing request flow.

## Wave 5 - Verification And Launch Readiness

### Backend Checks

```powershell
node --check card-studio/services/recordAnalyticsService.js
node --check card-studio/services/publicDataService.js
node --check card-studio/services/identityResolver.js
node --check card-studio/routes/publicRoutes.js
node --check card-studio/routes/publicDataRoutes.js
node --check src/server.js
node tools/identity-poc.js --json
```

### Frontend Checks

```powershell
cd frontend
npm.cmd run type-check
npm.cmd run build
```

### API Smoke Checks

Run server first, then:

```powershell
curl.exe http://localhost:3000/api/public-data/status
curl.exe "http://localhost:3000/api/public-data/distribution?dimension=sport"
curl.exe http://localhost:3000/api/card-studio/analytics/filters
curl.exe "http://localhost:3000/api/card-studio/analytics/search?q=%EA%B9%80"
```

### Browser QA

- Header search works.
- Home search works.
- `/records?q=...` initializes search.
- Athlete detail still opens.
- Ranking copy says data basis clearly.
- Suppressed/masked athlete does not leak through search, rankings, facts, or comparison.
- Public-data missing state does not look like a production failure.
- Mobile layout is not overwhelming for middle/high-school users.

## Claude Coordination Protocol

### Message To Claude Before Implementation

Codex should send or post a concise coordination note:

```text
Codex is syncing to PR head 4899eed before implementation.

Proposed division:
- Claude: trust/legal wording, IA copy, source/disclaimer language, docs/progress log.
- Codex: branch sync, API contract audit, unified search routing, RecordsPage URL-query behavior, build/type/browser verification.

Hot-zone rule:
Please avoid simultaneous edits to recordAnalyticsService.js, publicRoutes.js, src/server.js, RecordsPage.tsx, App.tsx, and global layout/search/sidebar files until each side posts changed files and tests.

Codex V1 implementation decision:
Use /records?q= as the single search destination. Public data should appear only as aggregate context, not as a new top-level dashboard yet.
```

### PR Comment After Each Wave

Each agent should report:

- Commit SHA
- Files changed
- What was intentionally not changed
- Test/build results
- Data/legal guardrails checked
- Next owner

## Implementation TODO List

1. Fast-forward local branch to `4899eed`.
2. Inspect changed files from Claude and verify no conflict with local assumptions.
3. Run Wave 1 safety contract audit.
4. Document any safety concern before touching UX code.
5. Patch global/header search to route to `/records?q=`.
6. Patch homepage search to route to `/records?q=`.
7. Patch `RecordsPage` to initialize from `q`.
8. Correct primary sidebar/nav broken routes.
9. Keep public-data aggregate API separate from athlete identity APIs.
10. Add compact aggregate context only if it does not clutter `/records`.
11. Run backend syntax, identity PoC, frontend type-check/build, API smoke tests.
12. Browser-test search and suppression paths.
13. Post PR comment with results and ask Claude for final wording/policy review.
14. If Claude changes policy/copy after that, Codex only adjusts code after another fetch/sync.

## Explicit Non-Goals For The Next Coding Loop

- Do not build a full public-data dashboard.
- Do not implement account personalization yet.
- Do not implement community features yet.
- Do not scrape or mirror federation sources.
- Do not import real production CSV into Git.
- Do not solve all identity resolution.
- Do not redesign every page.
- Do not merge PR before safety and UX checks pass.

## Product Copy Principles

Use short, calm, precise wording.

Prefer:

- “보유 데이터 기준”
- “공개 경기 결과 기준”
- “출처와 함께 확인”
- “동명이인 가능성 있음”
- “정정·비노출 요청”
- “등록 통계”
- “시즌 흐름”
- “기록 변화”

Avoid:

- “공식 랭킹”
- “대한육상연맹 인증”
- “완전한 선수 DB”
- “AI가 확인한 사실”
- “삭제 불가”
- “전국 전체 확정”
- “개인정보 없는 안전한 데이터” as an absolute claim

## Youth / Student UX Principles

- One search box first.
- Results before explanation.
- Explanations as small secondary text, not long legal blocks.
- Use cards and tabs, not dense tables by default.
- Let advanced users open details.
- Avoid shaming or exposing minors through sensational copy.
- Shareable insights are okay, but they must not imply ridicule, medical inference, family background, or private life.

## Risk Register

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Same-name athlete merged incorrectly | High | Conservative identity resolver, confidence threshold, correction flow |
| Minor athlete privacy complaint | High | Source basis, minimal fields, masking/review flow, no sensitive IDs |
| Official ranking confusion | High | “보유 데이터 기준” copy, source labels, no official endorsement claim |
| Public-data UI sprawl | Medium | Aggregate context only, no new dashboard V1 |
| Claude/Codex merge conflict | Medium | Fast-forward first, hot-zone ownership, small commits |
| Broken legacy links | Medium | Sidebar/nav route audit |
| CSV accidentally committed | High | `.gitignore`, status API, review before commit |
| Suppressed athlete leaks through analytics | High | explicit suppression regression tests |
| Legal overconfidence in copy | High | risk-managed language, no “legal guarantee” phrasing |

## Final Definition Of Done

The next coding loop is complete only when:

- Local branch has synced to latest PR head before work.
- Search UX has one clear global destination.
- Record analytics still works.
- Public-data endpoints still gracefully handle missing CSV.
- Identity PoC still reports no unsafe leakage.
- Suppression/masking behavior is verified.
- Build/type checks pass.
- Browser smoke test passes.
- PR comment documents what changed, what did not change, and what safety checks passed.
- Claude has had a chance to review copy/policy wording after Codex’s deterministic changes.

## Planner Notes

- A Metis-style independent reviewer could not be spawned earlier because the agent thread limit was reached. This plan therefore includes an explicit self-review/risk-register layer instead of relying on a separate reviewer.
- The existing draft is intentionally preserved as an audit trail because the user emphasized legal/data sensitivity and continuity.
- This plan is intentionally conservative. The product can still be exciting, but the trust boundary must be correct before the interface becomes more persuasive.
