# Records UX Trust Improvement

## TL;DR
> Summary:      Improve public record lookup trust and share clarity with reversible UX changes first, then run evidence-gated security/privacy hardening, while keeping owner-only decisions isolated.
> Deliverables:
> - Safe public record UX changes for canonical sharing, same-name context, mobile controls, team scope clarity, and minimum-data request copy.
> - Evidence-first security gates for blinded responses, anonymous IDs, auth enumeration, admin bootstrap, and Cloudinary uploads.
> - Explicit owner decision gates for any suppression threshold, identity/ownership language, or chat expansion.
> Effort:       Large
> Risk:         Medium - public privacy/security boundaries are involved, but most UX work is reversible and already has focused tests.

## Execution status (2026-08-09)
- Completed: canonical public athlete sharing in `5e8a51b`. Search, compare, and device-local collection state are removed from copied links; valid dedicated-athlete detail state remains shareable.
- Completed: blinded comments are removed by the database query before list, detail, or post-update responses are shaped in `0e541f2`.
- Completed: the record-collection name field no longer opens the mobile keyboard before a user taps it in `13fdd94`.
- Verified without a new change: candidate cards and athlete pages already keep a same-name caution, affiliation, and observed-season context visible; they do not auto-merge people.
- Deliberately deferred for an owner decision: public team suppression for small groups, account-backed private notes/photos, default redaction of minor share cards, anonymous-session identity migration, and any verified-owner/claim language.
- Verification note: focused frontend, build, Node privacy, and real-browser record-flow gates passed. The root `npm test` runner exceeded the tool capture window and exited later without a captured final summary, so it is not counted as a passed gate.

## Scope
### Must have
- Preserve the device-local record collection boundary: selected candidates/workspaces are local helper state only, not verified, owned, certified, or merged identity.
- Keep same-name candidates separate and make the same-name context persistent on search, mine, athlete, and workspace surfaces.
- Create canonical public share URLs that strip transient/local state such as `flow`, `step`, `mineDraft`, search recovery state, workspace draft state, and search `from` hints.
- Ensure shared record/team links open useful result/detail surfaces instead of the generic hub.
- Improve mobile fixed-bar behavior, focus recovery, minimum touch targets, and busy states for the record lookup flow.
- Improve team public aggregate scope/coverage clarity without exposing athlete names, athlete keys, raw records, local workspace data, or private fields.
- Keep the data request form minimum-data: required athlete identifier and reason only; affiliation, event, competition, contact stay optional.
- Verify security reports from source and tests before fixing: blinded/comment response filtering, anonymous client-chosen IDs, auth enumeration, dev admin bootstrap, and Cloudinary public uploads.
- Add hard regression gates around public DTO minimization, Cloudinary private-data exclusion, and generic auth/security response copy.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- Must not call record collections verified, owned, claimed, certified, official, or merged.
- Must not auto-merge same-name candidates or infer identity from matching names.
- Must not expose team member names, athlete keys, raw record rows, workspace IDs, local storage contents, or private source metadata through team public DTOs.
- Must not add suppression below 5 athletes unless the owner explicitly approves it in the owner gate.
- Must not store private memo text, private photos, sensitive filenames, or private metadata in public Cloudinary uploads.
- Must not expand chat, add new chat surfaces, or route record workflows through chat.
- Must not include team UI encoding repair. Based on verified correction, team UI source is UTF-8 and Korean text reads correctly.
- Must not treat persona/security reports as facts until validated by source-level tests or failing probes.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: tests-after + Node `node --test`, frontend Vitest, TypeScript build, and Playwright real Chrome E2E
- QA policy: every task has agent-executed scenarios
- Evidence: `.omo/evidence/task-<N>-<slug>.<ext>`

## Execution strategy
### Parallel execution waves
> Target 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks to maximize parallelism.

Wave 1 (no dependencies):
- Task 1: Evidence baseline and source-level trust assertions
- Task 2: Canonical public share URL helper and athlete share integration
- Task 3: Persistent same-name context on candidate surfaces
- Task 4: Mobile fixed-bar, focus, touch, and busy-state polish
- Task 5: Minimum-data request and device-local labels

Wave 2 (after Wave 1):
- Task 6: Shared-link result-first routing and recovery
- Task 7: Team aggregate scope and coverage clarity
- Task 8: Security/privacy verification gates
- Task 9: Public response filtering for blinded posts/comments/votes
- Task 10: Cloudinary public upload private-data gate

Wave 3 (after Wave 2):
- Task 11: Anonymous identity and auth enumeration hardening
- Task 12: Owner decision gates and deferred-scope ledger

Critical path: Task 1 -> Task 8 -> Task 9 -> Task 11 -> Task 12

### Dependency matrix
| Task | Depends on | Blocks | Can parallelize with |
|------|------------|--------|----------------------|
| 1    | none       | 6, 7, 8, 9, 10, 11, 12 | 2, 3, 4, 5 |
| 2    | none       | 6 | 1, 3, 4, 5 |
| 3    | none       | 6 | 1, 2, 4, 5 |
| 4    | none       | 6 | 1, 2, 3, 5 |
| 5    | none       | 12 | 1, 2, 3, 4 |
| 6    | 1, 2, 3, 4 | final UX QA | 7, 8, 9, 10 |
| 7    | 1 | 12 | 6, 8, 9, 10 |
| 8    | 1 | 9, 10, 11, 12 | 6, 7 |
| 9    | 1, 8 | 11 | 6, 7, 10 |
| 10   | 1, 8 | 12 | 6, 7, 9 |
| 11   | 1, 8, 9 | 12 | none |
| 12   | 1, 5, 7, 8, 10, 11 | final verification | none |

## Todos
> Implementation + Test = ONE task. Never separate.
> Every task MUST have: References + Acceptance Criteria + QA Scenarios + Commit.

