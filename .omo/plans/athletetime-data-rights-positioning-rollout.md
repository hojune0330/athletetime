# AthleteTime Data Rights Positioning Rollout

## TL;DR
> **Summary**: AthleteTime should keep the useful ambition, "large public athletics record search," but stop framing it as a loophole, a copied DB, an official ranking service, or an AI authority. Roll out one data-rights contract across policy constants, APIs, user-facing pages, admin workflows, Markdown docs, and regression tests.
> **Deliverables**:
> - Canonical data-rights/service-positioning contract
> - Source-tier registry and allowed-field matrix
> - Backend/API provenance, disclaimer, and suppression contracts
> - Frontend route-wide copy and trust UX alignment
> - Active Markdown policy/doc consolidation
> - Prohibited-claim, provenance, suppression, minor/share, and crawler-guard tests
> - Claude/Opus handoff report with separated ownership
> **Effort**: XL
> **Parallel**: YES, but only after the canonical contract is frozen
> **Critical Path**: Task 1 -> Task 2 -> Task 3 -> Task 5 -> Task 7/8/9 -> Task 10 -> Task 11/12/13/14 -> Task 15

## Context
### Original Request
The user asked to actively review the direction and create a plan to apply it across every page and every Markdown document. The direction is not "hide legal risk with fake delay" or "pretend a copied DB is a creative work." The direction is to build a durable public-record service that is useful enough to operate while reducing legal, privacy, DB-rights, and UX trust risks.

### Service Position
AthleteTime's safe and useful identity should be:

```text
AthleteTime은 공개된 경기 기록을 색인하고 정리해 보여주는 비공식 기록 탐색 서비스입니다.
공식 기록 서비스, 공식 랭킹, 원본 DB의 대체재가 아닙니다.
```

Short UI form:

```text
공개 경기기록을 모아 정리했어요. 공식 기록 서비스는 아니에요.
```

### Legal/Policy Anchors
This plan is not legal advice. It is an engineering and product-risk plan based on current official/public references:

