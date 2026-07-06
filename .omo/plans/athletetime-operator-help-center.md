# AthleteTime Operator Help Center Plan

## TL;DR
> **Summary**: 관리자/매니저가 법적 문의, 정정·비노출 요청, 악성 민원, 보안 공격, 커뮤니티 분쟁을 같은 기준으로 처리할 수 있는 내부 Q&A/런북 페이지를 만든다. 공개 이용자에게는 필요한 신뢰 원칙만 `/about-data`에 짧게 보여주고, 세부 대응 절차와 보안 전술은 공개하지 않는다.
> **Deliverables**:
> - `/admin/operator-guide` 내부 운영자 Q&A/런북 페이지
> - 관리자 사이드바/대시보드 진입점
> - `/about-data` 공개 FAQ 요약 섹션
> - 운영 Q&A 백엔드 데이터 모듈과 보호된 admin API
> - RED→GREEN 테스트와 브라우저/HTTP QA 증거
> - 오푸스/클로드 카피·정책 리뷰 지시문
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 -> Task 4 -> Task 6 -> Task 5 -> Task 7 -> Final Verification

## Context
### Original Request
관리자 및 매니저 같은 내부 운영자가 법적 조치나 문의, 공격, 보안에 대한 내용을 확인할 수 있는 Q&A/도움말 형태의 페이지를 만들고, 이 내용이 모든 사람이 봐야 하는지도 판단한다.

### Codebase Findings
- `frontend/src/App.tsx` already has a protected `/admin` route using `AdminRoute` and `AdminLayout`.
- `frontend/src/components/layout/AdminLayout.tsx` owns the admin sidebar through `adminNavItems`.
- `frontend/src/pages/admin/AdminDataRequestsPage.tsx` already explains the correction/deindexing status flow and is the closest UX/content pattern.
- `frontend/src/pages/AboutDataPage.tsx` is the current public-facing data principle page.
- `card-studio/dataRightsPolicy.js` and `frontend/src/config/dataPolicy.ts` define the current public-record positioning.
- Current test pattern exists in `backend/tests/athlete-user-ux.test.js`: source assertions plus real server HTTP checks.
- `src/server.js` mounts `/api/card-studio/admin` behind `authenticateToken` and `requireAdmin`.
- `backend/middleware/auth.js` returns `401` for missing/invalid token and `403` for non-admin users.

### Planning Agent / Metis Note
- A `plan` agent and a `metis` agent were spawned for parallel planning/gap review.
- Their late findings were incorporated.
- Metis flagged the key risk that route-gated React content still ships in the public SPA bundle.
- The plan agent recommended a protected admin API for the internal guide and `/about-data` for only public-safe FAQ.
- This plan is based on direct repository inspection, subagent gap review, and the current policy constraints.

## Key Decisions
### D1. Internal Page Name
Use `/admin/operator-guide`.

Reason:
- “Help” is too generic.
- “Risk playbook” exposes the wrong mental model.
- “Operator guide” says this is an internal operating standard, not public legal advice.

### D2. Public vs Internal Boundary
Use a two-layer model.

Internal only:
- Legal notice intake steps.
- Federation/source complaint handling.
- Malicious requester patterns.
- Abuse, scraping, rate-limit, account compromise, credential incident handling.
- Admin escalation checklist.
- Evidence preservation and “do not reply directly” guidance.
- Security contact triage and incident severity matrix.

Public summary:
- What data AthleteTime collects.
- What it does not collect.
- How to request correction/non-display.
- What “official service가 아님” means.
- Broad abuse/report path without operational details.

### D2.1. Internal Text Must Not Live In The Public SPA Bundle
Do not store detailed legal/security runbook text in `frontend/src/config/*` or static React component arrays.

Reason:
- React route gating hides UI, but the built JS bundle can still be inspected.
- The internal guide includes sensitive handling logic that should not be shipped to every browser.
- The existing admin API mount is already protected by JWT admin middleware.