- [ ] 1. Evidence baseline and source-level trust assertions

  What to do: Create a baseline evidence script or focused test additions that prove current record UX/security assumptions before feature changes. Capture current URL behavior, same-name boundaries, team DTO minimization, data request required fields, post/comment blind filtering gaps, anonymous ID trust, auth bootstrap gates, and Cloudinary upload options. Record any false persona/security claims as hypotheses rejected by tests.
  Must NOT do: Do not change product behavior in this task. Do not include team UI encoding repair. Do not overwrite unrelated working-tree changes.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [6, 7, 8, 9, 10, 11, 12] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `backend/tests/records-flow-e2e.test.js:14` - evidence gating pattern for browser runs.
  - Pattern:  `backend/tests/records-flow-e2e-fixture.js:184` - writes `.omo/evidence` only when `WRITE_E2E_EVIDENCE=1`.
  - Pattern:  `backend/tests/record-workspace-preview-service.test.js:62` - same-name profiles remain distinct and private fields are absent.
  - Pattern:  `frontend/src/features/team-performance/teamPerformanceContracts.test.ts:42` - injected raw `records` field is stripped at frontend boundary.
  - Pattern:  `backend/tests/team-performance-api.test.js:124` - HTTP team detail contains no raw athlete rows and has cache policy.
  - Pattern:  `backend/routes/posts.js:262` - post detail comment subquery includes `is_blinded`; verify current filtering.
  - Pattern:  `backend/routes/comments.js:114` - comment-create rehydration includes comments; verify current filtering.
  - Pattern:  `backend/routes/votes.js:130` - vote rehydration includes comments; verify current filtering.
  - Pattern:  `backend/auth/routes.js:1355` - `set-admin` route is registered only when not production.
  - External: `https://playwright.dev/docs/test-assertions` - use stable auto-waiting assertions.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/records-flow-e2e.test.js` passes before behavior changes.
  - [ ] `npm --prefix frontend test -- --run src/features/team-performance/teamPerformanceContracts.test.ts src/features/team-performance/TeamPerformanceSections.test.tsx src/components/records/TeamStatisticsResults.test.tsx` passes before team work.
  - [ ] `node --test backend/tests/record-workspace-preview-service.test.js backend/tests/team-performance-api.test.js backend/tests/auth-admin-bootstrap-production.test.js backend/tests/auth-security-readiness.test.js backend/tests/cloudinary-contract.test.js` passes or produces a captured pre-fix failure list.
  - [ ] `.omo/evidence/task-1-records-ux-trust-baseline.json` exists and lists each validated hypothesis as `confirmed`, `rejected`, or `inconclusive` with file references.

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: Baseline browser record flow
    Tool:     bash
    Steps:    WRITE_E2E_EVIDENCE=1 node --test backend/tests/records-flow-e2e.test.js
    Expected: Command exits 0 and .omo/evidence/track-j-records-e2e-replacement/records-flow-e2e-results.json contains visited /records, /records?athlete=alpha-2016, and /records/teams/<16-hex-key> URLs with empty consoleErrors/pageErrors arrays.
    Evidence: .omo/evidence/task-1-records-ux-trust-baseline.json

  Scenario: Baseline security hypothesis ledger
    Tool:     bash
    Steps:    node --test backend/tests/posts-list-redaction.test.js backend/tests/auth-admin-bootstrap-production.test.js backend/tests/auth-security-readiness.test.js backend/tests/cloudinary-contract.test.js
    Expected: Command exits 0 or failures are recorded in .omo/evidence/task-1-records-ux-trust-baseline.json with exact test name, status, and linked source file; no source behavior is changed.
    Evidence: .omo/evidence/task-1-records-ux-trust-baseline-security.json
  ```

  Commit: YES | Message: `test(records): capture trust baseline before ux hardening` | Files: [backend/tests/*, frontend/src/**/*.test.*, .omo/evidence/task-1-records-ux-trust-baseline*.json]

