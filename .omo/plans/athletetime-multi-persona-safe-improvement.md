# AthleteTime Multi-Persona Safe Improvement

## TL;DR
> **Summary**: Make AthleteTime easier to trust and use by correcting verified record mistakes, making candidate selection and local storage explicit, and removing false feature promises without expanding personal-data collection or public exposure.
> **Deliverables**:
> - Correct event normalization and protected regression evidence
> - A truthful, reversible candidate and workspace journey
> - Shared-device controls and accessible first-use foundations
> - Safer data-request intake and clearer prepared-feature state
> - A copy-only team-statistics improvement plus owner decision records
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: 1 -> 2 -> 3 -> 9 -> F1-F4

## Execution Snapshot (2026-08-11)

The following completed changes are already on `main` and have focused browser, frontend, and backend contract evidence:

- [x] Event normalization preserves `장대높이뛰기` and `장대높이뛰기(10종)` as distinct from ordinary high jump.
- [x] Mixed-name recovery and saved-candidate actions are explicit; no path silently merges or opens only the first selected athlete.
- [x] Data-request reasons reject clearly identifiable registration numbers, phone numbers, and email addresses before persistence.
- [x] Record selections stored in this browser can be inspected and cleared with one scoped confirmation. The cleanup preserves authentication, home shortcuts, and unrelated browser data.
- [x] The training log warns shared-device users and keeps its separate delete action in the training screen. It is deliberately not erased by the record-selection control.
- [x] Core layouts now provide one main landmark and a keyboard-visible skip link. Record-list removal actions have an individual accessible name.
- [x] Public record responses now omit internal source IDs. Provenance still includes the provider, original public link, and collection date; correction links carry only the public athlete name needed to prefill the form.

Verification completed for this snapshot: backend core suite 351 passed / 5 skipped, focused frontend tests 10 passed, type check passed, production build passed, and the four record-flow browser suites passed 19/19.

### New Operations Hold: D7

| ID | Decision | Default until the owner decides |
| --- | --- | --- |
| D7 | Repair of the legacy `reports` database-table collision | Keep the fail-closed repair branch unmerged. `runMigrations()` runs during server startup, so production execution requires a verified backup, a disposable rehearsal, preserved-row counts, and an explicit maintenance-window decision. |

The repair is intentionally not treated as an ordinary code deploy: its purpose is to preserve an older community-report table while creating the later chat-shaped table only when the schema is exactly recognized. No production command has been run or approved.

## Context

### Original Request

Use many realistic personas and agents to find better approaches and begin a comprehensive improvement plan.

### Interview Summary

The review covered 22 independent perspectives: middle/high-school athletes, university and professional athletes, parents, coaches, team managers, first-time runners, shared-device users, accessibility users, data operators, content editors, and adversarial users. The objective is not to add more features. It is to make the existing public-record service coherent, truthful, and safe on the paths people already use.

### Metis Review (gaps addressed)

- Team statistics must remain copy/layout-only until the owner sets a server-enforced small-group disclosure rule.
- Existing row/source suppression stays unchanged; this plan does not broaden it or expose source IDs to the public.
- `/chat` remains a preparation-only surface across routing, API, WebSocket, configuration, and deployment checks.
- Private notes, photos, and all reuse of public Cloudinary upload endpoints are explicitly excluded.
- Browser-local changes require explicit named-key cleanup, rollback-safe storage handling, mobile, keyboard, and zero-console-error evidence.

## Work Objectives

### Core Objective

Give a student, guardian, coach, or casual visitor one clear answer at every step: what record is being viewed, what is only temporarily saved on this device, what the coverage does and does not prove, and how to return or correct a mistake.

### Must Have

- Preserve separate same-name candidates and never infer identity from name, affiliation, year, or event.
- Correct proven event-label defects before new record presentation work.
- Make mixed-name selection recovery visible and reversible.
- Provide separate, deliberately scoped shared-device cleanup actions for record selections and training artifacts.
- Prevent obvious sensitive identifiers from entering data-request free text.
- Keep team pages aggregate-only and make their terms more honest without increasing granularity.
- Make preparation-only features impossible to mistake for live interactions.

### Must NOT Have

