# AthleteTime Persona-Guided Improvement Wave

## Objective

Keep the public record-search loop clear, recoverable, and safe for students,
guardians, team users, and anonymous visitors. Improve only reversible public
read-only and browser-local behavior in this wave. Hold every change that
alters identity, private storage, publication, or the public disclosure
boundary for an owner decision.

## Evidence Baseline

- The active baseline is [the persona roadmap](../../docs/athletetime-persona-improvement-roadmap.md),
  [release matrix](../../docs/athletetime-persona-release-matrix.md), and
  [record UX decision register](../../docs/athletetime-record-ux-decision-register.md).
- The latest multi-persona review has already confirmed: same-name separation,
  reset before fresh candidate selection, sensitive-data rejection in correction
  reasons, public team DTO field exclusions, chat closure, and the recorded
  reports migration recovery path.
- No task below may add automatic identity merging, an account-to-athlete link,
  a private upload, a new public write surface, or a granular team statistic.

## Scope

### Included

1. Route failure and failed-request recovery for the existing public search
   journey.
2. Honest, bounded device-local cleanup and storage-failure feedback.
3. Keyboard, focus, small-screen, and loading-state resilience.
4. Regression tests that distinguish a browser/lazy-route timing race from a
   product failure.

### Explicitly Excluded

- Team cohort-size suppression and new team metric exposure.
- Private notes, photographs, attachments, cloud synchronization, or account
  storage.
- Row-level data correction, hiding, deletion, or source-record linking.
- Reopening chat, community writes, uploads, marketplace, or contributions.
- Automated editorial publication or athlete narratives.

## Decisions Already Fixed

| Area | Decision | Why |
| --- | --- | --- |
| Same-name records | Keep separate candidates; do not merge automatically. | A shared name or school history is not proof of identity. |
| Browser-local data | Keep it outside the account and server. | A browser selection is not verified ownership. |
| Chat/community | Keep every write route closed. | Existing browser-provided identity/report fields are not safe to reopen. |
| Correction requests | Reject obvious resident-registration numbers, phone numbers, and email addresses in the free-text reason. | The form should not become a plaintext sensitive-data store. |
| Team pages | Keep aggregate-only public DTOs. | A team view must not become an athlete directory. |

## Execution Waves

### Wave A — Public Recovery and First-Use Reliability

**Files and patterns**

- Extend the existing `frontend/src/components/common/RouteFailureBoundary.tsx`;
  do not add a second global error-boundary system.
- Follow loading/recovery behavior in `frontend/src/App.tsx`,
  `frontend/src/pages/RecordsPage.tsx`, and `frontend/src/pages/PaceRisePage.tsx`.
- Add focused component and browser tests beside the existing records recovery
  tests, not broad string-only tests.

**Steps**

1. Inventory every public route that can fail after its lazy module has loaded:
   record search, candidate selection, workspace preview, PaceRise, and data
   request status lookup.
2. For each state, show exactly one primary recovery action and at most two safe
   exits (`다시 시도`, `기록 찾기`, `홈으로`). Never say a record is missing
   when only a request failed.
3. Use semantic readiness in browser tests: wait for the Suspense fallback to
   disappear, `document.readyState` to complete, and the target heading or
   route landmark to exist before interacting.
4. Test a failed request, a successful retry of the same query, back/forward,
   and 375px width with zero unexpected console/page errors.

**Acceptance criteria**

- A failed public request preserves the original query or selected candidate
  scope in the current browser session and offers a truthful retry.
- A lazy import/render error displays the existing boundary with retry, records,
  and home exits.
- The browser suite proves the route is ready after loading, not merely that the
  fallback was rendered.

### Wave B — Shared-Device and Local Storage Truthfulness

**Files and patterns**

- Reuse `frontend/src/components/records/RecordDeviceDataControls.tsx`,
  `frontend/src/features/record-workspace/useRecordWorkspaceStore.ts`,
  `frontend/src/components/record-insights/useMyAthlete.ts`, and
  `frontend/src/components/record-insights/useCompareTray.ts`.
- Reuse the existing training-log storage outcome types in
  `frontend/src/pages/TrainingCalculatorPage/components/trainingLogStorage.ts`.

**Steps**