- [ ] 2. Canonical public share URL helper and athlete share integration

  What to do: Add a small URL helper for public record sharing. For `RecordsPage` athlete panel shares, copy `/records/athletes/:athleteKey` instead of `window.location.href`. For `RecordAthletePage`, preserve only public detail state (`tab`, `event`, `season`, `record`) after validating it with existing URL parsers; drop `flow`, `step`, `mineDraft`, `q`, `browse`, `compare`, `from`, workspace IDs, and unknown params. Use this helper from both share buttons and unit-test it.
  Must NOT do: Do not share local workspace URLs, draft keys, `mineDraft`, local storage contents, or search recovery params. Do not remove valid public deep-link state from dedicated athlete pages.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [6] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `frontend/src/pages/RecordsPage.tsx:825` - current share copies `window.location.href`.
  - Pattern:  `frontend/src/features/record-workspace/pages/RecordAthletePage.tsx:62` - dedicated athlete page share flow.
  - Pattern:  `frontend/src/features/record-workspace/recordAthleteUrlState.ts:4` - validates and resolves season URL state.
  - Pattern:  `frontend/src/features/record-workspace/recordAthleteUrlState.test.ts:9` - URL state preservation test pattern.
  - Pattern:  `frontend/src/pages/RecordsPage.tsx:1263` - existing records flow params deletion helper.
  - API/Type: `frontend/src/api/recordWorkspace.ts:46` - public identity fields, not local workspace identity.
  - External: `https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams` - parse and delete query params.
  - External: `https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState` - rewrite canonical URLs without adding noisy history entries if cleanup is needed.
  - External: `https://reactrouter.com/api/hooks/useSearchParams` - React Router query-state behavior.

  Acceptance criteria (agent-executable only):
  - [ ] `npm --prefix frontend test -- --run src/features/record-workspace/recordAthleteUrlState.test.ts` passes with new canonical-share cases.
  - [ ] `npm --prefix frontend run build:check` passes.
  - [ ] Static assertion proves no share path in `RecordsPage` or `RecordAthletePage` writes `mineDraft`, `flow`, `step`, `browse`, `compare`, `from`, or unknown params to the clipboard/share payload.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Athlete panel canonical share strips transient state
    Tool:     playwright(real Chrome)
    Steps:    WRITE_E2E_EVIDENCE=1 node --test backend/tests/records-flow-e2e.test.js --test-name-pattern "canonical share"
    Expected: Visiting /records?flow=mine&step=candidates&q=Alpha&mineDraft=alpha-2016&athlete=alpha-2016 and invoking the share/copy button yields a captured clipboard/share URL ending in /records/athletes/alpha-2016 with none of flow, step, q, mineDraft, browse, compare, or from present.
    Evidence: .omo/evidence/task-2-canonical-share.json

  Scenario: Dedicated athlete share preserves valid public detail state
    Tool:     playwright(real Chrome)
    Steps:    WRITE_E2E_EVIDENCE=1 node --test backend/tests/records-flow-e2e.test.js --test-name-pattern "athlete detail canonical share"
    Expected: Visiting /records/athletes/alpha-2016?tab=records&event=100m&season=2026&record=result-1&mineDraft=leak invokes share/copy and captures /records/athletes/alpha-2016?tab=records&event=100m&season=2026&record=result-1 with mineDraft removed.
    Evidence: .omo/evidence/task-2-canonical-share-detail.json
  ```

  Commit: YES | Message: `feat(records): canonicalize public share links` | Files: [frontend/src/features/record-workspace/*url*.ts, frontend/src/pages/RecordsPage.tsx, frontend/src/features/record-workspace/pages/RecordAthletePage.tsx, frontend/src/features/record-workspace/*url*.test.ts, backend/tests/records-flow-e2e.test.js]

- [ ] 3. Persistent same-name context on candidate surfaces

  What to do: Make the same-name caution persistent and consistent on `RecordCandidateCard`, `RecordsMineCandidateStep`, `RecordAthletePage`, and `RecordIdentityHeader`. Prefer the API `athlete.note` when present; otherwise show the established fallback that tells users same names can be different athletes and asks them to check affiliation/season/event. Ensure selected state and collection language remain explicit, not identity-confirming.
  Must NOT do: Do not introduce a "same person", "verified", "owned", "claim", "merge", or "my record" assertion. Do not hide candidate context behind hover-only UI.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [6] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `frontend/src/features/record-workspace/components/RecordCandidateCard.tsx:22` - existing per-card same-name caution.
  - Pattern:  `frontend/src/components/records/RecordsMineCandidateStep.tsx:29` - mine candidate same-name explanation.
  - Pattern:  `frontend/src/features/record-workspace/pages/RecordAthletePage.tsx:59` - athlete page same-name caution.
  - Pattern:  `frontend/src/features/record-workspace/components/RecordIdentityHeader.tsx:20` - identity warning copy for `same_name`.
  - Test:     `frontend/src/features/record-workspace/components/candidateList.test.tsx:29` - candidate context and same-name fallback expectations.
  - Test:     `backend/tests/record-workspace-preview-service.test.js:62` - same-name backend preview keeps profile boundaries.
  - API/Type: `frontend/src/api/recordAnalytics.ts:46` - `AthleteSearchCard.note`, `ambiguity`, and visible candidate fields.

  Acceptance criteria (agent-executable only):
  - [ ] `npm --prefix frontend test -- --run src/features/record-workspace/components/candidateList.test.tsx src/features/record-workspace/pages/workspacePages.test.tsx` passes.
  - [ ] `node --test backend/tests/record-workspace-preview-service.test.js` passes.
  - [ ] `rg -n "verified|owned|claim|merge|same person|내 기록이에요|하나로 합쳐" frontend/src/components/records frontend/src/features/record-workspace` returns no new prohibited UX claim outside test negative assertions.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Candidate cards keep same-name caution visible
    Tool:     bash
    Steps:    npm --prefix frontend test -- --run src/features/record-workspace/components/candidateList.test.tsx
    Expected: Tests assert API note and fallback same-name caution are visible in rendered markup and aria labels.
    Evidence: .omo/evidence/task-3-same-name-candidates.txt

  Scenario: Mine flow cannot imply identity merge
    Tool:     playwright(real Chrome)
    Steps:    WRITE_E2E_EVIDENCE=1 node --test backend/tests/records-flow-e2e.test.js --test-name-pattern "same-name"
    Expected: Browser captures mine candidate and dedicated athlete surfaces showing same-name caution, and no text says the selected candidates become one verified person.
    Evidence: .omo/evidence/task-3-same-name-candidates.json
  ```

  Commit: YES | Message: `fix(records): keep same-name context visible` | Files: [frontend/src/features/record-workspace/components/RecordCandidateCard.tsx, frontend/src/components/records/RecordsMineCandidateStep.tsx, frontend/src/features/record-workspace/pages/RecordAthletePage.tsx, frontend/src/features/record-workspace/components/RecordIdentityHeader.tsx, frontend/src/features/record-workspace/components/candidateList.test.tsx]