- No `person_no`, birth-date, or canonical identity storage.
- No automatic homonym merge, school/team alias merge, or “verified owner” claim.
- No new team aggregate field, player list, player link, ranking, or small-cell exposure.
- No private memo, photo, or attachment implementation; never call `/api/upload/*` from private space.
- No chat, comments, market, or automatic editorial publishing re-open.
- No source-level suppression expansion, new deletion automation, or source ID exposure.
- No generic `localStorage.clear()` or alteration of unrelated browser settings.

### Owner Decisions Held

| ID | Decision | Default until the owner decides |
| --- | --- | --- |
| D1 | Team minimum group size, youth exception, and bucket/hidden behavior | No new team fields or drilldowns; existing values are not expanded. |
| D2 | Account-bound private text notes, attachments, retention, deletion, and recovery | No private-space implementation or upload reuse. |
| D3 | Row-level data-rights evidence, source-key disclosure, and suppression action | No new request payload fields or suppression modes. |
| D4 | Minor athlete share/amplification rule | Do not add promotion, sharing, or personal-story features. |
| D5 | Community identity, moderation, reporting, retention, and chat reopening | Keep all community write paths fail-closed. |
| D6 | Account age, guardian consent, policy acceptance, and account deletion | Document gap only; do not invent legal collection flow. |

## Verification Strategy

- **Test decision**: TDD for code changes using existing Vitest and Node contract suites; every acceptance case is also tested in a real browser.
- **Browser matrix**: 390x844 mobile and desktop; keyboard-only first-use, same-name candidate, mixed-name recovery, shared-device erase, data request refusal, and preparation-only route checks.
- **Evidence**: `.omo/evidence/multi-persona-safe-improvement/task-{N}-{slug}.md`, screenshots only when they prove a visual state, and command output summaries.
- **Release gate**: `npm test`, `npm.cmd --prefix frontend run type-check`, `npm.cmd --prefix frontend run build:check`, targeted backend suites, `git diff --check`, and zero unexpected console/page errors.

## Execution Strategy

### Parallel Execution Waves

| Wave | Tasks | Why this order |
| --- | --- | --- |
| 1 | 1, 2, 4 | Fix data truth, selection state, and sensitive-intake boundaries first. |
| 2 | 3, 5, 6 | Build safe first-use, shared-device, and accessibility improvements on stable state. |
| 3 | 7, 8, 9 | Improve truthful feature framing, record coverage wording, and team presentation without changing disclosure scope. |
| 4 | 10, F1-F4 | Consolidate regressions, route inventory, browser evidence, and deployment verification. |

### Dependency Matrix

| Task | Depends on | Blocks |
| --- | --- | --- |
| 1 | none | 3, 10 |
| 2 | none | 3, 5, 10 |
| 3 | 1, 2 | 10 |
| 4 | none | 10 |
| 5 | 2 | 10 |
| 6 | none | 10 |
| 7 | none | 10 |
| 8 | 1 | 10 |
| 9 | none | 10 |
| 10 | 1-9 | F1-F4 |

## TODOs

- [x] 1. Correct event-label normalization before any record presentation changes

  **What to do**: Write a failing backend contract for `장대높이뛰기` and `10종 장대높이뛰기`, then reorder or narrow the event-normalization rules so they resolve before generic `높이` matching. Scan the loaded public record corpus for changed classifications and record the before/after count in evidence. Keep original labels and event detail intact; change only the derived canonical display/category path.

  **Must NOT do**: Do not alter source files, deduplicate differently, merge events across disciplines, or change ranking/identity logic.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3, 8, 10 | Blocked By: none

  **References**:
  - `card-studio/services/recordAnalyticsService.js:880-920` - current canonical event matching order.
  - `data/results/2022.json` - verified original `13 장대높이뛰기(10종) 결승` sample.
  - `backend/tests/record-team-statistics.test.js` - Node assertion and fixture convention.

  **Acceptance Criteria**:
  - [ ] `장대높이뛰기`, `장대높이뛰기(10종)`, and ordinary `높이뛰기` resolve to three correct, distinct labels.
  - [ ] Existing event-filter and record-search tests pass without changing expected source facts.
  - [ ] Evidence contains a deterministic corpus scan and has no unexpected classification loss.

  **QA Scenarios**:
  ```text
  Scenario: Proven 10-event pole-vault record
    Tool: node --test
    Steps: Load the original 2022 sample through the production normalization function.
    Expected: UI/API label is 장대높이뛰기(10종), never 높이뛰기.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-1-event-label.md

  Scenario: Ordinary high jump remains unchanged
    Tool: node --test
    Steps: Normalize a normal 높이뛰기 record beside the pole-vault cases.
    Expected: It remains 높이뛰기 and no event keys collide.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-1-event-label-error.md
  ```

  **Commit**: YES | Message: `fix(records): preserve pole vault event labels` | Files: normalization service, focused tests, evidence only.