Implementation consequence:
- Store internal guide content in a backend module such as `card-studio/operatorGuidePolicy.js`.
- Serve it through `GET /api/card-studio/admin/operator-guide`.
- The React admin page fetches and renders the guide; it contains layout only, not the full runbook source.
- Public-safe FAQ copy can remain in frontend/public page files because it is intended to be visible.

### D3. Content Tone
Use “운영 기준” and “처리 원칙”, not “법적 방어”, “법률 자문”, “법적 회피”, “우리는 안전하다”.

Allowed tone:
```text
이 페이지는 법률 자문이 아니라 운영자가 같은 기준으로 대응하기 위한 내부 기준입니다.
애매하면 공개 노출을 줄이고, 원본·로그·처리 이력을 보존한 뒤 관리자에게 에스컬레이션합니다.
```

Forbidden tone:
```text
법적으로 문제없음
무조건 합법
신고를 피하는 방법
AI가 검증
2차 창작이므로 안전
```

### D4. UX Structure
The admin page should be concise, scannable, and action-oriented.

Recommended sections:
- `오늘 먼저 볼 것`: urgent checks and red flags.
- `상황별 Q&A`: correction, legal, source complaint, athlete/guardian, media, abuse, security.
- `대응 단계`: receive -> classify -> reduce exposure -> preserve evidence -> escalate -> close.
- `하면 안 되는 말`: banned response phrases.
- `공개해도 되는 말`: safe public-facing phrasing.
- `운영 체크리스트`: short checklist before changing data visibility.

### D5. Everyone Should Not See Everything
Not everyone should see the full internal page.

Why:
- Security incident details can teach attackers what to try.
- Legal notice handling can reveal thresholds and delay tactics.
- Abuse workflow can be gamed if published.
- Internal notes may include operational weakness.

But everyone should see a small public version.

Why:
- Users need trust and a correction path.
- Public principles reduce suspicion.
- Athletes/parents need to know where to ask.
- A visible process supports “성실 운영” without exposing the runbook.

## Work Objectives
### Core Objective
Create an internal operator help center that makes admin/legal/security handling consistent, while exposing only safe public data-rights FAQ content.

### Must Have
- Protected `/admin/operator-guide` route.
- Protected `GET /api/card-studio/admin/operator-guide` endpoint.
- Admin sidebar entry: `운영 가이드`.
- Admin dashboard quick action entry.
- Internal Q&A content covers at least 8 scenarios:
  - Athlete/guardian correction request.
  - Wrong identity/same-name complaint.
  - Full deletion demand.
  - Federation/source owner complaint.
  - Legal notice or attorney letter.
  - Media/Instagram DM inquiry.
  - Community harassment/defamation report.
  - Security/abuse/scraping/account incident.
- Public `/about-data` FAQ summary with safe language.
- No public exposure of detailed security playbook.
- No sensitive internal guide text embedded in the public frontend bundle.
- Tests that fail before route/content exists and pass after implementation.
- Browser QA proving admin-only page behavior and public summary behavior.

### Must NOT Have
- No claim that this is legal advice.
- No “법적 회피”, “무조건 합법”, “AI 검증”, “2차 창작으로 안전” framing.
- No public security thresholds, rate-limit bypass details, admin token hints, or incident response internals.
- No new backend mutation route unless implementation later proves it is necessary.
- No internal guide content in `frontend/src/config/*`, public pages, or static public navigation.
- No person_no, birthdate, raw external ID, private contact, or credential examples.
- No real person names in example scenarios.

