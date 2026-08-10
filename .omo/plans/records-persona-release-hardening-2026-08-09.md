# AthleteTime Records Persona Release Hardening

## Purpose

Make a public record lookup feel clear on a phone for a first-time student,
runner, guardian, or coach, while preserving the service's most important
truth: collected public records are not identity verification, a roster, or an
official record certificate.

## Evidence Base

This plan consolidates 18 independent persona and architecture reviews on the
active `codex/record-ux-clarity` branch. A finding becomes implementation work
only after the current source and a focused test prove it still exists. This
avoids reintroducing behavior already fixed on the branch.

## Non-Negotiable Boundaries

1. Never auto-merge same-name candidates or imply that a user owns a public record.
2. Keep team surfaces aggregate-only; they must not expose athletes, raw rows,
   affiliation history, local collections, notes, or attachments.
3. Keep browser collections explicitly device-local until a separate
   account-data design is approved.
4. Do not put private notes or photos on the existing public-upload path.
5. Keep community identity and write-path changes out of this release.
6. Do not repair Korean text encoding based on shell mojibake alone; browser
   evidence currently shows valid UTF-8 rendering.

## Owner Decision Gates

| Gate | Decision | Default before owner decision |
| --- | --- | --- |
| G1 | Suppression or bucketing for team groups below five unique athletes | No new group fields, charts, or exposure |
| G2 | Default redaction level for minor-related sharing | Do not expand sharing or add variants |
| G3 | Account-backed collection or record claim | Collections remain browser-only |
| G4 | Private note/photo storage, access, retention, and incident handling | No private API, storage, or upload feature |
| G5 | Community identity, moderation, and anti-abuse model | No community write expansion |

## Workstream Skeleton

### Release Gate

**Goal:** Prevent a test-only regression from obscuring the actual UX work.

1. Reproduce the three current `npm test` failures in isolation before editing:
   `athlete-user-ux.test.js`, `progressive-ux.test.js`, and
   `record-workspace-candidate-list.test.js`.
2. Confirm whether each test still looks for the former direct
   `RecordCandidateList` render after the current code introduced
   `RecordCandidatesSurface` as its wrapper.
3. If the public behavior is already covered by the current focused browser and
   component tests, update only the stale source-contract assertions to target
   `RecordCandidatesSurface`. Do not change production behavior merely to
   satisfy an old component name.
4. Run the three tests, the record-flow browser test, frontend build check, and
   the full root test command. Publish the exact result in PR #79.

**Acceptance criteria**

- No test is deleted or weakened; each updated assertion still verifies render
  order or candidate-surface behavior rather than a string-only coincidence.
- The original user edit to `RecordsMineTypes.ts` is not staged, modified, or
  reverted.
- PR checks become green or any remaining failure is proven unrelated and
  recorded with its source.

### Wave 1: First Use and Candidate Clarity

**Goal:** A guest who only knows a name and school can make the right first
choice, understand a same-name result, and recover from a mistaken choice.

**Implementation order**

1. Inspect `MainPage.tsx`, `RecordsHub.tsx`, `RecordsMineCandidateStep.tsx`,
   `RecordsMineConfirmStep.tsx`, and `RecordsMineDoneStep.tsx` together. Keep
   one primary first-use action: finding a public record by name or affiliation.
   Secondary browsing remains available but visually subordinate.
2. Replace product-internal flow words with goal-based labels. The record hub
   must make the two choices distinguishable without requiring a user to know
   what a collection or workspace is.
3. In candidate selection, retain the six-person maximum but explain why a
   user might select more than one candidate, show selected count, and repeat
   the same-name caution on every ambiguous candidate card.
4. In confirmation, ask whether the selected people are the intended public
   record candidates. Do not call the step a verification, ownership, or
   identity claim.
5. On the done screen, expose one dominant next action that opens the selected
   public results. Keep add-more and seasonal exploration as secondary actions.

**Files and guardrails**

- `frontend/src/pages/MainPage.tsx`
- `frontend/src/components/records/RecordsHub.tsx`
- `frontend/src/components/records/RecordsMineCandidateStep.tsx`
- `frontend/src/components/records/RecordsMineConfirmStep.tsx`
- `frontend/src/components/records/RecordsMineDoneStep.tsx`
- `frontend/src/features/record-workspace/components/RecordCandidateCard.tsx`

Do not add examples, synthetic athletes, automatic candidate ranking, or an
identity-confidence score. Every card continues to show observed affiliation,
observed season range, result count, and the ambiguity warning where applicable.

**Acceptance criteria**

- Guest mobile flow at 320x568 and 375x667: hub -> name search -> same-name
  selection -> confirmation -> public records has one obvious primary action
  per screen.
- The seventh candidate cannot be selected and the current six selections stay
  unchanged.
- Candidate context reappears when returning from an in-app detail page; a
  shared direct URL does not invent a return context.