- [x] 2. Make candidate recovery explicit and eraseable

  **What to do**: Keep current non-merging behavior, but replace the invisible mixed-name return with two explicit choices: `선택 계속 고치기` must restore the candidate-selection surface with the selected candidates visibly marked; `선택 비우고 다시 찾기` must clear only the workspace draft and open a blank candidate search. Provide a clear exit for a last remaining selected candidate rather than leaving a hidden draft. The selection strip must expose count plus compact affiliation context, not assert that selections are one person.

  **Must NOT do**: Do not create a workspace from different display names, silently retain a draft after explicit clear, save a comparison, or change the six-candidate cap.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3, 5, 10 | Blocked By: none

  **References**:
  - `frontend/src/features/record-workspace/pages/RecordWorkspaceReviewPage.tsx:42-82` - draft lifecycle and current return action.
  - `frontend/src/features/record-workspace/components/WorkspaceReviewContent.tsx:68-93` - mixed-name boundary copy.
  - `frontend/src/features/record-workspace/storage.ts:64-100` - bounded draft persistence API.
  - `frontend/src/pages/RecordsPage.tsx:620-650` - candidate entry and visible selection presentation.

  **Acceptance Criteria**:
  - [ ] Mixed-name review exposes both named actions and never a comparison promise.
  - [ ] Continue preserves only the visible selection; clear removes only AthleteTime's workspace draft.
  - [ ] Removing the final candidate or cancelling ends with no stale draft on reload.
  - [ ] Separate same-name candidates remain separate and selected keys remain bounded to six.

  **QA Scenarios**:
  ```text
  Scenario: Different names are corrected, not merged
    Tool: real browser at 390x844
    Steps: Search 김민, select two candidates with different display names, open review, choose 계속 고치기.
    Expected: Candidate screen visibly shows the same two selections; no workspace or comparison is created; no console/page error.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-2-mixed-name-continue.md

  Scenario: School shared computer reset
    Tool: real browser and storage inspection
    Steps: Repeat the mixed-name path, choose 선택 비우고 다시 찾기, reload the candidate route.
    Expected: No selected candidates or workspace draft remain; unrelated app settings remain unchanged.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-2-mixed-name-clear.md
  ```

  **Commit**: YES | Message: `fix(records): clarify candidate recovery` | Files: record workspace pages/components/tests only.

- [x] 3. Unify the record-entry promise and the finished workspace destination

  **What to do**: Inventory every public `기록 찾기`, `내 기록`, `선수 기록 모아 보기`, `선수 기록 보기`, and `비교` entry point. Make search actions enter the same candidate-first route. Make a completed same-name workspace open the workspace detail that represents all selected candidates, never the first candidate's detail. Where an action cannot complete comparison, use `다른 선수 찾기` or remove it. For multiple candidate selections that cannot be one workspace, require the Task 2 recovery state rather than choosing a first subject.

  **Must NOT do**: Do not merge same-name candidates, add a comparison URL protocol, claim account ownership, or auto-link a workspace to an account.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 10 | Blocked By: 1, 2

  **References**:
  - `frontend/src/pages/MainPage.tsx:92-100` - home search canonical URL.
  - `frontend/src/components/home/homeFirstUse.ts` - first-use action naming and destinations.
  - `frontend/src/components/records/RecordsMineDoneStep.tsx` and `frontend/src/components/record-insights/MyRecordsCard.tsx` - legacy record entry language.
  - `frontend/src/features/record-workspace/pages/RecordWorkspacePage.tsx` - complete multi-subject workspace detail.
  - `frontend/src/features/record-workspace/pages/RecordAthletePage.tsx` - single-candidate detail boundary.

  **Acceptance Criteria**:
  - [ ] Each public record CTA has one documented purpose and destination in a route inventory test.
  - [ ] A two-candidate same-name workspace shows the preview's complete count after save and never opens only subject one.
  - [ ] No live CTA contains `비교` unless the entire selection-to-result path exists and is tested.
  - [ ] Home continuation does not reveal a saved workspace title or person name before the user opens it.

  **QA Scenarios**:
  ```text
  Scenario: Same-name multi-candidate workspace
    Tool: real browser
    Steps: Select two distinct same-name candidates, create a workspace, open its detail.
    Expected: The detail count and subject count match review; each subject remains visibly separate.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-3-workspace-destination.md

  Scenario: Unsupported comparison action
    Tool: browser plus source-contract test
    Steps: Follow all public record actions from a single candidate and from mixed names.
    Expected: No path creates hidden comparison state or leads to an unfinished comparison page.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-3-no-phantom-compare.md
  ```

  **Commit**: YES | Message: `fix(records): align record entry and workspace completion` | Files: entry components, workspace pages, route tests.