## Public / Internal Content Matrix
| Topic | Internal `/admin/operator-guide` | Public `/about-data` |
|---|---:|---:|
| 공개 기록 색인 원칙 | Full | Short |
| 정정·비노출 요청 방법 | Full | Full enough |
| 삭제 vs 검색 비노출 판단 | Full | Short principle only |
| 동일인/동명이인 처리 | Full | Short |
| 미성년/보호자 요청 | Full | Short |
| 법적 통지 수령 절차 | Full | Not exposed |
| 연맹/출처권자 complaint | Full | Not exposed |
| 악성 반복 민원 대응 | Full | Not exposed |
| scraping/abuse/security incident | Full | Generic “문제 제보 가능” only |
| 관리자 계정/권한 이상 | Full | Not exposed |
| 커뮤니티 명예훼손/괴롭힘 | Full | Short reporting note optional |
| 공식 기록 아님 안내 | Full | Full enough |

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed during implementation.

- Test decision: TDD, using existing Node test runner and source/HTTP checks.
- Browser QA: use Chrome/Playwright against the built app or dev server.
- Evidence directory: `.omo/evidence/operator-guide/`
- Required commands:
```powershell
npm test
npm --prefix frontend run type-check
npm --prefix frontend run build
rg -n "법적 회피|무조건 합법|AI 검증|AI 인사이트|2차 창작|admin_token|ADMIN_TOKEN|person_no|birthdate" frontend/src/pages frontend/src/components frontend/src/config docs
rg -n "법적 통지|보안 사고|공격 대응|증거 보존|침해 의심|내부 운영 기준" frontend/src --glob "!frontend/src/pages/admin/AdminOperatorGuidePage.tsx"
```

## Execution Strategy
### Parallel Execution Waves
Wave 1:
- Task 1 backend admin-guide API contract tests
- Task 2 internal page route tests
- Task 3 public/private boundary tests

Wave 2:
- Task 4 backend guide source and admin API
- Task 5 admin navigation/dashboard entry
- Task 6 frontend admin page and public `/about-data` FAQ summary

Wave 3:
- Task 7 browser QA and screenshot evidence
- Task 8 PR handoff for Opus/Claude review
- Final verification

### Dependency Matrix
| Task | Depends On | Blocks |
|---|---|---|
| 1 | none | 4, 6 |
| 2 | none | 4, 5 |
| 3 | none | 4, 6 |
| 4 | 1, 2, 3 | 6, 7 |
| 5 | 2 | 7 |
| 6 | 1, 3, 4 | 7 |
| 7 | 4, 5, 6 | Final |
| 8 | 7 | Final |

## TODOs
- [ ] 1. Define protected operator-guide API contract and RED tests

  **What to do**:
  - Add a test file `backend/tests/operator-guide.test.js`.
  - Start `src/server.js` with test env, following `backend/tests/data-rights-policy.test.js`.
  - Assert unauthenticated `GET /api/card-studio/admin/operator-guide` returns `401`.
  - Assert normal non-admin token returns `403` if a non-admin fixture/token helper exists; if current test infra cannot create non-admin token cheaply, document this as a v2 check and keep browser/source admin-route guard in Task 2.
  - Assert admin token returns a JSON schema:
    - `success: true`
    - `data.version`
    - `data.audience: "internal_operator"`
    - `data.disclaimer`
    - `data.escalationStates`
    - `data.scenarios`
    - `data.publicBoundary`
  - Assert required internal scenarios exist in the admin response.
  - Assert public endpoints `/api/card-studio/data-policy` and `/api/card-studio/data-requests/:ticketId` do not contain internal scenario text.
  - The test must fail first because the endpoint and module do not exist.

  **Must NOT do**:
  - Do not implement the endpoint or guide module before capturing RED.
  - Do not include real names, real contact info, credentials, or external legal threats.

  **References**:
  - Pattern: `backend/tests/data-rights-policy.test.js` - server test with random port and auth-safe cleanup.
  - Guard: `backend/middleware/auth.js` - 401/403 admin behavior.
  - Mount: `src/server.js` - `/api/card-studio/admin` protected by JWT admin middleware.
  - Policy: `card-studio/dataRightsPolicy.js` - current public-record positioning.

  **Acceptance Criteria**:
  - [ ] `node --test backend/tests/operator-guide.test.js` fails RED with missing protected endpoint.
  - [ ] After implementation, the same test passes and asserts the 8 required internal scenarios.
  - [ ] Public API responses do not leak internal guide scenario text.

  **QA Scenarios**:
  ```text
  Scenario: Internal copy contract RED/GREEN
    Tool: Git Bash
    Steps: node --test backend/tests/operator-guide.test.js
    Expected: RED before implementation, GREEN after implementation
    Evidence: .omo/evidence/operator-guide/task-1-copy-red.txt and task-1-copy-green.txt

  Scenario: Protected admin API HTTP behavior
    Tool: HTTP call
    Steps: curl -i http://127.0.0.1:<PORT>/api/card-studio/admin/operator-guide
    Expected: HTTP 401 and no guide body
    Evidence: .omo/evidence/operator-guide/task-1-unauth-http.txt
  ```

  **Commit**: YES | Message: `test(operator): add admin guide API contract`

