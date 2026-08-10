# AthleteTime Public Record UX and Personal Space Release Plan

## TL;DR
> **Summary**: Keep the useful public record experience simple and honest now, while creating hard release gates for account-backed collections, private notes, photos, and chat so that none of them quietly becomes a privacy or youth-safety risk.
> **Deliverables**: terminology contract, public team aggregate safety contract, release decision register, stable-reference design, private-vault design, and chat re-approval package.
> **Effort**: XL
> **Parallel**: YES - 4 gated waves
> **Critical Path**: Boundary freeze -> owner decisions -> stable references -> account collections -> text notes -> photo/chat re-approval

## Context

### Original Request
- Use many user personas and agents to find a better design for quick, safe private notes while continuing public record and team-statistics improvements.
- Continue low-risk work without waiting for another instruction, but leave consequential privacy, youth-safety, and product-policy decisions for the owner.

### Research Summary
- A public record candidate is not proof that the searched athlete is the visitor. `내 기록` must remain reserved for a future verified-ownership flow.
- Team surfaces are an aggregate of public results, not a roster, player profile, or private-workspace route.
- The current upload route returns a Cloudinary public URL and `public_id`; it must never serve private photos.
- Current workspace keys (`athleteKey`, `record.id`) are not stable enough to become permanent account references.
- Current live chat accepts client-generated identity/reporting values. Do not expand it before a separate safety release.

### Metis Review: Gaps Addressed
- The plan explicitly treats the live chat route as boundary drift that needs an owner decision, rather than assuming it is safely deferred.
- The existing implicit `latest` team period default is surfaced as an owner gate because API, URL, UI, and tests must agree.
- Small-group disclosure, durable IDs, vault privacy, and chat scope have measurable gates before implementation.

## Work Objectives

### Core Objective
Make the public record product clearer today and make future personal features safe to release only when their identity, access, storage, deletion, and support boundaries are real and testable.

### Must Have
- Public language consistently names the actual selected unit: `선수 후보`, `기록 모음`, `소속 통계`.
- A team page remains aggregate-only and never reveals a roster or personal workspace through API, URL state, or UI.
- Every consequential release has an explicit owner decision, a fail-closed behavior, and a regression test.
- Future account, note, photo, and chat work has a single dependency order that other workers can follow without inventing policy.

### Must NOT Have
- No automatic same-name merge, claimed athlete ownership, or account-to-public-record auto-linking.
- No account persistence using current `athleteKey` or `record.id` as durable references.
- No personal note/photo data in search, recommendation, team statistics, public APIs, admin screens, analytics, logs, or exports not initiated by the owner.
- No reuse of `/api/upload` or public Cloudinary URLs for personal photos.
- No new chat privilege, public visibility, or moderation promise until Gate 6 is approved.

## Owner Decision Gates

| Gate | Decision required | Recommended default | Blocks |
| --- | --- | --- | --- |
| G1 | Release scope | Public record UX + team wording only | all account/vault/chat work |
| G2 | Team initial period | Explicit user choice before data, otherwise current `최근` with visible switch | period-default changes |
| G3 | Small-group rule | Hide all cross-group metrics under 5 unique athletes; team total under 5 reads `5명 미만` | team redaction |
| G4 | Durable reference policy | `subject_uid` for a public-record grouping, `record_uid` for a source row; never a person assertion | account sync |
| G5 | Private vault policy | Text-only first; re-auth for export/delete; 30-day recovery; private owner-only 404 | notes/photos |
| G6 | Chat treatment | Freeze expansion and add no-expansion contract; decide separately whether existing routes are disabled | chat changes |

No task below a gate may be implemented until the owner records the chosen option in `docs/athletetime-record-ux-decision-register.md`.

## Verification Strategy
- **Tests**: TDD for every behavior change. Use Node contract tests, Vitest component tests, and the existing Playwright-backed record/team E2E flow.
- **Privacy checks**: recursively inspect public JSON responses and emitted logs for forbidden fields; non-owner/anonymous/admin access must produce the same `404` for future vault resources.
- **Evidence**: write sanitized results under `.omo/evidence/personal-space-release/`; never store raw private text, file URLs, or source documents in evidence.
- **Manual QA**: desktop and 390px mobile, guest and signed-in paths, browser back/forward, slow/failed request, and shared-device account-switch cases.

## Execution Strategy

### Wave 1: Boundary Freeze and Public UX Consistency