- [x] 4. Stop obvious sensitive data from entering data-request free text

  **What to do**: Extend server-side request validation to reject clearly identifiable resident-registration numbers, phone numbers, and email addresses in the free-text reason field before persistence. Keep contact information exclusively in the existing optional encrypted contact field. Return a short generic error without echoing the rejected text, add short client guidance that distinguishes public-record data from account contact data, and preserve the current ticket flow.

  **Must NOT do**: Do not introduce age verification, guardian collection, health-data classification, new contact fields, source IDs, automatic data-rights actions, or client-only validation.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 10 | Blocked By: none

  **References**:
  - `card-studio/services/dataRequestValidation.js:1-60` - server validation and sanitization boundary.
  - `frontend/src/pages/DataRequestPage.tsx:160-230` - requester guidance and form state.
  - `frontend/src/api/dataRequests.ts:1-50` - current typed request payload.
  - `card-studio/repositories/postgresDataRightsRepository.js:90-180` - encrypted contact and request persistence behavior.

  **Acceptance Criteria**:
  - [ ] A reason containing a Korean resident-registration number, phone number, or email is rejected before any request record is created.
  - [ ] Error text does not include the submitted value, and valid correction/delete/objection requests still receive a ticket.
  - [ ] UI tells users to use the separate contact field and not enter birth, health, credential, or identification data.

  **QA Scenarios**:
  ```text
  Scenario: Valid correction request
    Tool: node --test and browser
    Steps: Submit a correction with event context and optional contact through the normal form.
    Expected: Ticket is created and public ticket lookup remains metadata-only.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-4-data-request-valid.md

  Scenario: Sensitive reason refusal
    Tool: node --test and HTTP request
    Steps: Submit otherwise valid requests containing each forbidden identifier pattern in reason.
    Expected: Validation fails before persistence; response is generic and does not echo the input.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-4-data-request-sensitive.md
  ```

  **Commit**: YES | Message: `fix(privacy): reject sensitive request text` | Files: validation, request UI, focused tests.

- [x] 5. Add bounded, separate shared-device cleanup controls

  **What to do**: Keep two deliberately scoped controls instead of one broad browser wipe. The record screen clears record workspaces, workspace drafts, selected candidates, and the comparison tray after explicit confirmation. The training screen keeps its own training-log delete control. Each control names what it clears, states what it does not clear, and keeps sign-in state, general shortcuts, and unrelated site storage untouched. Add a compact shared-device warning before the first persistent save in each affected experience.

  **Must NOT do**: Do not call `localStorage.clear()`, wipe cookies, log users out, delete server data, delete shared settings, or imply account-level deletion.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 10 | Blocked By: 2

  **References**:
  - `frontend/src/features/record-workspace/model.ts:1-30` and `storage.ts:38-140` - workspace keys and storage API.
  - `frontend/src/components/record-insights/useMyAthlete.ts:1-70` - self-candidate key lifecycle.
  - `frontend/src/components/record-insights/useCompareTray.ts:1-90` - comparison tray key lifecycle.
  - `frontend/src/pages/TrainingCalculatorPage/components/TrainingLogStorageStatus.tsx` - training warning/status pattern.
  - `frontend/src/pages/TrainingCalculatorPage/components/TrainingLogLite.tsx` - training log storage boundary.

  **Acceptance Criteria**:
  - [x] The record-selection confirmation lists each affected category and has an accessible cancel path.
  - [x] Confirming clears all and only the documented record-selection keys, including an active draft; cancelling clears none.
  - [x] Reload leaves no workspace title, selected athlete, or compare selection visible. Training entries are only removed through their own, explicitly named training control.
  - [x] The UI uses device-local language and never promises private-account storage.

  **QA Scenarios**:
  ```text
  Scenario: Shared-school-PC cleanup
    Tool: real browser at 390x844
    Steps: Create a workspace, self selection, compare tray entry, and training log entry; open the cleanup control and confirm.
    Expected: All listed items disappear after reload; browser login and unrelated shortcut preference remain.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-5-shared-device-cleanup.md

  Scenario: Cancellation safety
    Tool: real browser
    Steps: Populate the same local items, open cleanup, then cancel.
    Expected: Every item remains; no storage key changes and no console/page error occur.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-5-shared-device-cancel.md
  ```

  **Commit**: YES | Message: `feat(privacy): add shared-device cleanup` | Files: local storage helpers, bounded UI controls, tests.