- [ ] 2. Add route/visibility tests for internal guide

  **What to do**:
  - Extend or add a test checking `frontend/src/App.tsx` routes `/admin/operator-guide` inside `<AdminRoute />`.
  - Test `AdminLayout` contains a sidebar item labeled `운영 가이드`.
  - Test public routes do not expose the internal guide link.

  **Must NOT do**:
  - Do not put the operator guide under public `Layout`.
  - Do not link it from normal header/footer.

  **References**:
  - Route pattern: `frontend/src/App.tsx`.
  - Admin nav pattern: `frontend/src/components/layout/AdminLayout.tsx`.
  - Admin guard: `frontend/src/components/layout/AdminRoute.tsx`.

  **Acceptance Criteria**:
  - [ ] RED test fails before route/nav exists.
  - [ ] GREEN test passes after route/nav implementation.
  - [ ] Source scan confirms no public header/footer link to `/admin/operator-guide`.

  **QA Scenarios**:
  ```text
  Scenario: Route is admin-only by source contract
    Tool: Git Bash
    Steps: node --test backend/tests/operator-guide-route.test.js
    Expected: `/admin/operator-guide` is nested under AdminRoute and not public Layout
    Evidence: .omo/evidence/operator-guide/task-2-route-green.txt

  Scenario: Public link absence
    Tool: Git Bash
    Steps: rg -n "/admin/operator-guide" frontend/src/components/layout/Header.tsx frontend/src/components/layout/Footer.tsx frontend/src/pages/MainPage.tsx
    Expected: no hits
    Evidence: .omo/evidence/operator-guide/task-2-public-link-scan.txt
  ```

  **Commit**: YES | Message: `test(operator): require admin-only guide route`

- [ ] 3. Decide and test public FAQ boundary

  **What to do**:
  - Add tests requiring `/about-data` to include a public FAQ section with safe headings:
    - `정정·비노출은 어떻게 요청하나요?`
    - `공식 기록 서비스인가요?`
    - `내부 운영 기준은 왜 공개하지 않나요?`
  - Test public FAQ does not include security runbook keywords.
  - Test the frontend bundle source outside `AdminOperatorGuidePage.tsx` does not contain internal guide-only terms.

  **Must NOT do**:
  - Do not create a separate public `/help` route in v1.
  - Do not expose legal-notice intake instructions publicly.

  **References**:
  - Public page pattern: `frontend/src/pages/AboutDataPage.tsx`.
  - Copy source: `frontend/src/config/dataPolicy.ts`.

  **Acceptance Criteria**:
  - [ ] `/about-data` has short public FAQ.
  - [ ] It links to `/data-request`.
  - [ ] It does not expose “법적 통지 접수”, “공격 대응”, “보안 사고 등급”, “관리자 계정” details.

  **QA Scenarios**:
  ```text
  Scenario: Public FAQ source contract
    Tool: Git Bash
    Steps: node --test backend/tests/operator-guide-public-boundary.test.js
    Expected: safe public FAQ exists and sensitive internal headings are absent
    Evidence: .omo/evidence/operator-guide/task-3-public-boundary-green.txt

  Scenario: Public FAQ HTTP/browser surface
    Tool: Browser use
    Steps: open http://127.0.0.1:<PORT>/about-data, inspect body text
    Expected: public FAQ headings visible, no internal security runbook terms
    Evidence: .omo/evidence/operator-guide/task-3-about-data.png and task-3-about-data.json
  ```

  **Commit**: YES | Message: `test(operator): lock public FAQ boundary`