- Copy scan finds no new `official`, `verified`, `owned`, `claim`, `merged`,
  or equivalent identity assertions.

### Wave 2: Mobile and Recovery Reliability

**Goal:** Make the record flow reliable on small screens and from incomplete
or shared links.

**Implementation order**

1. Keep the current single-active-dock rule. Inspect all record-flow fixed or
   sticky controls before adding another bottom action. The active priority is
   selection confirmation, comparison, then a passive saved-collection hint.
2. Reserve bottom content space using the active control's actual height plus
   the existing safe-area token. Verify the final result row remains tappable.
3. Add visible focus treatment and a 44px minimum hit area to raw record-flow
   buttons not already using the shared Button primitive.
4. During a search, expose `aria-busy`, a visual loading state, and a disabled
   repeat submission path. Do not let slow-network taps appear to create
   multiple searches.
5. Revalidate shared athlete links. A copied public athlete link must strip
   search, compare, flow, step, draft, and local-workspace state. A missing
   athlete link must offer a focused `기록 찾기` recovery action, not a blank
   page.

**Files and guardrails**

- `frontend/src/pages/RecordsPage.tsx` (substitute or extract only; do not
  grow the existing oversized route component)
- `frontend/src/components/record-insights/CompareTray.tsx`
- `frontend/src/features/record-workspace/components/WorkspaceDraftTray.tsx`
- `frontend/src/components/records/RecordSearchResults.tsx`
- `frontend/src/features/record-workspace/pages/RecordAthletePage.tsx`

Do not add a second persistent tray, a modal-first search flow, or a share URL
that carries device-local draft state.

**Acceptance criteria**

- At 320x568, 375x667, and 390x844, one and only one fixed record action is
  visible above the mobile tab bar; no control covers the final selectable row.
- Keyboard focus remains visible after every tab/Enter activation.
- Clipboard unavailable and stale direct-link states each have one clear
  recovery action with no console or page error.
- The canonical athlete-link browser contract passes with zero local state in
  the copied URL.

### Wave 3: Team Aggregate Clarity

**Goal:** Make a team page read as a season-level public-results snapshot, not
as a team roster or athlete-profiling page.

**Implementation order**

1. Keep the first visible page to team label, active period, last collected
   date, and four metrics only: indexed competitions, confirmed 1-3 place
   results, comparable indexed improvements, and distinct events.
2. Put the active scope directly under the team label. Every scope states that
   missing seasons are not proof of no participation and that numbers are based
   on collected public results.
3. Rename trend visualizations as record volume unless a stable denominator is
   documented and rendered alongside it. Do not introduce a "best team",
   "top athlete", roster, or individual-result feature.
4. Keep team-to-person navigation as a fresh blank public record search. It
   must not carry team query, athlete selection, local workspace, or saved
   device state.
5. Extend the recursive DTO regression check before any field is rendered.

**Files and guardrails**

- `frontend/src/components/records/TeamStatisticsResults.tsx`
- `frontend/src/features/team-performance/TeamPerformancePage.tsx`
- `frontend/src/features/team-performance/TeamPerformanceSummary.tsx`
- `frontend/src/features/team-performance/TeamSeasonTrend.tsx`
- `frontend/src/features/team-performance/teamPerformanceContracts.ts`
- `card-studio/services/teamDetailService.js`
- `backend/tests/team-performance-api.test.js`

Do not implement small-group suppression, competition-row disclosure changes,
or inferred category badges until G1 has an owner decision. No team endpoint
may return `name`, `athleteKey`, `records`, `affiliations`, `workspace`,
`note`, `attachment`, raw arrays, or equivalent hidden sort fields.

**Acceptance criteria**

- Team search -> latest-season snapshot completes in three taps or fewer on a
  phone.
- The public API recursive scan finds no prohibited keys.
- The team page exposes no athlete list, athlete card, or prefilled individual
  search route.
- Existing latest/all/season behavior stays explicit and URL-restorable.

### Wave 4: Device-Local and Data-Request Clarity

**Goal:** Let people understand what their browser saves and submit a
correction/hide request without oversharing.

**Implementation order**

1. Use `이 기기에만 저장` next to every action that writes record collection,
   comparison draft, or record-display preference to browser storage. Do not
   say or imply account sync, ownership, or recovery across devices.
2. Add a clear local-only reset action at the collection manager. It removes
   only local state and must never alter public records or create a data-rights
   request.
3. Keep data requests to minimum data: athlete name and reason required;
   affiliation, competition, event, and contact optional. Show the sensitive
   data warning before the first free-text field.
4. Add type-specific examples of useful non-sensitive context only if they are
   generic and do not encourage screenshots, school IDs, birth dates, medical
   information, passwords, or attachments.

**Files and guardrails**

- `frontend/src/components/record-insights/useMyAthlete.ts`
- `frontend/src/features/record-workspace/pages/RecordWorkspaceManagerPage.tsx`
- `frontend/src/pages/DataRequestPage.tsx`
- `card-studio/services/dataRequestValidation.js`
- `backend/tests/data-rights-copy.test.js`
- `backend/tests/data-rights-lifecycle.test.js`