- [~] 6. Repair landmark, form, and focus foundations

  **What to do**: Establish exactly one main landmark on every core route: give layout main `id="main-content"`, add a keyboard-visible skip link, change home from nested main to a non-landmark container, and add main landmarks to standalone login/register pages. Connect labels, errors, and status messages to login/register controls; replace blocking registration alerts with page status. Move focus to the new records-flow stage heading or first control after a stage change. Make the header login dialog fully keyboard-modal using the existing Radix pattern or equivalent established primitive.

  **Current status**: the shared-layout landmark and skip-link work is complete. Account-form labels, non-blocking status messages, stage focus movement, and dialog focus trapping remain a separate refactor because the current account screens are oversized legacy components; do not patch them piecemeal.

  **Must NOT do**: Do not redesign account policy, modify credentials, change authentication API behavior, touch closed chat UI, or globally change color tokens without a separate visual contrast review.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10 | Blocked By: none

  **References**:
  - `frontend/src/components/layout/Layout.tsx:6-40` - duplicated layout landmark.
  - `frontend/src/pages/MainPage.tsx:107-185` - nested home landmark.
  - `frontend/src/pages/LoginPage.tsx` and `frontend/src/pages/RegisterPage.tsx` - standalone auth semantics.
  - `frontend/src/components/layout/HeaderLoginModal.tsx` - current login dialog behavior.
  - `frontend/src/components/records/RecordsMineFlow.tsx:35-70` - stage transition handling.
  - `frontend/src/components/ui/sheet.tsx` - existing accessible Radix primitive conventions.

  **Acceptance Criteria**:
  - [ ] Home, records, login, and register each render exactly one main landmark; home has no nested main.
  - [ ] First keyboard Tab reveals `본문으로 바로가기`, and Enter moves focus to main content.
  - [ ] Login/register labels and validation errors are programmatically connected; status changes are announced without `alert()`.
  - [ ] Dialog focus opens inside, stays inside with Tab/Shift+Tab, closes on Escape, and returns to its trigger.
  - [ ] Record-flow stage changes move focus once to the new stage context.

  **QA Scenarios**:
  ```text
  Scenario: Keyboard-only first visit
    Tool: Playwright or browser-control
    Steps: On home, press Tab then Enter; navigate to records and start candidate flow using keyboard only.
    Expected: Skip link works, focus follows each stage, no duplicate landmarks, no focus reaches hidden background dialog content.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-6-keyboard-flow.md

  Scenario: Invalid registration
    Tool: browser and component test
    Steps: Submit blank/invalid registration fields, then correct them.
    Expected: Focus reaches first invalid field; linked error/status text updates; no blocking browser alert.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-6-auth-errors.md
  ```

  **Commit**: YES | Message: `feat(accessibility): strengthen core focus flow` | Files: layouts, auth/records UI, focused tests.