1. Define the exact keys affected by the shared-device control before coding:
   record workspace draft and saved workspaces, `나로 지정` entries, and the
   comparison tray only.
2. Keep the current separate training-log deletion control; explain that it is
   separate rather than silently expanding the records control into all storage.
3. Do not clear authentication cookies, login redirect state, home shortcuts,
   calculator preferences, or unrelated site preferences.
4. Preserve current storage-failure behavior: the visitor can continue in a
   volatile session, but the UI never says that an unavailable write was saved.
5. Add an explicit confirmation/complete state after cleanup that lists the
   categories removed without naming stored athlete records.

**Acceptance criteria**

- A clean-up action removes only the documented device-local record keys.
- Login state and unrelated preferences survive the action.
- Disabled storage, malformed JSON, quota failure, and a reload leave a clear
  truthful state and a usable route back to record search.

### Wave C — Accessibility and Compact Navigation

**Files and patterns**

- Extend the existing main landmark in `frontend/src/components/layout/Layout.tsx`.
- Follow the current mobile drawer contracts in `frontend/src/components/layout/Header.tsx`
  and `frontend/src/components/layout/HeaderMobileDrawer.tsx`.

**Steps**

1. Add a keyboard-visible skip link that targets the existing `#main-content`.
2. Verify the desktop `더보기` control exposes its expanded state, can close with
   Escape, and restores focus to its trigger.
3. Audit new or changed icon-only controls for accessible names.
4. Test keyboard sequence, focus restoration, and 360px/375px touch reachability.

**Acceptance criteria**

- A keyboard user can skip navigation, open/close `더보기`, and continue from
  the original control without focus loss.
- No route has nested main landmarks.
- Tests use roles, labels, or stable data attributes instead of fragile encoded
  Korean text selectors.

### Wave D — Verification and Release Handoff

1. Run targeted unit/component tests for every changed local-storage and route
   behavior.
2. Run `npm.cmd --prefix frontend run build:check` and the targeted serial
   browser suite.
3. Run a manual 375px pass as a nonmember, a student candidate-search user, a
   guardian submitting a correction request, and a shared-device user.
4. Record exact routes, expected actions, actual actions, and console/page
   errors in the release matrix.
5. Publish one concise implementation handoff listing changed browser keys,
   recovery states, deferred decisions, and rollback boundaries.

## Owner Decision Gates — Do Not Implement Yet

| Gate | Required decision | Required proof after decision |
| --- | --- | --- |
| D1: Small team cohorts | Minimum group size; school/youth higher floor; hide vs bucket counts. | Server DTO recursively suppresses every small season/event/division slice; API response has no names, athlete keys, raw rows, source IDs, workspace data, notes, or attachments. |
| D2: Account privacy and consent | What account consent is stored, age/guardian process, session duration, deletion path. | Registration, policy, and deletion/reauth flows tested in browser and server. |
| D3: Private vault | Storage provider, key ownership, signed access, retention, deletion, export, reauthentication. | Cross-account, admin, URL-guessing, expiry, delete, and recovery tests pass; public Cloudinary is never called. |
| D4: Row-level rights actions | Stable source-record identifier, evidence rules, reviewer action, retention, rollback. | Two same-name/source tuples prove one action cannot affect the other; PostgreSQL repair rehearsal is repeatable. |
| D5: Community reopening | Member identity, moderation, reporting, rate/origin/payload limits, retention and escalation. | API and WebSocket reject forged identity/report data; live moderation runbook passes before public launch. |
| D6: Editorial automation | Human approval, source receipt, correction route, seasonal cadence. | Every draft shows source/time/range and cannot publish without approval. |

## Non-Negotiable Release Guards

- Keep `/chat`, `/api/chat/*`, and `/ws/chat` closed together until D5 passes.
- Do not infer a person from a name, affiliation, school change, or legacy ID.
- Do not expose internal source IDs in public workspace or team responses.
- Do not store sensitive information from correction-request prose.
- Do not turn a transport or loading failure into a claim that data does not
  exist.

## Rollback Boundaries

- Waves A-C are frontend/public-read-only or browser-local. Roll back by
  reverting the narrowly scoped commit; they do not require data migration.
- D1-D6 are not eligible for this rollback path because they alter the public
  or private data boundary. Each must receive its own approved rollout and
  rollback plan.