- [ ] 4. Mobile fixed-bar, focus, touch, and busy-state polish

  What to do: Normalize fixed/sticky bottom controls so record-flow CTAs, workspace draft tray, record selection bar, and compare tray do not overlap the mobile tab bar. Add deterministic busy labels and disabled states for search/share/confirm buttons. Ensure focus returns to the search input when back links use `{ focusSearch: true }` and when invalid shared links recover to search.
  Must NOT do: Do not create new floating marketing cards or nested cards. Do not remove the mobile tab bar. Do not add chat or modal-based record search.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [6] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `frontend/src/components/layout/MobileTabBar.tsx:49` - mobile nav z-index/scope.
  - Pattern:  `frontend/src/index.css:17` - `--mobile-tabbar-height`.
  - Pattern:  `frontend/src/index.css:366` - `.mobile-tabbar` fixed bottom behavior.
  - Pattern:  `frontend/src/features/record-workspace/components/WorkspaceDraftTray.tsx:15` - fixed draft tray offset.
  - Pattern:  `frontend/src/features/record-workspace/components/RecordSelectionBar.tsx:22` - fixed record selection bar.
  - Pattern:  `frontend/src/components/records/RecordsMineCandidateStep.tsx:61` - mine candidate sticky CTA.
  - Pattern:  `frontend/src/components/record-insights/CompareTray.tsx:17` - compare tray bottom offset.
  - Pattern:  `frontend/src/pages/RecordsPage.tsx:94` - search focus restoration using location state.
  - Test:     `frontend/src/features/record-workspace/components/candidateList.test.tsx:138` - safe-area assertion pattern.

  Acceptance criteria (agent-executable only):
  - [ ] `npm --prefix frontend test -- --run src/features/record-workspace/components/candidateList.test.tsx src/features/record-workspace/components/primitives.test.tsx` passes.
  - [ ] `npm --prefix frontend run build:check` passes.
  - [ ] Playwright mobile viewport check proves no fixed bottom control overlaps `.mobile-tabbar` at 375x667 and 390x844.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Mobile bottom controls do not overlap
    Tool:     playwright(real Chrome)
    Steps:    WRITE_E2E_EVIDENCE=1 node --test backend/tests/records-flow-e2e.test.js --test-name-pattern "mobile fixed bars"
    Expected: At 375x667, bounding boxes for [data-records-sticky-cta], [data-record-selection-bar], [aria-label="선택한 선수"], and .mobile-tabbar have no vertical overlap; screenshots/JSON are captured.
    Evidence: .omo/evidence/task-4-mobile-bars.json

  Scenario: Busy and focus states are observable
    Tool:     playwright(real Chrome)
    Steps:    WRITE_E2E_EVIDENCE=1 node --test backend/tests/records-flow-e2e.test.js --test-name-pattern "focus busy states"
    Expected: Search button is disabled and labeled loading while request is pending; returning from team/athlete search focuses #records-search; share/copy button debounces and exposes one aria-live status.
    Evidence: .omo/evidence/task-4-mobile-focus-busy.json
  ```

  Commit: YES | Message: `fix(records): stabilize mobile record controls` | Files: [frontend/src/components/records/*.tsx, frontend/src/features/record-workspace/components/*.tsx, frontend/src/components/record-insights/CompareTray.tsx, frontend/src/index.css, backend/tests/records-flow-e2e.test.js]

- [ ] 5. Minimum-data request and device-local labels

  What to do: Add clear device-local labels to record collection/workspace surfaces and improve the data request form copy so guardians understand contact is optional and ticket lookup works without extra personal data. Keep required fields exactly `athleteName` and `reason`; keep `affiliation`, `competition`, `event`, and `contact` optional. Add contract tests that prevent new required fields.
  Must NOT do: Do not require phone, email, birth date, government ID, photo, private memo, or proof upload. Do not claim instant removal or guaranteed deletion.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [12] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `frontend/src/pages/DataRequestPage.tsx:53` - frontend required-field validation.
  - Pattern:  `frontend/src/pages/DataRequestPage.tsx:273` - contact field is optional.
  - Pattern:  `frontend/src/api/dataRequests.ts:21` - request DTO has optional `contact`, `affiliation`, `competition`, `event`.
  - Pattern:  `card-studio/services/dataRequestValidation.js:9` - backend request validation.
  - Pattern:  `card-studio/routes/publicRoutes.js:167` - public data request submit and no-store response.
  - Pattern:  `frontend/src/features/record-workspace/pages/RecordWorkspacePage.tsx:106` - local hide/removal copy surface.
  - Pattern:  `frontend/src/components/records/RecordsMineDoneStep.tsx:1` - saved local list surface.
  - API/Type: `frontend/src/config/dataPolicy.ts:254` - correction policy source of truth.

  Acceptance criteria (agent-executable only):
  - [ ] `npm --prefix frontend test -- --run src/config/dataPolicy.test.ts src/components/records/RecordsMineDoneStep.test.tsx` passes with added minimum-data assertions.
  - [ ] `node --test backend/tests/data-request-rate-limit.test.js backend/tests/data-rights-copy.test.js` passes.
  - [ ] Static assertion proves `DataRequestInput` still has no required contact/proof/photo/private memo field.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Data request accepts minimum data
    Tool:     curl
    Steps:    Start local server with test DB/mocks per existing data-rights tests, then POST /api/card-studio/data-requests with {"type":"deletion","athleteName":"Alpha Kim","reason":"Guardian requests search non-exposure"}.
    Expected: HTTP 201 with success true, ticketId, status, receivedAt, and no request echo containing contact, proof, photo, or memo.
    Evidence: .omo/evidence/task-5-minimum-data-request.json

  Scenario: Device-local copy appears on saved record collection
    Tool:     playwright(real Chrome)
    Steps:    WRITE_E2E_EVIDENCE=1 node --test backend/tests/records-flow-e2e.test.js --test-name-pattern "device-local"
    Expected: Mine done/workspace pages include explicit device-local wording and do not contain verified/owned/claimed language.
    Evidence: .omo/evidence/task-5-device-local-copy.json
  ```

  Commit: YES | Message: `fix(records): clarify device-local and minimum-data request copy` | Files: [frontend/src/pages/DataRequestPage.tsx, frontend/src/api/dataRequests.ts, card-studio/services/dataRequestValidation.js, frontend/src/features/record-workspace/pages/RecordWorkspacePage.tsx, frontend/src/components/records/RecordsMineDoneStep.tsx, backend/tests/*data-request*.test.js, frontend/src/**/*.test.*]