- [ ] 7. Make preparation-only surfaces tell the truth

  **What to do**: Inventory every visible route and CTA for community, chat, market, result submission, competition submission, and any “talk about this” action. Replace any CTA that sends users to a preparation page as if it were an active destination with a completed alternative such as copy, source, record, or competition navigation. Keep the existing preparation pages, API 503 gate, WebSocket 503 gate, production configuration, and historical-doc markers aligned. Do not surface a new primary navigation item for an unlaunched feature.

  **Must NOT do**: Do not re-enable chat, comments, posts, uploads, market, automatic news, or any write request. Do not make a preparation surface a dead end without a clear return action.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 10 | Blocked By: none

  **References**:
  - `frontend/src/App.tsx:135-190` - current preparation-only routes.
  - `frontend/src/components/layout/Header.tsx` and `MobileTabBar.tsx` - public navigation states.
  - `frontend/src/components/record-insights/ShareCard.tsx` - known community CTA mismatch.
  - `backend/middleware/launchFeatureGate.js` and `src/server.js` - unavailable HTTP/WS enforcement.
  - `docs/athletetime-deployment-target.md` and `docs/athletetime-chat-open-plan.md` - deployment and historical plan context.

  **Acceptance Criteria**:
  - [ ] No active-looking CTA routes to a preparation-only social/write feature.
  - [ ] `/chat`, `/community`, and direct chat API/WS checks consistently describe the preparation state.
  - [ ] Each preparation screen has one meaningful return to a live record, event, or home path.
  - [ ] Static regression checks prevent restoring a WebSocket URL or live chat smoke instruction by accident.

  **QA Scenarios**:
  ```text
  Scenario: Record card after sharing
    Tool: browser
    Steps: Open a record card and inspect every visible action.
    Expected: Each action either completes locally/external share or opens a live record/event page; none promises community conversation.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-7-card-actions.md

  Scenario: Direct closed chat probes
    Tool: HTTP and WebSocket probe
    Steps: Request /api/chat/check-nickname and /ws/chat while opening /chat in a logged-out browser.
    Expected: API and WS return 503 no-store; route shows preparation-only copy and no console errors.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-7-chat-closed.md
  ```

  **Commit**: YES | Message: `fix(launch): align preparing feature actions` | Files: CTA components, route/docs/config tests only.

- [ ] 8. Make record coverage, source, and incomplete-page states truthful

  **What to do**: Separate “all matching records known to this workspace” from “records currently loaded on this screen.” In record and source tabs, label the latter as current-page data, state when more records remain, and rename freshness language to `가장 최근에 확인한 출처`. When a user selects an event that exists in overall workspace metadata but has not loaded into the current page, show an explicit load-more/retry state instead of `기록 없음`. Keep source IDs internal; use existing display-safe provider, URL, title/file, and checked-time data only.

  **Must NOT do**: Do not bulk-fetch full athlete history, expose source IDs, claim complete history, change source provenance, or create a new data-rights suppression behavior.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 10 | Blocked By: 1

  **References**:
  - `card-studio/services/recordWorkspacePreviewService.js:29-150` - pagination, coverage, and source metadata.
  - `frontend/src/features/record-workspace/pages/RecordWorkspacePage.tsx` - workspace record visibility/filter state.
  - `frontend/src/features/record-workspace/pages/RecordSourceList.tsx` - current source-tab rendering.
  - `frontend/src/features/record-workspace/components/RecordCoverageReceipt.tsx` - coverage wording.
  - `frontend/src/features/record-workspace/pages/RecordAthleteRecordTab.tsx` - event selection and empty state.

  **Acceptance Criteria**:
  - [ ] A loaded-page source list never implies it is the complete source list when more pages exist.
  - [ ] `가장 최근에 확인한 출처` does not imply old records were recently revalidated.
  - [ ] Selecting an event present only on a later page never displays a false “no record” result.
  - [ ] Public browser/API payloads used by the UI contain no new source ID field or raw-original path.

  **QA Scenarios**:
  ```text
  Scenario: Later-page event
    Tool: fixture-backed browser and component test
    Steps: Use a workspace whose target event only appears after the first preview page; select that event.
    Expected: The screen requests or offers more loading; it never claims no record while more data exists.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-8-later-page-event.md

  Scenario: Partial source list
    Tool: browser
    Steps: Open a workspace with multiple preview pages and inspect coverage then source tab before loading all pages.
    Expected: Current-page and overall scope language are visibly distinct; no sourceId appears.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-8-source-scope.md
  ```

  **Commit**: YES | Message: `fix(records): clarify loaded record coverage` | Files: workspace UI/tests and existing preview contract only.