- [ ] 4. Implement backend operator guide source and admin API

  **What to do**:
  - Create `card-studio/operatorGuidePolicy.js`.
  - Add `GET /operator-guide` to `card-studio/routes/adminRoutes.js`.
  - Use structured sections rather than prose blobs:
    - urgent checklist
    - situation Q&A
    - escalation matrix
    - safe public phrases
    - forbidden phrases
    - evidence preservation checklist
  - Return internal-only warning:
    - `내부 운영 기준입니다. 법률 자문이 아니며, 공개 답변 문구로 그대로 사용하지 마세요.`

  **Must NOT do**:
  - Do not include credentials, concrete bypass logic, rate-limit thresholds, or private data examples.
  - Do not over-design with long legal paragraphs.

  **References**:
  - Admin route pattern: `card-studio/routes/adminRoutes.js`.
  - Policy module pattern: `card-studio/dataRightsPolicy.js`.
  - Existing status endpoint pattern: `frontend/src/api/admin.ts` for later client.

  **Acceptance Criteria**:
  - [ ] All Task 1 tests pass.
  - [ ] Unauthenticated HTTP call returns 401.
  - [ ] Admin HTTP call returns structured guide JSON.
  - [ ] Internal copy uses “운영 기준” not “법률 자문”.

  **QA Scenarios**:
  ```text
  Scenario: Admin guide API authorized shape
    Tool: HTTP call
    Steps: curl -i -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" http://127.0.0.1:<PORT>/api/card-studio/admin/operator-guide
    Expected: HTTP 200 with `audience:"internal_operator"` and required scenarios
    Evidence: .omo/evidence/operator-guide/task-4-admin-api-200.txt

  Scenario: Public API leakage check
    Tool: HTTP call
    Steps: curl -i http://127.0.0.1:<PORT>/api/card-studio/data-policy
    Expected: HTTP 200 and no internal scenario terms like `Breach Suspicion` or `보안 사고 등급`
    Evidence: .omo/evidence/operator-guide/task-4-public-api-no-leak.txt
  ```

  **Commit**: YES | Message: `feat(operator): add protected guide API`

- [ ] 5. Wire admin route, sidebar, and dashboard entry

  **What to do**:
  - Import `AdminOperatorGuidePage` in `frontend/src/App.tsx`.
  - Add route `<Route path="operator-guide" element={<AdminOperatorGuidePage />} />`.
  - Add sidebar item in `AdminLayout`.
  - Add dashboard quick action card near `정정·삭제 요청` or system information.

  **Must NOT do**:
  - Do not expose the link from public `Layout`, footer, home, or `/about-data`.

  **References**:
  - Route: `frontend/src/App.tsx`.
  - Sidebar: `frontend/src/components/layout/AdminLayout.tsx`.
  - Dashboard action: `frontend/src/pages/admin/AdminDashboardPage.tsx`.

  **Acceptance Criteria**:
  - [ ] Admin navigation shows `운영 가이드`.
  - [ ] Direct `/admin/operator-guide` route is protected by existing `AdminRoute`.
  - [ ] Non-admin users are redirected to `/login` or `/`.

  **QA Scenarios**:
  ```text
  Scenario: Anonymous direct access
    Tool: Browser use
    Steps: open http://127.0.0.1:<PORT>/admin/operator-guide without login
    Expected: redirected to `/login`, internal page text not visible
    Evidence: .omo/evidence/operator-guide/task-5-anonymous-redirect.png

  Scenario: Sidebar entry source check
    Tool: Git Bash
    Steps: rg -n "운영 가이드|operator-guide" frontend/src/components/layout/AdminLayout.tsx frontend/src/App.tsx
    Expected: hits only in admin route/sidebar files
    Evidence: .omo/evidence/operator-guide/task-5-source-links.txt
  ```

  **Commit**: YES | Message: `feat(operator): wire admin guide navigation`