The current Cloudinary upload route is public-by-URL storage. It is explicitly
not a legal or technical home for private notes, private photos, or evidence.

**Acceptance criteria**

- A reset deletes local state only; a public athlete link still loads in a new
  browser context.
- The client and server continue to accept a request with only athlete name and
  reason.
- No storage copy claims private sync, verified identity, or account ownership.
- No data-request UI offers an attachment or asks for sensitive identifiers.

### Deferred Security and Policy Work

These are not safe UX polish. They require a separate threat model, owner
decision, and dedicated PR because each changes who can expose or infer a
person's information.

1. **G1 small-team protection.** The public team DTO must not gain smaller
   breakdowns until the owner chooses whether groups below five unique athletes
   are suppressed, bucketed, or entirely unavailable. Server-side enforcement
   and a test for hidden values, chart points, and sort hints are mandatory.
2. **G2 minor-related sharing.** Decide the default visible fields for a
   share card before offering redacted/full variants. The default must be
   evaluated for name, affiliation, event, date, exact record, and source.
3. **G3 account-backed collections.** Do not migrate local selected-athlete
   state to an account until deletion, logout, shared-device, recovery,
   retention, and breach handling are designed and tested.
4. **G4 private notes/photos.** The current `/api/upload/*` response returns a
   public Cloudinary URL and identifier. Any private feature needs a distinct
   authenticated API, private object storage, authorization checks, deletion,
   retention, malware handling, and audit trail. Reusing the current path is a
   release blocker.
5. **G5 community identity.** The present anonymous identity model and a
   verified-member model are incompatible behaviorally. Treat that migration
   as a replacement with HTTP-level migration, anti-abuse, moderation, and
   rollback tests, not a configuration toggle.
6. **Operator observability.** Plan a dedicated data-rights operations PR for
   readiness status, repository parity, transition receipts, and purge-run
   summaries. It must preserve current fail-closed suppression behavior.
7. **Security revalidation.** Re-run current-source tests for blinded-content
   filtering, client-chosen anonymous IDs, account enumeration, admin
   bootstrap, public payload fields, and upload boundaries. Earlier persona
   reports are leads only; ship a security fix only when the active branch
   proves the defect.

### Verification Matrix

Run the matrix after each wave and again before release:

| Surface | Guest | Logged-in | Narrow mobile | Standard mobile | Desktop |
| --- | --- | --- | --- | --- | --- |
| First record lookup | Required | Required | 320x568 | 375x667 | 1440x900 |
| Same-name candidate selection | Required | Required | 320x568 | 390x844 | 1440x900 |
| Candidate detail and return | Required | Required | 375x667 | 390x844 | 1440x900 |
| Saved device-local collection | Required | Required | 375x667 | 390x844 | 1440x900 |
| Team aggregate snapshot | Required | Optional | 375x667 | 390x844 | 1440x900 |
| Data-rights request | Required | Optional | 375x667 | 390x844 | 1440x900 |

**Command sequence**

1. Run the focused Node and Vitest suites for the files changed in the wave.
2. Run `node --test backend/tests/records-flow-e2e.test.js` and
   `node --test backend/tests/records-mobile-dock-e2e.test.js` with the
   designated mobile viewport fixtures.
3. Run `npm --prefix frontend run build:check` and
   `npm --prefix frontend test -- --run`.
4. Run `npm test`, then inspect the PR checks. If local environment behavior
   prevents completion, state the command and reason precisely rather than
   calling it green.
5. Inspect the rendered screen, keyboard focus, error recovery, and browser
   console. A passing source test is not enough for a mobile interaction change.
6. Run `git diff --check`, inspect the exact staged paths, and keep unrelated
   user edits out of the commit.

## Implementation Routing

| Work type | Recommended model | Required handoff evidence |
| --- | --- | --- |
| Copy, focus rings, clear local-state wording, fixture updates | Terra medium | changed paths and focused tests |
| Navigation context, mobile action priority, team DTO contracts | Terra high | failing test first, state diagram, browser proof |
| Minor sharing, identity, private storage, community migration, security fixes | Sol very high | threat model or decision record plus HTTP-level evidence |

## Completion Definition

The safe release work is complete only when all of the following are true:

- A new guest can find and inspect a public record in a few deliberate steps
  without mistaking it for a verified profile.
- Same-name candidates remain visibly separate before, during, and after
  navigation; no workflow creates an implicit merge.
- The phone record flow has one active bottom action, clear loading/recovery,
  and visible keyboard focus at the three defined viewport sizes.
- Team pages provide a scoped aggregate snapshot without functioning as a
  roster or leaking individual-level fields.
- Browser collections and data-rights forms ask for and store only what their
  current implementation can honestly support.
- Every G1-G5 decision remains unshipped and visibly documented as deferred.