- [ ] 9. Improve team-statistics comprehension without expanding disclosure

  **What to do**: Keep the exact current public DTO fields and aggregation behavior, but make the team detail's default time scope, data period, last source check, source count, and exclusions visible as a compact receipt. Add short definitions for `확인한 입상` and `기록 개선 확인`; describe affiliation category as a convenience classification based on record notation. Ensure no-results copy says that no public records were confirmed in the chosen scope, never that a team had no activity. Add a correction/request link that contains no team member or source identifier.

  **Must NOT do**: Do not add athlete count display, a roster, player links, event/season drilldown, individual PBs, best athlete, team ranking, exact medal claim, threshold logic, or team alias merging.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 10 | Blocked By: none

  **References**:
  - `frontend/src/features/team-performance/TeamPerformancePage.tsx:60-150` - visible team summary and selected season state.
  - `frontend/src/features/team-performance/TeamPerformanceSummary.tsx` - current card labels.
  - `frontend/src/features/team-performance/teamPerformanceContracts.ts` - DTO shape that must not grow.
  - `backend/tests/team-public-dto-boundary.test.js` - recursive forbidden-key contract.
  - `docs/athletetime-persona-team-memo-boundaries.md` - disclosure guardrails.

  **Acceptance Criteria**:
  - [ ] Team screen first view identifies its exact period and source/coverage limits.
  - [ ] No new member-identifying or per-small-cell data is rendered or returned.
  - [ ] All team copy avoids official roster, medal, ranking, best athlete, and growth-evaluation claims.
  - [ ] Existing public DTO boundary tests remain unchanged or stronger.

  **QA Scenarios**:
  ```text
  Scenario: University team manager snapshot
    Tool: browser at 390x844
    Steps: Open a team, verify recent-season default, switch to all time and back.
    Expected: Scope labels always match displayed period; data-range receipt remains visible; no athlete identity link exists.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-9-team-scope.md

  Scenario: Sparse youth team boundary
    Tool: API contract test
    Steps: Request a fixture team with one record and recursively inspect the response/rendered content.
    Expected: No forbidden personal key, raw record, workspace, note, attachment, or source ID appears; no new breakdown is added.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-9-team-boundary.md
  ```

  **Commit**: YES | Message: `fix(team-copy): clarify public record summaries` | Files: team UI/copy/tests only.

- [ ] 10. Assemble a persona release ledger and regression matrix

  **What to do**: Update the existing persona release matrix and decision register using only completed browser and contract evidence. Create an explicit route/state inventory for public, account, browser-local, preparation-only, and owner-gated areas. Record the verified findings from this plan, the exact D1-D6 non-decisions, storage keys covered by shared-device cleanup, and rollback behavior for every local-storage change. Include an operator-facing checklist that distinguishes a valid data correction ticket from an actual record change.

  **Must NOT do**: Do not state legal compliance, completeness, official verification, or that a policy decision was implemented when it remains deferred.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: F1-F4 | Blocked By: 1-9

  **References**:
  - `docs/athletetime-persona-release-matrix.md` - existing evidence format.
  - `docs/athletetime-record-ux-decision-register.md` - held decisions and guardrails.
  - `docs/athletetime-persona-team-memo-boundaries.md` - public/private separation.
  - `docs/athletetime-deployment-target.md` - production verification posture.
  - `backend/tests/launch-interaction-safety.test.js` and `backend/tests/team-public-dto-boundary.test.js` - release contracts.

  **Acceptance Criteria**:
  - [ ] Each persona claim in the ledger links to a specific test or browser evidence file.
  - [ ] D1-D6 are listed as blocked decisions, not roadmap features that an executor may silently implement.
  - [ ] The route inventory reflects current chat/community preparation state and public/local/account data boundaries.
  - [ ] A reviewer can tell from the document whether a change is safe to roll back by removing a scoped local key, route/CTA, or UI copy.

  **QA Scenarios**:
  ```text
  Scenario: Evidence traceability
    Tool: node script or manual document check
    Steps: Follow every release-matrix claim to its referenced evidence and test command.
    Expected: No claim lacks reproducible proof or calls a deferred decision complete.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-10-ledger-audit.md

  Scenario: Closed-feature consistency
    Tool: source scan and browser
    Steps: Compare route inventory against App routes, header/mobile navigation, and chat/feature gates.
    Expected: Every preparation-only path is marked consistently; no live-write claim remains.
    Evidence: .omo/evidence/multi-persona-safe-improvement/task-10-closed-feature-audit.md
  ```

  **Commit**: YES | Message: `docs(operations): record persona release evidence` | Files: docs/evidence and relevant static checks only.