#### 1. Complete the public terminology contract
**Files**: `frontend/src/components/records/RecordsHub.tsx`, `frontend/src/features/record-workspace/pages/RecordAthletePage.tsx`, `frontend/src/features/record-workspace/components/WorkspaceSubjectList.tsx`, related Vitest tests.

**Implementation**
- Replace remaining `기록 담기` variants with a verb whose object is a person candidate, such as `이 선수 담기`.
- Use `기록 모음` for a user-created view and `선택한 선수` for its draft state.
- Reserve `내 기록` for a future G4-approved verified-ownership screen only.

**Acceptance**
- Source scan finds no public candidate-selection phrase that calls a player selection `기록 담기` or implies verification.
- Hub, candidate list, saved workspace, review page, and empty state agree on `선수 후보` wording.
- Browser E2E reaches the collection step using the final accessible label.

#### 2. Lock the public team aggregate boundary
**Files**: `card-studio/services/teamStatisticsService.js`, `card-studio/services/teamDetailService.js`, `backend/tests/team-performance-api.test.js`, `backend/tests/team-performance-copy.test.js`, `frontend/src/features/team-performance/*`.

**Implementation**
- Retain the current aggregate-only DTO and add a recursive forbidden-field contract for `name`, `athleteKey`, `records`, `affiliations`, `workspace`, `note`, and `attachment`.
- Ensure every team-to-person action opens a blank independent record search, never a filtered roster or a transferred personal selection.
- Standardize labels to `출전이 확인된 대회`, `모은 기록에서 확인한 입상`, and `최고 기록이 나온 횟수`.

**Acceptance**
- A team search/detail fixture has no forbidden field at any JSON depth.
- Manual mobile check shows a season snapshot without personal cards, roster actions, or horizontal overflow.
- Existing team E2E remains green.

#### 3. Publish the boundary and release-gate register
**Files**: `docs/athletetime-record-ux-decision-register.md`, `docs/athletetime-private-vault-release-boundary.md`, `docs/athletetime-operator-guide.md` if the operator guide references personal data.

**Implementation**
- Record G1-G6 choices as `open` until the owner decides them; do not turn recommendations into policy.
- Add an operator-facing prohibition: support staff may see only event status/error code for a future vault, never note body, photo, URL, or account-to-athlete linkage.
- List the known local development proxy requirement (`frontend` proxy port 3005) as a development note only; do not alter production routing.

**Acceptance**
- Docs contain all six gates, their blocking effect, and the evidence expected before release.
- Public help pages contain no internal vault runbook or operator-only access detail.

### Wave 2: Decision-Dependent Public Team Controls

#### 4. Implement the owner-approved team period default [G2]
**Files**: `card-studio/routes/recordAnalyticsRoutes.js`, `card-studio/services/teamDetailService.js`, `frontend/src/features/team-performance/teamPerformanceContracts.ts`, team page components and tests.

**Implementation**
- Change exactly one shared default constant after the owner selects `latest`, `all`, or mandatory first choice.
- Make the route parser, service default, URL state, visible label, and help copy derive from that constant.

**Acceptance**
- A request without `scope`, the rendered first screen, and the selected control all show the chosen period.
- Back/forward restores the explicit period selection.
- No label calls the selected view an official team total or official roster.

#### 5. Implement small-group redaction [G3]
**Files**: team services, public DTO contracts, team components, fixture and API tests.

**Implementation**
- Compute group eligibility server-side from unique public-record grouping keys, not browser values.
- For under-threshold cross-groups, return only `suppressed: true` and the approved generic message; omit numbers, chart points, sort hints, and athlete counts.
- Preserve aggregate-only data above threshold and version the DTO if nullable/redacted fields change the frontend contract.

**Acceptance**
- Under-threshold fixture returns no precise count at any nested level.
- At-threshold fixture returns normal aggregate values.
- A small whole team displays only the owner-approved generalized count, never its exact number.

### Wave 3: Account-Backed Record Collections [G4]

#### 6. Design and prove durable public-record references
**Files**: new data-contract doc, record analytics normalizer, source-ledger contract tests, migration design tests.

**Implementation**
- Define `record_uid` from immutable source identity and `subject_uid` as a public-record grouping, not a legal/real-person identity.
- Define correction behavior: a changed source never silently transfers a user exclusion; it becomes `needs_review`.
- Define release IDs so results index, team aggregates, cache, and workspace preview move together after a data correction.