- 개인정보보호위원회 says publicly available personal information can be considered under the legitimate-interest route only with purpose legitimacy, necessity, balancing, safety measures, and data-subject rights safeguards. Source: [PIPC public-data/AI guidance press release](https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=10362).
- 공공데이터포털 policy distinguishes license scopes and warns that third-party rights still matter. Source: [data.go.kr public data policy](https://www.data.go.kr/ugs/selectPortalPolicyView.do).
- 대한체육회 선수등록정보 exists as a public-data portal dataset, but must still be treated by license, field, and purpose scope. Source: [대한체육회_스포츠지원포털_선수등록정보](https://www.data.go.kr/data/15052695/fileData.do?recommendDataYn=Y).
- Korean Copyright Act Article 93 protects database producers against copying/transmitting all/substantial parts, and repeated/systematic use of small parts can still be treated as substantial if it conflicts with normal exploitation or harms producer interests. Source: [저작권법 제93조](https://www.law.go.kr/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=1000979107).

### Product Principle
The goal is not to become timid. The goal is to be bold in the product layer and conservative in the claim layer:

- Bold: search, compare, graph, season order, record discovery, share cards, community topics.
- Conservative: no "official DB," no "official ranking," no false manual review theater, no hidden person_no system, no raw source replacement, no mass export, no unnecessary minor amplification.

## Decisions
### D1. "Delayed Search" Is Not A Defense
Do not implement fake "we will search manually and show results in 3-4 days" behavior as a legal shield. If the service already holds records and the delay is just theater, it can damage trust and does not remove privacy, copyright, database, or terms-of-use risk. Real review queues are allowed only for correction, deindexing, disputed identity grouping, or high-risk ingestion.

### D2. Deletion Means Display/Search Suppression By Default
Original public result files are evidence and provenance material. The default remedy is not deleting raw source records from storage. The default remedy is one of:

- `under_review`: hide from search/recommendations/insights; mask in direct result tables if necessary.
- `search_hidden`: hide from search, profiles, generated analytics, share cards, and recommendation surfaces.
- `removed`: omit from all public display surfaces.
- `restored`: restore normal visibility.

Actual raw-data deletion is an exceptional admin/legal operation, not normal user-facing "delete."

### D3. Event Placing Is Different From Generated Ranking
Source event placing can be shown as a factual field when it came from the original public result. AthleteTime-generated season/all-time ordering must be labeled as:

```text
AthleteTime이 모은 기록 안에서 빠른 순서
```

Never label generated ordering as "전국 랭킹," "공식 순위," "대한육상연맹 랭킹," or equivalent.

### D4. Source Tiers
Every source must be tagged before it appears in search, API, charts, or docs:

| Tier | Name | MVP Use | Rules |
|---|---|---|---|
| A | Open public-data source | Allowed | Store source URL/license/capture date; follow license; no extra personal fields beyond purpose |
| B | Public web result/fact page | Conditional | Respect robots/terms; do not bulk mirror; source attribution required; no new blocked crawling |
| C | Restricted/blocked/private source | Blocked | Do not ingest or expose |
| L | Legacy frozen source | Read-only pending review | No new collection; existing facts can remain only if source, purpose, and takedown controls pass |

### D5. Allowed And Restricted Fields
Allowed factual record fields:

```text
athleteName, team/affiliation, event, record, source event placing,
competitionName, date/season, venue when public, division,
phase, wind, sourceUrl, capturedAt, sourceProvider, sourceTier
```

Restricted fields:

```text
person_no, resident/registration identifiers, birthdate/full age,
phone/email/address, login identifiers, photos unless separately licensed,
health/injury, school-contact/private notes, raw external internal IDs
```

`person_no` remains "judgment aid and discard" only for limited PoC if ever approved. It must not become a stored global identity key.

### D6. DB-Rights Non-Substitution Guardrail
AthleteTime should not become a substitute for any original source database:

- No full dump or bulk export.
- No source-like schema/table browsing that reconstructs the provider's product.
- No "complete national DB" wording.
- No API designed for third parties to bulk harvest the same source.
- No direct mirroring of original source layouts.
- Always transform into user tasks: athlete search, event record trail, source-linked card, season order within indexed scope, correction/deindexing.

### D7. Source Attribution Granularity
Attribution must exist at four layers:

- Per API response for record-heavy endpoints.
- Per result row or row group where feasible.
- Per page/card where records are summarized.
- On `/about-data` as a plain explanation of source categories and limits.

### D8. Active Scope
This plan applies to the current repository and branch:

```text
C:\Users\SAMSUNG\Documents\2026 첫프젝\2026-first-item
```

If a separate `athletetime` repo/app is the production runtime, mirror or port this contract there only after Task 1 identifies the deployed source of truth.

## Work Objectives
### Must Have
- One canonical policy contract consumed or mirrored by frontend, backend, docs, and tests.
- Route-wide copy alignment for every public/admin page that exposes records, search, profiles, cards, community prompts, or data requests.
- API responses that carry source metadata, scope disclaimers, correction/deindexing path, and no restricted identifiers.
- Docs that use the same words as the product, not old "loophole," "2차 창작으로 회피," or "official DB" framing.
- Tests that fail when banned public claims or missing source metadata return.
- A Claude/Opus handoff that clearly separates copy/docs review from backend/API/test work.

### Must NOT Have
- No fake manual-search delay.
- No claim that legal risk is fully solved.
- No "AI 인사이트" positioning for public record pages.
- No official ranking/service claims.
- No new crawler for blocked/robots-disallowed sources.
- No person_no bulk normalization or stored global athlete ID.
- No deletion of real public result originals as the ordinary remedy.
- No unreviewed sample/fake athlete examples in production UI.

## Verification Strategy
> Planning stage only. Implementation must be verified later by commands, API calls, and browser QA.

Required implementation verification:

```powershell
git status --short --branch
npm test
npm --prefix frontend run type-check
npm --prefix frontend run build
rg -n "전국 랭킹|공식 순위|공식 기록 서비스입니다|완전한 선수 DB|선수 데이터베이스|법적 회피|AI 인사이트|2차 창작물|person_no.*저장" frontend src card-studio docs
```

Browser route sweep:

```text
/
/records
/athlete/:id
/about-data
/data-request
/competitions
/competitions?tab=results
/competitions?tab=search
/profile-card
/pacerise
/community
/marketplace
/pace-calculator
/training-calculator
/admin/data-requests
```

## Execution Strategy
### Parallel Waves
Wave 0: Task 1 only.

Wave 1: Tasks 2 and 3. Task 3 blocks most implementation.

Wave 2: Tasks 4, 5, 6. Backend/API/admin policy alignment can proceed once the contract exists.

Wave 3: Tasks 7, 8, 9. Frontend routes can split by ownership.

Wave 4: Tasks 10, 11, 12. Docs and tests can run after copy/API decisions are stable.

Wave 5: Tasks 13, 14, 15. Full QA, security scan, PR/handoff.

### Agent Ownership
Codex should own:

- Shared policy data structure and adapters.
- Backend/API provenance and suppression contract.
- Static/API tests and browser QA evidence.
- Security scan, crawler guards, sample-data removal.

Claude/Opus should own:

- Korean microcopy review.
- Markdown policy/doc harmonization.
- UX tone review for pages after Codex makes structural/API changes.
- PR review comments that flag overclaim, legalese, and confusing wording.

Both agents must not edit the same files in the same wave without a file lock.

## TODOs

- [ ] 1. Synchronize Runtime Scope, Branch, And File Locks

  **What to do**: Fetch remote state, inspect PR #2, identify whether `card-studio`, `src`, `backend`, or a sibling `athletetime` app is the production runtime, and write a short execution lock note. Decide whether mirrored `src/DATA_POLICY.js` and `card-studio/DATA_POLICY.js` are active, legacy, or both.

  **Must NOT do**: Do not start source edits before the runtime source of truth is known. Do not overwrite Claude/Opus changes.

  **Parallelization**: Can Parallel: NO | Wave 0 | Blocks: all tasks | Blocked By: none

  **References**:
  - `frontend/src/App.tsx`
  - `card-studio/routes/publicRoutes.js`
  - `card-studio/services/searchService.js`
  - `src/DATA_POLICY.js`
  - `card-studio/DATA_POLICY.js`
  - `backend/tests/athlete-user-ux.test.js`

  **Acceptance Criteria**:
  - [ ] Current branch, HEAD, origin HEAD, and PR number are recorded.
  - [ ] Active runtime tree is identified.
  - [ ] File locks for Codex and Claude/Opus are recorded.
  - [ ] Duplicate/legacy policy files are classified as active, mirrored, or deprecated.

  **QA Scenarios**:
  ```text
  Scenario: Remote changed during planning
    Tool: powershell
    Steps: Run git fetch and compare HEAD with origin branch.
    Expected: Executor pauses overlapping edits and records required rebase/merge path.
    Evidence: .omo/evidence/data-rights-task-1-sync.md
  ```

  **Commit**: NO | Evidence only

- [ ] 2. Create Complete Surface Inventory

  **What to do**: Produce a machine-checkable inventory of every route, component, API, service, and Markdown file that can affect data-rights positioning. Categorize each item as `record-heavy`, `trust-copy`, `admin`, `docs-active`, `docs-archive`, or `exclude-design-example`.

  **Must NOT do**: Do not blindly edit design-system sample docs or historical evidence as if they were product copy. Mark them separately.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 7, 8, 9, 10, 11 | Blocked By: 1

  **References**:
  - `frontend/src/App.tsx`
  - `frontend/src/components/common/DataNotice.tsx`
  - `frontend/src/components/layout/Footer.tsx`
  - `frontend/src/config/dataPolicy.ts`
  - `docs/`
  - `.omo/evidence/`

  **Acceptance Criteria**:
  - [ ] Inventory lists all public routes from `App.tsx`.
  - [ ] Inventory lists record-heavy components and API clients.
  - [ ] Inventory lists all active policy Markdown docs.
  - [ ] Inventory explicitly excludes generated evidence and design-kit examples from public-copy enforcement unless they are user-facing.

  **QA Scenarios**:
  ```text
  Scenario: Route coverage
    Tool: powershell
    Steps: Extract paths from App.tsx and compare against the inventory.
    Expected: Every route is categorized.
    Evidence: .omo/evidence/data-rights-task-2-route-inventory.md
  ```

  **Commit**: YES | Message: `docs(policy): inventory data-rights surfaces`

- [ ] 3. Define Canonical Data-Rights Contract

  **What to do**: Add a shared contract that defines service positioning, source tiers, allowed/restricted fields, prohibited claims, generated-order wording, source attribution requirements, correction/deindexing copy, and minor/share-card guardrails. Prefer a language-neutral contract such as `shared/dataRightsPolicy.json`, with frontend/backend adapters if feasible. If that is too large for the first implementation, update `frontend/src/config/dataPolicy.ts` and a backend mirror with a test that checks phrase parity.

  **Must NOT do**: Do not leave `DataNotice.tsx`, backend disclaimers, and docs as independent hand-written copies that can drift.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4, 5, 6, 7, 8, 9, 10, 11, 12 | Blocked By: 1

  **References**:
  - `frontend/src/config/dataPolicy.ts`
  - `frontend/src/components/common/DataNotice.tsx`
  - `card-studio/services/recordAnalyticsService.js`
  - `card-studio/services/publicDataService.js`
  - `docs/athletetime-current-copy-source.md`

  **Acceptance Criteria**:
  - [ ] Canonical long and short service-positioning phrases exist.
  - [ ] Source tiers A/B/C/L exist.
  - [ ] Allowed/restricted field matrix exists.
  - [ ] Banned claims include official ranking, official DB, legal loophole, AI authority, complete national DB, person_no storage.
  - [ ] Correction/deindexing copy routes to `/data-request`.
  - [ ] Frontend `DataNotice` uses contract constants or adapter output.

  **QA Scenarios**:
  ```text
  Scenario: Contract parity
    Tool: powershell/node
    Steps: Load frontend and backend policy adapters or shared JSON.
    Expected: Short notice, source-tier names, banned terms, and request path match.
    Evidence: .omo/evidence/data-rights-task-3-contract-parity.txt
  ```

  **Commit**: YES | Message: `feat(policy): add data-rights positioning contract`

- [ ] 4. Replace Legacy Policy And Risky Source Labels

  **What to do**: Replace old policy language such as "creative content tool," "2차 창작물" as a rights workaround, "KAAF 공식 데이터 import," and `sourceType: official_result` where it creates endorsement/ranking confusion. Use `public_result`, `public_record_source`, `indexed_public_record`, or source-tier terms instead.

  **Must NOT do**: Do not erase source attribution. The provider name can remain as a source attribution when factual, but not as "official partnership" or "official service" positioning.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 5, 11, 12 | Blocked By: 3

  **References**:
  - `src/DATA_POLICY.js`
  - `card-studio/DATA_POLICY.js`
  - `src/services/competitionService.js`
  - `card-studio/services/competitionService.js`
  - `card-studio/services/searchService.js`
  - `card-studio/routes/publicRoutes.js`

  **Acceptance Criteria**:
  - [ ] Public-facing/runtime labels no longer use `official_result` where it implies endorsement.
  - [ ] Policy files no longer position "2차 창작" as a legal bypass.
  - [ ] Provider/source names are still visible where appropriate.
  - [ ] Legacy files are either updated or marked deprecated.

  **QA Scenarios**:
  ```text
  Scenario: Source-label scan
    Tool: powershell
    Steps: rg for official_result, 공식 데이터, 2차 창작물, creative content tool.
    Expected: No runtime/public copy violations remain; historical docs are allowed only with explicit "do not use" context.
    Evidence: .omo/evidence/data-rights-task-4-source-label-scan.txt
  ```

  **Commit**: YES | Message: `fix(policy): remove official-db and workaround framing`

- [ ] 5. Normalize API Provenance And Source Scope

  **What to do**: Ensure every record-heavy API returns source metadata and scope metadata. Suggested response fields: `sourceProvider`, `sourceUrl`, `sourceTier`, `capturedAt`, `scopeNotice`, `officialStatus`, `correctionUrl`, `generatedOrderNotice`.

  **Must NOT do**: Do not leak `person_no`, birthdate, raw external internal IDs, private request contact fields, or source credentials.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7, 8, 9, 12 | Blocked By: 3, 4

  **References**:
  - `card-studio/services/searchService.js`
  - `card-studio/services/recordAnalyticsService.js`
  - `card-studio/services/publicDataService.js`
  - `card-studio/routes/publicRoutes.js`
  - `card-studio/routes/publicDataRoutes.js`
  - `frontend/src/api/recordAnalytics.ts`
  - `frontend/src/api/competitions.ts`

  **Acceptance Criteria**:
  - [ ] Search responses include source and correction path.
  - [ ] Athlete analytics responses include source scope and official-status disclaimer.
  - [ ] Season/generated order responses include "indexed records order" notice.
  - [ ] Public data aggregate responses include source/license and anonymous-aggregate scope.
  - [ ] API outputs contain no restricted identifiers.

  **QA Scenarios**:
  ```text
  Scenario: Record API provenance
    Tool: curl + jq/node
    Steps: Request search, athlete analytics, and season-record endpoints.
    Expected: Every response has source/scope/correction fields and no restricted fields.
    Evidence: .omo/evidence/data-rights-task-5-api-provenance.json
  ```

  **Commit**: YES | Message: `feat(api): attach source scope to record responses`

- [ ] 6. Harden Data Request, Suppression, Admin Privacy

  **What to do**: Align request statuses with D2, tighten matching precision, redact contact/reason fields from non-admin responses, document retention, and use atomic writes or state the single-admin limitation if file-based JSON remains.

  **Must NOT do**: Do not expose request contact details in public ticket lookup. Do not over-hide same-name athletes without event/date/sourceId where available.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7, 8, 9, 12, 14 | Blocked By: 3

  **References**:
  - `card-studio/services/dataRequestService.js`
  - `card-studio/routes/publicRoutes.js`
  - `card-studio/routes/adminRoutes.js`
  - `frontend/src/api/dataRequests.ts`
  - `frontend/src/pages/admin/AdminDataRequestsPage.tsx`
  - `frontend/src/pages/DataRequestPage.tsx`

  **Acceptance Criteria**:
  - [ ] Public ticket lookup does not return private contact fields.
  - [ ] Admin-only endpoints require admin path/auth guard.
  - [ ] `under_review`, `search_hidden`, `removed`, `restored` behavior is documented in code-facing policy.
  - [ ] Matching uses event/date/source identifiers when available.
  - [ ] Generated request JSON remains gitignored.

  **QA Scenarios**:
  ```text
  Scenario: Public lookup redaction
    Tool: curl
    Steps: Create test request, retrieve public ticket.
    Expected: Status and receipt appear, but contact/reason internals are redacted or minimized.
    Evidence: .omo/evidence/data-rights-task-6-ticket-redaction.json

  Scenario: Suppression precision
    Tool: curl
    Steps: Submit request with same-name athlete plus event/date if possible.
    Expected: Only matching target is suppressed; unrelated same-name rows remain.
    Evidence: .omo/evidence/data-rights-task-6-suppression-precision.json
  ```

  **Commit**: YES | Message: `fix(requests): clarify deindex states and protect request data`

- [ ] 7. Align Global Trust UX

  **What to do**: Update global trust surfaces: `DataNotice`, `Footer`, `Header`, `Sidebar`, `/about-data`, and `/data-request`. The global UX should be short like Toss/Google, with detail behind links. Footer should not carry long legal-defense paragraphs or "AI 인사이트" language.

  **Must NOT do**: Do not turn every page bottom into a legal wall. Do not remove the correction/deindexing path.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 13 | Blocked By: 3, 5, 6

  **References**:
  - `frontend/src/components/common/DataNotice.tsx`
  - `frontend/src/components/layout/Footer.tsx`
  - `frontend/src/components/layout/Header.tsx`
  - `frontend/src/components/layout/Sidebar.tsx`
  - `frontend/src/pages/AboutDataPage.tsx`
  - `frontend/src/pages/DataRequestPage.tsx`

  **Acceptance Criteria**:
  - [ ] Footer uses one-line trust copy and links to `/about-data` and `/data-request`.
  - [ ] `/about-data` explains sources, limits, field policy, minors, and deindexing in plain Korean.
  - [ ] `/data-request` uses "정정/비노출/검색 제외" as the primary wording, not "delete everything."
  - [ ] Header/sidebar do not imply official DB or ranking.

  **QA Scenarios**:
  ```text
  Scenario: Global trust route
    Tool: browser
    Steps: Open /records, click about-data and data-request links.
    Expected: User can understand source/limits/request flow within short copy blocks.
    Evidence: .omo/evidence/data-rights-task-7-global-trust.png
  ```

  **Commit**: YES | Message: `feat(ui): align global data trust copy`

- [ ] 8. Align Records, Athlete Detail, Share, Compare, And Graph Surfaces

  **What to do**: Apply the contract to the highest-risk athlete surfaces: `/records`, `/athlete/:id`, `ShareCard`, `CompareView`, `AthleteEventTrail`, and `recordInsights`. Show useful stats while clearly labeling scope, source, ambiguity, and correction path.

  **Must NOT do**: Do not call generated season tables "ranking." Do not auto-merge same-name athletes. Do not show source-less share cards.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 11, 12, 13 | Blocked By: 3, 5, 6

  **References**:
  - `frontend/src/pages/RecordsPage.tsx`
  - `frontend/src/pages/AthleteDetailPage.tsx`
  - `frontend/src/components/record-insights/ShareCard.tsx`
  - `frontend/src/components/record-insights/CompareView.tsx`
  - `frontend/src/components/record-insights/AthleteEventTrail.tsx`
  - `frontend/src/lib/recordInsights.ts`

  **Acceptance Criteria**:
  - [ ] Search empty state is real-user oriented and contains no fake example athlete.
  - [ ] Search results show ambiguity when same-name athletes exist.
  - [ ] Athlete detail shows source, capture/scope, correction path, and non-official notice.
  - [ ] Share cards include source/watermark and cannot present official ranking.
  - [ ] Generated charts/tables use "모은 기록 안에서" language.

  **QA Scenarios**:
  ```text
  Scenario: Athlete search and detail
    Tool: browser
    Steps: Open /records, search a real name, open a result.
    Expected: Results are useful, source-scoped, and non-official.
    Evidence: .omo/evidence/data-rights-task-8-records-detail.png

  Scenario: Share-card guard
    Tool: browser
    Steps: Open share card from athlete/insight surface.
    Expected: Source/watermark/correction copy is visible; no official ranking language.
    Evidence: .omo/evidence/data-rights-task-8-share-card.png
  ```

  **Commit**: YES | Message: `feat(records): apply data-rights trust contract`

- [ ] 9. Align Competitions, Home, Profile Cards, PaceRise, Community, Marketplace, And Utilities

  **What to do**: Sweep the remaining routed pages. Only record/data-adjacent surfaces need explicit data-rights copy; purely utility pages should avoid unnecessary legal noise. Home should route users to real self-search, not sample examples. Community should avoid turning record facts into harassment or official judgment.

  **Must NOT do**: Do not force a long notice onto calculators or marketplace pages unless record data appears. Do not keep "example athlete" screens.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 11, 13 | Blocked By: 3, 5, 6

  **References**:
  - `frontend/src/pages/MainPage.tsx`
  - `frontend/src/pages/CompetitionsPage.tsx`
  - `frontend/src/pages/ProfileCardPage.tsx`
  - `frontend/src/pages/PaceRisePage.tsx`
  - `frontend/src/pages/CommunityPage.tsx`
  - `frontend/src/pages/MarketplacePage.tsx`
  - `frontend/src/pages/PaceCalculatorPage.tsx`
  - `frontend/src/pages/TrainingCalculatorPage.tsx`
  - `frontend/src/pages/ScheduleCardPage.tsx`

  **Acceptance Criteria**:
  - [ ] Home has no fake athlete/example prompt that competes with user self-search.
  - [ ] Competitions/results distinguish source event placing from generated order.
  - [ ] Profile card/schedule card include source when generated from records.
  - [ ] PaceRise preserves third-party source-chain disclosure.
  - [ ] Community 401/error states are Korean, user-readable, and not raw debug output.
  - [ ] Marketplace/calculators are not cluttered with irrelevant legal copy.

  **QA Scenarios**:
  ```text
  Scenario: Route sweep
    Tool: browser
    Steps: Visit all App.tsx public routes.
    Expected: No raw errors, fake athlete examples, official ranking claims, or broken trust links.
    Evidence: .omo/evidence/data-rights-task-9-route-sweep.md
  ```

  **Commit**: YES | Message: `feat(ui): align remaining route trust surfaces`

- [ ] 10. Consolidate Active Markdown Docs

  **What to do**: Update active Markdown docs so they repeat one consistent policy. Add a "Canonical Data Rights Position" section to the master doc, then cross-link dependent docs. Archive or annotate stale docs that still point to GitHub Issues instead of `/data-request`, or still imply person_no storage or legal bypass.

  **Must NOT do**: Do not rewrite historical evidence logs. Do not use docs to claim the service is legally risk-free.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 11, 15 | Blocked By: 3, 4, 6

  **References**:
  - `docs/athletetime-data-strategy-master.md`
  - `docs/athletetime-data-acquisition-legal-review.md`
  - `docs/data-privacy-guardrails.md`
  - `docs/athletetime-current-copy-source.md`
  - `docs/athletetime-records-microcopy.md`
  - `docs/athletetime-copy-proposals.md`
  - `docs/athletetime-identity-roi-decision.md`
  - `docs/athletetime-record-insight-strategy.md`
  - `docs/athletetime-agent-coordination.md`
  - `docs/cleanup-inventory.md`

  **Acceptance Criteria**:
  - [ ] Master doc contains canonical service position, source tiers, field matrix, DB-rights guardrail, suppression policy, minor policy.
  - [ ] Microcopy docs match the contract phrases.
  - [ ] Legal review avoids "public domain = free use" absolutes.
  - [ ] Any GitHub-Issue correction path is replaced with `/data-request` unless explicitly historical.
  - [ ] person_no docs say "judgment aid and discard," not storage.

  **QA Scenarios**:
  ```text
  Scenario: Docs policy scan
    Tool: powershell
    Steps: rg docs for banned/obsolete terms and stale request-channel guidance.
    Expected: Violations are removed or marked historical with a clear reason.
    Evidence: .omo/evidence/data-rights-task-10-docs-scan.txt
  ```

  **Commit**: YES | Message: `docs(policy): consolidate data-rights guardrails`

- [ ] 11. Add Static Copy And Policy Regression Tests

  **What to do**: Add or extend tests that scan frontend, backend/runtime policy files, and active docs for prohibited claims and missing canonical phrases. Use an allowlist for contexts like "공식 기록 서비스는 아니에요" so the test does not fail on safe negation.

  **Must NOT do**: Do not create a naive grep that blocks every occurrence of "공식" even in "공식 아님."

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 13, 15 | Blocked By: 3, 4, 7, 8, 9, 10

  **References**:
  - `backend/tests/athlete-user-ux.test.js`
  - `backend/tests/auth-public-routes.test.js`
  - `frontend/src/config/dataPolicy.ts`
  - `docs/athletetime-current-copy-source.md`

  **Acceptance Criteria**:
  - [ ] Test fails on official DB/ranking/AI authority/legal loophole claims.
  - [ ] Test passes safe negations like "공식 기록 서비스는 아니에요."
  - [ ] Test checks no production UI contains fake athlete example copy.
  - [ ] Test checks canonical request path `/data-request`.

  **QA Scenarios**:
  ```text
  Scenario: Bad phrase fixture
    Tool: npm test
    Steps: Add test fixture or inline assertion for "전국 공식 랭킹."
    Expected: The policy test would reject it.
    Evidence: .omo/evidence/data-rights-task-11-policy-test.txt
  ```

  **Commit**: YES | Message: `test(policy): guard data-rights public claims`

- [ ] 12. Add API, Suppression, And Minor/Share Regression Tests

  **What to do**: Add tests for record-heavy API provenance, restricted-field absence, suppression lifecycle, generated-order wording, and minor/share guardrails. If full e2e setup is too heavy, use service-level tests plus curl smoke evidence.

  **Must NOT do**: Do not commit generated request JSON or real sensitive payloads.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 13, 15 | Blocked By: 5, 6, 8

  **References**:
  - `card-studio/services/dataRequestService.js`
  - `card-studio/services/searchService.js`
  - `card-studio/services/recordAnalyticsService.js`
  - `card-studio/routes/publicRoutes.js`
  - `backend/tests/`

  **Acceptance Criteria**:
  - [ ] Search/analytics responses include source and correction metadata.
  - [ ] No API response includes `person_no`, birthdate, or raw external internal ID.
  - [ ] `under_review`, `search_hidden`, `removed`, `restored` lifecycle is verified.
  - [ ] Generated season ordering includes "indexed records" notice.
  - [ ] Minor/share surfaces include caution/source/watermark checks where data allows.

  **QA Scenarios**:
  ```text
  Scenario: Suppression lifecycle
    Tool: npm test or curl
    Steps: Create test request, move through statuses, query search/analytics/result views.
    Expected: Visibility matches D2 and original source rows are preserved.
    Evidence: .omo/evidence/data-rights-task-12-suppression-lifecycle.json
  ```

  **Commit**: YES | Message: `test(api): verify provenance and deindex policy`

- [ ] 13. Run Browser QA And Encoding Review

  **What to do**: Use the in-app browser or Playwright to visually verify core routes. Korean copy must render correctly, notices must be short, and mobile pages must remain scannable. Capture screenshots and console logs.

  **Must NOT do**: Do not accept mojibake or raw English API errors as "minor."

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: 15 | Blocked By: 7, 8, 9, 11, 12

  **References**:
  - `frontend/src/App.tsx`
  - `frontend/src/pages/RecordsPage.tsx`
  - `frontend/src/pages/AboutDataPage.tsx`
  - `frontend/src/pages/DataRequestPage.tsx`
  - `frontend/src/pages/CompetitionsPage.tsx`

  **Acceptance Criteria**:
  - [ ] Desktop screenshots exist for all core record/data routes.
  - [ ] Mobile screenshots exist for `/`, `/records`, `/about-data`, `/data-request`, `/competitions`.
  - [ ] Console errors are absent or documented as nonblocking.
  - [ ] Korean copy renders correctly.

  **QA Scenarios**:
  ```text
  Scenario: Mobile records user
    Tool: browser
    Steps: Open /records on mobile, search a real name, inspect result and trust copy.
    Expected: Search is usable and trust copy is short.
    Evidence: .omo/evidence/data-rights-task-13-mobile-records.png
  ```

  **Commit**: NO | Evidence only

- [ ] 14. Security, Crawler, Sample Data, And Operational Guard Scan

  **What to do**: Re-check secrets, debug strings, fake/sample data, legacy crawler entry points, robots-blocked host guards, request-retention risk, and admin exposure. This is the "do not ship embarrassment" pass.

  **Must NOT do**: Do not remove real public result data just because it contains real athlete names. Do remove fake/demo players and misleading sample UI.

  **Parallelization**: Can Parallel: YES | Wave 5 | Blocks: 15 | Blocked By: 6, 11, 12

  **References**:
  - `lib/crawlPolicy.js`
  - `card-studio/services/dataRequestService.js`
  - `card-studio/services/publicDataService.js`
  - `frontend/src/data/athleteRecords.ts`
  - `.gitignore`
  - `data/requests/`
  - `data/results/`

  **Acceptance Criteria**:
  - [ ] No hardcoded admin secrets or JWT secrets.
  - [ ] No production sample athlete data remains.
  - [ ] `data/requests/*.json` remains ignored.
  - [ ] Blocked legacy collection hosts remain blocked by test or documented check.
  - [ ] Request contact/reason retention policy is documented.
  - [ ] No raw stack/debug error is visible in public UI.

  **QA Scenarios**:
  ```text
  Scenario: Security grep
    Tool: powershell
    Steps: rg for common secret/default/demo strings and sample athlete labels.
    Expected: No production leak or fake-data residue.
    Evidence: .omo/evidence/data-rights-task-14-security-scan.txt
  ```

  **Commit**: YES | Message: `chore(security): remove demo residue and guard collection paths`

- [ ] 15. Publish PR Report And Claude/Opus Handoff

  **What to do**: Write a PR comment/report summarizing what changed, what was intentionally not changed, test evidence, residual risks, and Claude/Opus review asks. Include exact files or areas Claude/Opus should review for wording and docs.

  **Must NOT do**: Do not claim legal certainty. Do not push if branch is behind remote or evidence contains request contact data.

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: final delivery | Blocked By: 13, 14

  **References**:
  - PR #2: `https://github.com/hojune0330/2026-first-item/pull/2`
  - `docs/athletetime-agent-coordination.md`
  - `.omo/evidence/`

  **Acceptance Criteria**:
  - [ ] PR comment includes implementation summary and evidence.
  - [ ] Residual risks are listed plainly.
  - [ ] Claude/Opus receives review instructions for copy/docs, not overlapping backend edits.
  - [ ] User gets a Korean report that explains the decision in non-expert terms.

  **QA Scenarios**:
  ```text
  Scenario: Handoff clarity
    Tool: github/pr comment
    Steps: Review final PR comment before posting.
    Expected: A future agent can continue without rediscovering policy decisions.
    Evidence: .omo/evidence/data-rights-task-15-pr-handoff.md
  ```

  **Commit**: YES | Message: `chore(project): report data-rights rollout evidence`

## Final Review Checklist
- [ ] Contract exists and is the source of truth.
- [ ] Runtime labels do not imply official service, official ranking, complete DB, AI authority, or legal loophole.
- [ ] Source attribution appears in APIs and UI where records are shown.
- [ ] Correction/deindexing is easy to find and does not promise impossible deletion.
- [ ] Suppressed records do not leak through search, insights, share cards, or generated analytics.
- [ ] Raw public records are preserved unless exceptional admin/legal deletion is explicitly chosen.
- [ ] Public-data and public-web sources are tiered before use.
- [ ] Minor-related surfaces avoid scouting, potential, humiliation, or sensational language.
- [ ] Docs match product copy.
- [ ] Tests and browser QA evidence exist.

## Success Criteria
- A runner can search their own name and understand what the site has, where it came from, and how to correct or hide it.
- A parent or coach can understand that the service is not an official federation database.
- A provider or federation reviewing the site sees attribution, limited scope, no bulk substitute product, and a real objection workflow.
- The product remains interesting: search, graphs, season order, share cards, and community topics survive, but their claims are scoped.
- Codex and Claude/Opus can continue simultaneously without policy drift.