## Final Verification Wave

- [ ] F1. Plan compliance and privacy-boundary audit

  **What to do**: Diff every changed route, DTO, storage key, and request payload against the must-not list and D1-D6. Confirm that no task added identity merging, source ID disclosure, private upload, public team expansion, chat/community writes, or automated publication.

  **Acceptance Criteria**:
  - [ ] `rg`/contract audit finds no newly exposed `person_no`, birth-date, private-note, attachment, raw source ID, or public-team forbidden key.
  - [ ] Every D1-D6 stays explicitly deferred in documentation and code comments only where necessary.

  **QA Scenario**: Run a reviewer checklist against the final diff and save a pass/fail table to `.omo/evidence/multi-persona-safe-improvement/f1-boundary-audit.md`.

- [ ] F2. Code quality and normalization review

  **What to do**: Run changed-file LSP diagnostics, targeted unit/contract suites, the full frontend suite, and a corpus normalization comparison. Review all fallback/error cases added by the plan.

  **Acceptance Criteria**:
  - [ ] `npm test` passes or only documented pre-existing skips remain.
  - [ ] `npm.cmd --prefix frontend run type-check` and `npm.cmd --prefix frontend run build:check` pass.
  - [ ] `git diff --check` is clean and changed TypeScript has no LSP diagnostics.

  **QA Scenario**: Save commands, pass counts, and any deliberate skips to `.omo/evidence/multi-persona-safe-improvement/f2-quality.md`.

- [ ] F3. Real browser QA across personas

  **What to do**: Exercise the core browser matrix as a first-time student, same-name athlete, guardian on a shared device, team manager, keyboard-only visitor, and logged-out visitor. Test at desktop and 390x844. Use fresh disposable local browser storage; remove only test-created data via the new scoped cleanup surface.

  **Acceptance Criteria**:
  - [ ] No blank route, unexpected console/page error, horizontal overflow, hidden selection, false empty event state, or unfinished comparison path occurs.
  - [ ] Every preparation-only route has a truthful recovery action.
  - [ ] Shared-device clear and sensitive data-request rejection operate as designed.

  **QA Scenario**: Store screenshots only for visual decisions and a step-by-step scenario table at `.omo/evidence/multi-persona-safe-improvement/f3-browser-personas.md`.

- [ ] F4. Deployment and rollback evidence

  **What to do**: Push verified commits, wait for the automatic production deploy, check the actual deployed bundles/routes, and document a scoped rollback for each task. Browser-local rollback must name only its own storage keys; server rollback must be a code rollback, never data deletion.

  **Acceptance Criteria**:
  - [ ] Production routes and direct unavailable-feature probes match the new contracts.
  - [ ] The release ledger contains commit IDs, deploy evidence, and safe rollback notes for each task.
  - [ ] No deployment instruction asks an operator to run a legacy chat migration or an unreviewed data-rights migration.

  **QA Scenario**: Record deployed URL checks and rollback matrix in `.omo/evidence/multi-persona-safe-improvement/f4-deploy.md`.

## Commit Strategy

- One focused commit per task with tests in the same commit. No mixed policy and UI commits.
- Use `fix(records)`, `fix(privacy)`, `feat(accessibility)`, `fix(team-copy)`, or `docs(operations)` prefixes.
- Push only verified commits to `main`; do not batch unknown local-storage migrations with data-processing changes.

## Success Criteria

- Every live public-record path remains explicit about candidate uncertainty and source coverage.
- No user action silently saves a hidden comparison, identity merge, sensitive request text, or new public team detail.
- Shared-device artifacts can be inspected and erased through clearly named, bounded controls without one area unexpectedly deleting another.
- A middle-school athlete can complete the mobile record path without reading repetitive legal text or encountering a false empty/finished state.
- Deferred policy decisions stay documented as gates rather than turning into accidental features.