**Acceptance**
- Correction, source-row replacement, and same-name cases demonstrate that a saved exclusion never moves to another public row.
- New references contain no birthdate, association personal number, or raw restricted identifier.
- No account schema or route exists before this test suite is green.

#### 7. Build account workspace sync only after durable references pass
**Files**: new account-workspace migration/repository/routes, workspace client adapter, auth/session tests, record-workspace tests.

**Implementation**
- Keep browser collections unchanged until an authenticated user explicitly chooses an idempotent import.
- Add an import receipt, a 30-day self-service undo, and no deletion of local browser data on failure.
- Require owner-scoped reads/writes and identical `404` for non-owner, anonymous, and administrator guesses.

**Acceptance**
- Account A cannot distinguish Account B's collection from a nonexistent collection.
- Refresh, retry, offline recovery, and shared-device account switch cannot duplicate or cross-import a collection.
- The workspace remains reversible and never claims athlete ownership.

### Wave 4: Private Space and Chat Re-Approval [G5, G6]

#### 8. Build text-only personal notes [G5]
**Files**: new private-vault schema/repository/routes/client screens, auth recovery and logging contracts, operator guide.

**Implementation**
- Start with title/body-only notes, owner-only API, no search/share/recommendation/admin browsing, `Cache-Control: no-store`, and approved at-rest protection.
- Re-authenticate before export, permanent deletion, password change, and opening the private space after recovery.
- Keep the recovery window and backup wording exactly as approved, including a truthful backup-expiry note.

**Acceptance**
- Owner CRUD works; non-owner/anonymous/admin requests all receive indistinguishable `404`.
- Logs, analytics, error bodies, team APIs, search APIs, and operator UI never contain note title/body.
- Password reset revokes existing sessions; private export/delete is blocked until re-authentication.

#### 9. Run a separate private-photo beta only after text notes are stable [G5]
**Files**: private object-storage adapter, signed URL service, client image normalizer, deletion worker, monitoring/alerting contracts.

**Implementation**
- Use a dedicated private bucket with random object keys and short-lived owner-scoped upload/read URLs.
- Browser strips EXIF/GPS and recompresses to the approved MIME, dimensions, count, and quota before upload.
- Keep all photo URLs, original filenames, and object keys out of logs, browser storage, public responses, and operator UI.

**Acceptance**
- The public Cloudinary upload route is never called by the private-photo flow.
- A downloaded stored file contains no EXIF GPS metadata.
- Expired, cross-account, anonymous, and administrator access fails without revealing existence.
- Staged upload, quota overflow, delete/recover, and 30-day/owner-approved expiry cleanup are observable with sanitized metrics.

#### 10. Decide and re-approve chat as an independent safety release [G6]
**Files**: `src/server.js`, `backend/routes/chat.js`, `backend/utils/websocket.js`, chat client hooks/components, security and youth-safety tests.

**Implementation**
- Until G6, add a contract that prevents any expansion in writer eligibility, visibility, or moderation claims.
- If the owner elects a limited beta, replace client-provided identity/reporting values with server-issued tickets tied to email-verified accounts; enforce Origin, payload, connection, and message limits server-side.
- On database write failure, reject the message rather than displaying memory-only success; log only event IDs and safety reasons.

**Acceptance**
- Spoofed `userId`, nickname, and `reporterKey` cannot earn privileges, bypass limits, or manipulate reports.
- Unauthenticated and cross-origin socket attempts fail before the chat surface is created.
- Content reports, block persistence, retention purge, and emergency-safety copy are tested without logging message body.

## Final Verification Wave
- Run `npm.cmd run verify`.
- Run Playwright record and team flows at desktop and 390px width, including back/forward and an empty search.
- Run privacy response scans for team surfaces and every new private route; record only sanitized pass/fail evidence.
- Run account isolation tests with two accounts plus an administrator identity.
- Run data-correction/remapping tests before any workspace persistence release.
- Verify that public UI and public help content never promise full history, official ranking, verified ownership, end-to-end encryption, or administrator inability that the system cannot prove.

## Handoff
- Implement Wave 1 only without further owner decisions.
- Treat Waves 2-4 as blocked at their respective G2-G6 decisions; do not replace those gates with a developer assumption.
- After each wave, attach sanitized evidence and request review before beginning the next wave.