- [ ] 6. Add frontend admin page and safe public FAQ

  **What to do (admin page)**:
  - Add `frontend/src/api/operatorGuide.ts` or extend `frontend/src/api/admin.ts` with `getOperatorGuide()`.
  - Create `frontend/src/pages/admin/AdminOperatorGuidePage.tsx`.
  - The page must fetch `/api/card-studio/admin/operator-guide`.
  - The page may contain labels/layout chrome, but not the full internal scenario data as hardcoded arrays.

  **What to do (public FAQ)**:
  - Add a compact FAQ card to `AboutDataPage`.
  - Keep the tone user-facing and short.
  - Include link to `/data-request`.
  - Explain that detailed internal handling standards are not public because they include security and abuse response details.

  **Must NOT do**:
  - Do not use the phrase “숨긴다”.
  - Do not imply requests are ignored.
  - Do not expose escalation steps.
  - Do not hardcode the internal scenarios in the frontend bundle.

  **References**:
  - Page: `frontend/src/pages/AboutDataPage.tsx`.
  - Admin page pattern: `frontend/src/pages/admin/AdminDataRequestsPage.tsx`.
  - API client pattern: `frontend/src/api/admin.ts`.
  - Central copy: `frontend/src/config/dataPolicy.ts`.
  - Link: `frontend/src/data/athleteRecords.ts` `recordCorrectionUrl`.

  **Acceptance Criteria**:
  - [ ] Public FAQ uses short trust copy.
  - [ ] Public FAQ links to `/data-request`.
  - [ ] Internal runbook content is absent from public page.
  - [ ] Admin page fetches guide content from protected API.

  **QA Scenarios**:
  ```text
  Scenario: Public FAQ visible
    Tool: Browser use
    Steps: open http://127.0.0.1:<PORT>/about-data
    Expected: headings for correction/non-display and official-service clarification visible
    Evidence: .omo/evidence/operator-guide/task-6-about-data-faq.png

  Scenario: Admin page fetches protected API
    Tool: Browser use
    Steps: open /admin/operator-guide as admin-auth fixture and capture network log
    Expected: request to `/api/card-studio/admin/operator-guide` succeeds, page renders guide sections
    Evidence: .omo/evidence/operator-guide/task-6-admin-fetch.json and task-6-admin-guide.png

  Scenario: Public page sensitive-term scan
    Tool: Git Bash
    Steps: rg -n "법적 통지|보안 사고 등급|공격 대응|관리자 계정|증거 보존 체크리스트" frontend/src/pages/AboutDataPage.tsx
    Expected: no hits
    Evidence: .omo/evidence/operator-guide/task-6-sensitive-scan.txt
  ```

  **Commit**: YES | Message: `feat(operator): add admin guide surface`