- [ ] 6. Shared-link result-first routing and recovery

  What to do: Ensure all public shared links open result/detail views: `/records?athlete=:key`, `/records/athletes/:key`, `/records?compare=a,b`, `/records?flow=browse&browse=athlete&q=...`, and `/records/teams/:teamKey?...`. Invalid athlete links should show one retry/recovery action and optionally return to search with focus; valid query links must not show the hub first.
  Must NOT do: Do not redirect to hub when a public result identifier/query is present. Do not store workspace draft or mine draft in shared URLs.

  Parallelization: Can parallel: YES | Wave 2 | Blocks: [] | Blocked by: [1, 2, 3, 4]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `frontend/src/pages/RecordsPage.tsx:258` - direct athlete link prioritization.
  - Pattern:  `frontend/src/pages/RecordsPage.tsx:461` - hub suppression for direct athlete/compare links.
  - Pattern:  `frontend/src/pages/RecordsPage.tsx:620` - prioritized athlete panel rendering.
  - Pattern:  `frontend/src/pages/RecordsPage.tsx:795` - shared link fallback error.
  - Pattern:  `frontend/src/App.tsx:115` - `/records`, `/records/athletes/:athleteKey`, and `/records/teams/:teamKey` route map.
  - Test:     `backend/tests/records-flow-e2e.test.js:127` - athlete shared link bypasses hub.
  - Test:     `backend/tests/records-flow-e2e.test.js:157` - compare shared link bypasses hub.
  - External: `https://playwright.dev/docs/api/class-pageassertions#pageassertions-to-have-url` - URL assertions.

  Acceptance criteria (agent-executable only):
  - [ ] `WRITE_E2E_EVIDENCE=1 node --test backend/tests/records-flow-e2e.test.js` passes.
  - [ ] Added E2E assertions cover `/records?flow=browse&browse=athlete&q=Alpha` and `/records?flow=browse&browse=team&q=진도` opening result surfaces with no `[data-records-flow="hub"]`.
  - [ ] `npm --prefix frontend run build:check` passes.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Shared search query surfaces results
    Tool:     playwright(real Chrome)
    Steps:    WRITE_E2E_EVIDENCE=1 node --test backend/tests/records-flow-e2e.test.js --test-name-pattern "shared search query"
    Expected: /records?flow=browse&browse=athlete&q=Alpha shows candidate results and no hub; /records?flow=browse&browse=team&q=진도 shows team cards and no hub.
    Evidence: .omo/evidence/task-6-shared-query-results.json

  Scenario: Invalid shared athlete link has one recovery action
    Tool:     playwright(real Chrome)
    Steps:    WRITE_E2E_EVIDENCE=1 node --test backend/tests/records-flow-e2e.test.js --test-name-pattern "invalid shared athlete"
    Expected: /records/athletes/missing-athlete shows one retry action or one search recovery action, focuses #records-search when recovery is chosen, and does not display the hub.
    Evidence: .omo/evidence/task-6-invalid-shared-athlete.json
  ```

  Commit: YES | Message: `fix(records): route shared links to results first` | Files: [frontend/src/pages/RecordsPage.tsx, frontend/src/features/record-workspace/pages/RecordAthletePage.tsx, backend/tests/records-flow-e2e.test.js, backend/tests/records-flow-e2e-fixture.js]

- [ ] 7. Team aggregate scope and coverage clarity

  What to do: Improve team search/result/detail copy and layout to explain exactly what the aggregate covers: category scope, period (`latest`, `all`, or season), available seasons, source count, last captured date, excluded preliminary/ambiguous podium rows, and that it is an aggregate, not a roster or official team record. Preserve current DTO minimization and typed contract parsing.
  Must NOT do: Do not expose athlete names, athlete keys, raw records, local workspace data, or raw sources. Do not implement suppression below 5 athletes in this task.

  Parallelization: Can parallel: YES | Wave 2 | Blocks: [12] | Blocked by: [1]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `frontend/src/components/records/TeamStatisticsResults.tsx:31` - search card destination and compact metrics.
  - Pattern:  `frontend/src/features/team-performance/TeamPerformancePage.tsx:65` - team detail page shell.
  - Pattern:  `frontend/src/features/team-performance/TeamPerformancePage.tsx:144` - coverage notice.
  - Pattern:  `frontend/src/features/team-performance/TeamPerformanceSummary.tsx:7` - aggregate summary.
  - API/Type: `frontend/src/features/team-performance/teamPerformanceContracts.ts:44` - search summary schema.
  - API/Type: `frontend/src/features/team-performance/teamPerformanceContracts.ts:70` - detail schema and coverage fields.
  - Test:     `frontend/src/features/team-performance/teamPerformanceContracts.test.ts:42` - raw rows stripped.
  - Test:     `backend/tests/team-performance-api.test.js:214` - forbidden team private keys.

  Acceptance criteria (agent-executable only):
  - [ ] `npm --prefix frontend test -- --run src/features/team-performance/teamPerformanceContracts.test.ts src/features/team-performance/TeamPerformanceSections.test.tsx src/components/records/TeamStatisticsResults.test.tsx` passes.
  - [ ] `node --test backend/tests/team-performance-api.test.js backend/tests/team-performance-copy.test.js backend/tests/team-performance.test.js` passes.
  - [ ] `rg -n "athleteKey|records|workspace|name|raw" frontend/src/features/team-performance frontend/src/components/records/TeamStatisticsResults.tsx` produces no new public DTO exposure outside schema/test negative assertions.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Team aggregate explains scope without private rows
    Tool:     playwright(real Chrome)
    Steps:    WRITE_E2E_EVIDENCE=1 node --test backend/tests/records-flow-e2e.test.js --test-name-pattern "team aggregate clarity"
    Expected: /records/teams/<fixture-key>?scope=all shows applied scope, seasons/source coverage, aggregate-only notice, and no athleteKey/name/raw records/workspace text in rendered JSON-captured page text.
    Evidence: .omo/evidence/task-7-team-coverage.json

  Scenario: Invalid team URL fails closed
    Tool:     bash
    Steps:    node --test backend/tests/team-performance-api.test.js
    Expected: Invalid category, limit, key, and season inputs return stable 400/404 codes and generic internal errors reveal no implementation detail.
    Evidence: .omo/evidence/task-7-team-invalid-inputs.txt
  ```

  Commit: YES | Message: `fix(team-records): clarify aggregate scope and coverage` | Files: [frontend/src/components/records/TeamStatisticsResults.tsx, frontend/src/features/team-performance/*.tsx, frontend/src/features/team-performance/*.test.*, backend/tests/team-performance*.test.js]

- [ ] 8. Security/privacy verification gates

  What to do: Add source-level security tests that confirm or reject each security reviewer finding before implementation. The gates must cover blinded post/comment/vote rehydration, anonymous client-chosen IDs, auth enumeration response equality, non-production-only admin bootstrap, and Cloudinary public upload data. Each finding gets a failing test before code changes, or a documented "already protected" evidence record if existing tests prove it.
  Must NOT do: Do not refactor security architecture in this task. Do not rely on manual review. Do not use sibling-repo paths.

  Parallelization: Can parallel: YES | Wave 2 | Blocks: [9, 10, 11, 12] | Blocked by: [1]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `backend/routes/posts.js:222` - post detail query.
  - Pattern:  `backend/routes/comments.js:78` - comment-create rehydration query.
  - Pattern:  `backend/routes/votes.js:94` - vote rehydration query.
  - Pattern:  `backend/routes/posts.js:327` - post create accepts `anonymousId`.
  - Pattern:  `backend/routes/comments.js:31` - comment create accepts `anonymousId`.
  - Pattern:  `backend/routes/votes.js:32` - vote accepts `anonymousId`.
  - Pattern:  `frontend/src/utils/anonymousUser.ts:17` - browser-generated anonymous ID.
  - Pattern:  `backend/auth/routes.js:299` - nickname availability response.
  - Pattern:  `backend/auth/routes.js:1069` - forgot-password generic response path.
  - Pattern:  `backend/auth/routes.js:1143` - reset-code verification.
  - Pattern:  `backend/auth/routes.js:1355` - non-production `set-admin` registration.
  - Pattern:  `backend/routes/upload.js:25` - authenticated upload endpoint.
  - Pattern:  `backend/utils/cloudinary.js:40` - upload wrapper forwards options.
  - External: `https://cloudinary.com/documentation/upload_presets` - unsigned preset risks and security controls.
  - External: `https://cloudinary.com/documentation/control_access_to_media` - public/private/authenticated delivery.
  - External: `https://cloudinary.com/documentation/contextual_metadata` - metadata is stored with assets.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/posts-list-redaction.test.js backend/tests/auth-admin-bootstrap-production.test.js backend/tests/auth-security-readiness.test.js backend/tests/auth-recovery-hardening.test.js backend/tests/cloudinary-contract.test.js` includes new gate cases and exits 0 after fixes or records exact pre-fix failures before dependent tasks.
  - [ ] `.omo/evidence/task-8-security-gates.json` maps each report to `confirmed`, `already_protected`, or `rejected` with test names.
  - [ ] No implementation task 9, 10, or 11 starts unless its corresponding gate is `confirmed` or `already_protected` with regression coverage.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Security gate test matrix
    Tool:     bash
    Steps:    node --test backend/tests/posts-list-redaction.test.js backend/tests/auth-admin-bootstrap-production.test.js backend/tests/auth-security-readiness.test.js backend/tests/auth-recovery-hardening.test.js backend/tests/cloudinary-contract.test.js
    Expected: Command exits 0 after gate coverage exists; task evidence JSON lists every security report and the exact test proving it.
    Evidence: .omo/evidence/task-8-security-gates.json

  Scenario: Gate blocks unverified work
    Tool:     bash
    Steps:    node -e "const fs=require('fs');const gate=JSON.parse(fs.readFileSync('.omo/evidence/task-8-security-gates.json','utf8'));for(const k of ['blindedResponses','anonymousIds','authEnumeration','adminBootstrap','cloudinaryPrivateData']){if(!['confirmed','already_protected','rejected'].includes(gate[k]?.status)) process.exit(1)}"
    Expected: Script exits 0 only when all security findings have explicit evidence status.
    Evidence: .omo/evidence/task-8-security-gates-check.txt
  ```

  Commit: YES | Message: `test(security): gate record privacy hardening with evidence` | Files: [backend/tests/posts-list-redaction.test.js, backend/tests/auth-admin-bootstrap-production.test.js, backend/tests/auth-security-readiness.test.js, backend/tests/auth-recovery-hardening.test.js, backend/tests/cloudinary-contract.test.js, .omo/evidence/task-8-security-gates.json]

- [ ] 9. Public response filtering for blinded posts/comments/votes

  What to do: If Task 8 confirms the blind-filtering gap, centralize public post response redaction so post list, detail, comment-create rehydration, and vote rehydration all exclude blinded posts for unauthenticated public responses and exclude or safely placeholder blinded comments. Reuse `redactPostListRow` or add a sibling `redactPublicPostDetail` helper. Keep admin behavior out of scope unless existing admin endpoints explicitly need it.
  Must NOT do: Do not expose `cloudinary_id`, `instagram` for comments, blinded comment body, deleted comments, or raw DB fields in public responses. Do not change chat.

  Parallelization: Can parallel: YES | Wave 2 | Blocks: [11] | Blocked by: [1, 8]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `backend/utils/postRedaction.js:1` - existing public list redaction helper.
  - Pattern:  `backend/tests/posts-list-redaction.test.js:80` - Cloudinary ID stripped from list images.
  - Pattern:  `backend/routes/posts.js:51` - list query filters `p.is_blinded = FALSE`.
  - Pattern:  `backend/routes/posts.js:222` - detail query lacks equivalent `p.is_blinded = FALSE` and comment blind filtering.
  - Pattern:  `backend/routes/comments.js:78` - comment-create rehydrates post/comments.
  - Pattern:  `backend/routes/votes.js:94` - vote rehydrates post/comments.
  - API/Type: `backend/database/schema.sql:186` - comments include `is_blinded` and `blind_reason`.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/posts-list-redaction.test.js` passes with cases for detail/comment/vote rehydration.
  - [ ] `rg -n "cm\\.is_blinded|p\\.is_blinded" backend/routes/posts.js backend/routes/comments.js backend/routes/votes.js` shows public queries enforce filtering or post-query redaction.
  - [ ] Public response snapshots contain no blinded comment content and no `cloudinary_id`.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Blinded comments are not returned through detail response
    Tool:     bash
    Steps:    node --test backend/tests/posts-list-redaction.test.js --test-name-pattern "blinded"
    Expected: Test fixture with one visible and one blinded comment returns visible content only, or a neutral placeholder without body/instagram, for detail/comment/vote response helpers.
    Evidence: .omo/evidence/task-9-blinded-response-filter.txt

  Scenario: Public route probes do not leak blinded content
    Tool:     curl
    Steps:    Start existing backend test server fixture with a blinded post/comment, then curl GET /api/posts/:id, POST /api/posts/:id/comments, and POST /api/posts/:id/vote with concrete test IDs.
    Expected: Blinded post detail is 404 or generic unavailable; comment/vote returned post contains no blinded body, no comment instagram, and no cloudinary_id.
    Evidence: .omo/evidence/task-9-blinded-route-probes.json
  ```

  Commit: YES | Message: `fix(security): filter blinded public post responses` | Files: [backend/utils/postRedaction.js, backend/routes/posts.js, backend/routes/comments.js, backend/routes/votes.js, backend/tests/posts-list-redaction.test.js]

- [ ] 10. Cloudinary public upload private-data gate

  What to do: If Task 8 confirms Cloudinary public uploads can carry private data, add a narrow upload guard that strips/sanitizes original filenames before persistence, rejects non-image content by signature in addition to MIME where feasible, prevents `context`, `metadata`, `tags`, private memo, and private photo fields from being forwarded to public uploads, and keeps public upload options explicit. Document that private memo/photos are not supported in this public upload path.
  Must NOT do: Do not store private memo text, private photos, contact data, or sensitive filenames in Cloudinary public resources. Do not switch to unsigned browser upload presets in this task. Do not add new public upload routes.

  Parallelization: Can parallel: YES | Wave 2 | Blocks: [12] | Blocked by: [1, 8]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `backend/routes/upload.js:25` - authenticated single-image upload route.
  - Pattern:  `backend/routes/upload.js:58` - authenticated multi-image upload route.
  - Pattern:  `backend/middleware/upload.js:15` - Multer memory storage, size, and MIME filter.
  - Pattern:  `backend/utils/cloudinary.js:40` - upload options are forwarded to Cloudinary.
  - Pattern:  `backend/routes/posts.js:460` - post image upload stores original filename and Cloudinary public URL.
  - Test:     `backend/tests/cloudinary-contract.test.js:30` - upload wrapper preserves options.
  - External: `https://cloudinary.com/documentation/upload_presets` - unsigned presets are discoverable and must be constrained.
  - External: `https://cloudinary.com/documentation/image_upload_api_reference` - `private`/`authenticated` delivery and `access_control`.
  - External: `https://cloudinary.com/documentation/contextual_metadata` - context/metadata stored on assets.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/cloudinary-contract.test.js backend/tests/upload-multer-contract.test.js` passes with new private-data rejection cases.
  - [ ] Static assertion proves `uploadToCloudinary` call sites do not pass user-supplied `context`, `metadata`, `tags`, private memo, or raw `originalname` into Cloudinary public options.
  - [ ] Public database persistence stores sanitized filename or omits filename for public image rows.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Public upload strips private metadata fields
    Tool:     bash
    Steps:    node --test backend/tests/cloudinary-contract.test.js --test-name-pattern "private metadata"
    Expected: Upload fixture containing memo/context/metadata/tags/original filename with private token forwards none of those fields to Cloudinary and persists no sensitive filename.
    Evidence: .omo/evidence/task-10-cloudinary-private-data.txt

  Scenario: Non-image payload fails before Cloudinary
    Tool:     curl
    Steps:    Start existing upload test server, then POST multipart file named private-memo.png containing text/plain bytes to /api/upload/image with a valid test auth token.
    Expected: HTTP 400 and Cloudinary mock receives zero upload calls.
    Evidence: .omo/evidence/task-10-cloudinary-reject-nonimage.json
  ```

  Commit: YES | Message: `fix(upload): block private data from public Cloudinary uploads` | Files: [backend/middleware/upload.js, backend/utils/cloudinary.js, backend/routes/upload.js, backend/routes/posts.js, backend/tests/cloudinary-contract.test.js, backend/tests/upload-multer-contract.test.js]

- [ ] 11. Anonymous identity and auth enumeration hardening

  What to do: If Task 8 confirms anonymous ID trust remains unsafe, stop treating raw browser `anonymousId` as the only authority. Minimal path: validate the existing anonymous ID format, bind it to a server-signed nonce or httpOnly session cookie for write/vote/comment actions, and preserve backward compatibility only where an existing signed binding is absent but rate limits and dedupe still apply. For auth enumeration, keep public responses generic and equalized for forgot-password, reset-code, and login; keep nickname availability only if it is explicitly a signup UX feature and rate-limited.
  Must NOT do: Do not break existing read-only launch gates. Do not expose whether an email exists in public response bodies or timing-sensitive branch text. Do not remove production admin bootstrap tests.

  Parallelization: Can parallel: NO | Wave 3 | Blocks: [12] | Blocked by: [1, 8, 9]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `frontend/src/utils/anonymousUser.ts:17` - browser anonymous ID generation.
  - Pattern:  `backend/routes/posts.js:340` - post create accepts `anonymousId`.
  - Pattern:  `backend/routes/comments.js:31` - comment create accepts `anonymousId`.
  - Pattern:  `backend/routes/votes.js:32` - vote accepts `anonymousId`.
  - Pattern:  `backend/auth/routes.js:784` - login uses generic public error while logging distinct reasons internally.
  - Pattern:  `backend/auth/routes.js:1069` - forgot-password route returns accepted for unknown users.
  - Pattern:  `backend/auth/routes.js:1143` - verify reset-code route.
  - Pattern:  `backend/auth/routes.js:1355` - set-admin only non-production.
  - Test:     `backend/tests/auth-security-readiness.test.js:165` - forgot password does not reveal registration.
  - Test:     `backend/tests/auth-admin-bootstrap-production.test.js:105` - production set-admin unregistered route.
  - API/Type: `backend/utils/authCookies.js` - use existing cookie/auth helpers before inventing a new token shape.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/auth-security-readiness.test.js backend/tests/auth-recovery-hardening.test.js backend/tests/auth-admin-bootstrap-production.test.js backend/tests/view-dedup.test.js` passes.
  - [ ] Added tests prove two different clients cannot forge the same anonymous ID to mutate each other's vote/comment/post identity after binding is established.
  - [ ] Public auth responses for registered and unknown emails remain body-equal for forgot-password.
  - [ ] Production `POST /api/auth/set-admin` remains 404 and cannot run `UPDATE users SET is_admin`.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Anonymous ID forgery is blocked or downgraded
    Tool:     bash
    Steps:    node --test backend/tests/auth-security-readiness.test.js --test-name-pattern "anonymous"
    Expected: A fixture with two independent HTTP clients using the same raw anonymousId cannot overwrite each other's signed identity binding; unsigned legacy input is rate-limited and never treated as stronger than the signed session.
    Evidence: .omo/evidence/task-11-anonymous-id-binding.txt

  Scenario: Auth enumeration remains generic
    Tool:     bash
    Steps:    node --test backend/tests/auth-security-readiness.test.js backend/tests/auth-recovery-hardening.test.js backend/tests/auth-admin-bootstrap-production.test.js
    Expected: Registered/unknown forgot-password responses are equal, reset-code failures are generic, login public error does not distinguish unknown email vs wrong password, and production set-admin returns 404.
    Evidence: .omo/evidence/task-11-auth-enumeration.txt
  ```

  Commit: YES | Message: `fix(auth): harden anonymous identity and enumeration gates` | Files: [backend/routes/posts.js, backend/routes/comments.js, backend/routes/votes.js, backend/auth/routes.js, backend/utils/authCookies.js, frontend/src/utils/anonymousUser.ts, backend/tests/auth-security-readiness.test.js, backend/tests/auth-recovery-hardening.test.js, backend/tests/auth-admin-bootstrap-production.test.js]

- [ ] 12. Owner decision gates and deferred-scope ledger

  What to do: Create a concise decision ledger that records owner-only decisions and blocks implementation without explicit owner approval. Include: team aggregate suppression below 5 athletes, any "verified/owned/claimed" language, any auto-merge/same-person identity decision, Cloudinary private-photo support, and any chat expansion. Each gate must state current default: deferred/no implementation.
  Must NOT do: Do not implement any owner-only item. Do not add suppression threshold logic. Do not add chat. Do not change identity language to imply verification.

  Parallelization: Can parallel: NO | Wave 3 | Blocks: [] | Blocked by: [1, 5, 7, 8, 10, 11]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `docs/athletetime-record-ux-decision-register.md` - existing decision-register style if present.
  - Pattern:  `frontend/src/features/team-performance/teamPerformanceContracts.ts:24` - current aggregate fields include athleteCount but no suppression flag.
  - Pattern:  `backend/tests/team-performance-api.test.js:214` - private keys forbidden in team DTO.
  - Pattern:  `backend/tests/progressive-ux.test.js:58` - record flow separation and prohibited "my record" claims.
  - Pattern:  `frontend/src/App.tsx:140` - chat route exists but this plan must not expand it.
  - Pattern:  `frontend/src/config/dataPolicy.ts:50` - prohibited public claims source.
  - External: `https://cloudinary.com/documentation/control_access_to_media` - private/authenticated assets require deliberate access-control decision.

  Acceptance criteria (agent-executable only):
  - [ ] `.omo/evidence/task-12-owner-gates.json` exists with all five gate statuses set to `deferred_owner_decision`.
  - [ ] `rg -n "minGroupSize|suppress|suppression|verified|owned|claim|merge|chat" frontend/src backend card-studio docs .omo/plans/records-ux-trust-improvement.md` shows no new implementation outside the decision ledger and existing unrelated chat route.
  - [ ] `npm test` and `npm --prefix frontend run build:check` pass after all implemented tasks.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Owner gates are deferred, not implemented
    Tool:     bash
    Steps:    node -e "const fs=require('fs');const g=JSON.parse(fs.readFileSync('.omo/evidence/task-12-owner-gates.json','utf8'));for(const k of ['teamSuppressionBelowFive','verifiedOwnedLanguage','sameNameAutoMerge','cloudinaryPrivatePhotos','chatExpansion']){if(g[k]?.status!=='deferred_owner_decision') process.exit(1)}"
    Expected: Script exits 0 and no source behavior implements these gated decisions.
    Evidence: .omo/evidence/task-12-owner-gates.json

  Scenario: Final no-extra-scope scan
    Tool:     bash
    Steps:    rg -n "하나로 합쳐|verified|owned|claim|공식 인증|chat expansion|minGroupSize|suppression below 5" frontend/src backend card-studio docs
    Expected: Only existing policy docs/tests or the owner-gate ledger match; no production implementation adds gated behavior.
    Evidence: .omo/evidence/task-12-no-extra-scope-scan.txt
  ```

  Commit: YES | Message: `docs(records): record owner gates for trust decisions` | Files: [docs/athletetime-record-ux-decision-register.md, .omo/evidence/task-12-owner-gates.json]

## Final verification wave (MANDATORY - after all implementation tasks)
> Runs in PARALLEL. ALL must APPROVE. Surface results to the caller and wait for an explicit "okay" before declaring complete.
- [ ] F1. Plan compliance audit - every task done, every acceptance criterion met
- [ ] F2. Code quality review - diagnostics clean, idioms match, no dead code
- [ ] F3. Real manual QA - every QA scenario executed with evidence captured
- [ ] F4. Scope fidelity - nothing extra shipped beyond Must-Have, nothing Must-NOT-Have introduced

## Commit strategy
- One logical change per commit. Conventional Commits (`<type>(<scope>): <subject>` body + footer).
- Atomic: every commit builds and passes tests on its own.
- No "WIP" / "fix typo squash later" commits on the final branch - clean up before merge.
- Reference the plan file path in the final commit footer: `Plan: .omo/plans/records-ux-trust-improvement.md`.

## Success criteria
- All Must-Have shipped; all QA scenarios pass with captured evidence; F1-F4 approved; commit history clean.