- [ ] 7. Full verification and browser QA

  **What to do**:
  - Run all automated tests.
  - Run frontend type-check and build.
  - Start local server on a non-conflicting port.
  - Run browser QA for:
    - anonymous `/admin/operator-guide` redirect
    - `/about-data` public FAQ
    - `/admin/data-requests` still renders or route still exists
  - Stop QA server and record cleanup receipt.

  **Must NOT do**:
  - Do not leave QA server running.
  - Do not leave generated request files, screenshots outside `.omo/evidence/operator-guide`, or temp scripts untracked without noting.

  **References**:
  - Server start: `src/server.js`.
  - Existing browser QA evidence patterns: `.omo/evidence/browser-policy-qa.json`.

  **Acceptance Criteria**:
  - [ ] `npm test` passes.
  - [ ] `npm --prefix frontend run type-check` passes.
  - [ ] `npm --prefix frontend run build` passes.
  - [ ] Browser QA artifacts exist.
  - [ ] No QA process or port remains alive.

  **QA Scenarios**:
  ```text
  Scenario: Regression suite
    Tool: Git Bash
    Steps: npm test
    Expected: all tests pass
    Evidence: .omo/evidence/operator-guide/task-7-npm-test.txt

  Scenario: Browser route sweep
    Tool: Browser use
    Steps: Playwright/Chrome opens /about-data, /admin/operator-guide anonymous, /admin/data-requests anonymous
    Expected: public FAQ visible; admin pages redirect or remain protected
    Evidence: .omo/evidence/operator-guide/task-7-browser-report.json and screenshots
  ```

  **Commit**: NO | This is verification after feature commits.

- [ ] 8. Prepare Opus/Claude review handoff

  **What to do**:
  - Write PR comment draft for Opus/Claude:
    - Review internal guide copy for operational clarity.
    - Review public FAQ for being transparent but not overexposing.
    - Check “하면 안 되는 말” list for tone.
    - Do not reintroduce AI/2차창작/무조건합법 framing.
  - Include explicit file ownership:
    - Claude/Opus: copy/policy review only.
    - Codex: route/tests/browser QA.

  **Must NOT do**:
  - Do not ask Claude/Opus to edit same files concurrently unless Codex has pushed and file ownership is frozen.

  **References**:
  - Coordination pattern: `docs/athletetime-agent-coordination.md`.
  - Existing PR comments pattern in PR #2.

  **Acceptance Criteria**:
  - [ ] PR comment draft exists in `.omo/drafts/athletetime-operator-guide-pr-comment.md`.
  - [ ] It lists exact files and review questions.

  **QA Scenarios**:
  ```text
  Scenario: Handoff content scan
    Tool: Git Bash
    Steps: rg -n "Claude|Opus|운영 가이드|공개 FAQ|금지" .omo/drafts/athletetime-operator-guide-pr-comment.md
    Expected: all required review topics present
    Evidence: .omo/evidence/operator-guide/task-8-handoff-scan.txt
  ```

  **Commit**: OPTIONAL | Include only if project convention commits `.omo/drafts`; otherwise PR comment directly.

## Final Verification Wave
- [ ] F1. Plan Compliance Audit
  - Confirm every implemented file maps to a TODO above.
  - Confirm no public surface exposes internal runbook details.
- [ ] F2. Code Quality Review
  - Run line-count check on new TS/TSX files.
  - If any hand-written file exceeds 250 pure LOC, split before commit.
- [ ] F3. Security Review
  - Scan for admin token, credential, incident threshold, person_no, birthdate, raw ID examples.
- [ ] F4. Browser Manual QA
  - Capture screenshots for public FAQ and admin redirect.
  - If admin-auth fixture exists, capture logged-in admin view.
- [ ] F5. PR/Opus Handoff
  - Post summary and review asks to PR #2 after commit/push.

## Commit Strategy
Recommended commits:
1. `test(operator): add admin guide contracts`
2. `feat(operator): add admin guide page`
3. `feat(data): add public operator FAQ summary`
4. `docs(operator): add review handoff` only if committing docs/drafts

Each commit must pass:
```powershell
npm test
npm --prefix frontend run type-check
```

Final branch before push must pass:
```powershell
npm test
npm --prefix frontend run type-check
npm --prefix frontend run build
git diff --check
```

## Success Criteria
- Admin/internal users have one clear place for legal/security/abuse response guidance.
- Public users can understand the service principles and request path without seeing attack/security playbooks.
- The page cannot be reached from public navigation.
- The public page does not contain internal escalation/security details.
- Tests prove the route/content boundary.
- Browser QA proves the real surfaces behave as intended.
