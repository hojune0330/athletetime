# AthleteTime Persona-Led Safe Next Wave

## Objective

Keep AthleteTime's public record experience reliable, understandable, and
privacy-preserving while explicitly preventing unapproved changes to personal
data, team disclosure, account policy, community interaction, private storage,
row-level record actions, and editorial publication.

## Baseline

- Current branch baseline: `main` at `829bd0e` after public-route error
  hardening and Korean recovery-copy normalization.
- The record workspace keeps same-name candidates separate and stores its
  helper selections only in the browser.
- The team surface is aggregate-only, but sparse aggregate disclosure is not
  approved for expansion.
- Chat, community writing, marketplace writing, and upload writes remain
  fail-closed with `503` and `Cache-Control: no-store`.
- PaceRise resolves malformed or stale competition links to an available
  competition instead of presenting a blank detail area.

## Persona Review Summary (2026-08-12)

Thirty browser, code-boundary, and adversarial review cases were consolidated
through the release matrix. The following fixes are now part of the baseline,
so a later worker must not re-open or duplicate them:

- Invalid or stale PaceRise links recover to a real competition instead of a
  blank panel.
- Same-name candidates remain separate; the last selected candidate can be
  removed and returns to a fresh record search.
- Browser-local record cleanup never claims success when storage could not be
  cleared, and provides one retry action.
- Desktop "more" navigation restores focus after Escape or backdrop close.
- Registration has bounded email and IP attempts; public route failures do not
  disclose internal exception text; public record errors use Korean recovery
  language.
- Direct chat, community-write, marketplace-write, upload-write, and chat
  WebSocket access remain closed with `503` and `Cache-Control: no-store`.

The remaining high-value findings split into two kinds:

1. **Safe UX maintenance:** no-example first use for calculators, short
   recovery-first copy on long help/request views, accessibility/focus checks,
   and broken-link or empty-state recovery.
2. **Owner-only expansion:** small-team numbers, account/minor policy,
   private vaults, row-level data actions, member interaction, and editorial
   publishing. These are not implementation backlog items until their gate is
   explicitly decided.

## Gate Index

No task in this plan may weaken a gate below. A missing owner decision means
the current closed boundary remains in force.

| Gate | Canonical decision file | Current rule |
| --- | --- | --- |
| Row-level correction, hiding, or deletion | `docs/decisions/03-row-level-data-rights-lifecycle.md` | No new public row key, request field, lookup shortcut, automatic action, or raw deletion. |
| Private notes and photos | `docs/decisions/04-account-bound-private-notes-photos.md` | No private route, API, storage, upload, export, or deletion flow; never reuse `/api/upload/*`. |
| Verified community and chat | `docs/decisions/05-verified-member-community-chat.md` | No reopen of chat, post, comment, report, or WebSocket interaction. |
| Magazine or editorial publication | `docs/decisions/06-magazine-editorial-publication.md` | No collector, drafting, scheduling, publishing, or flag enablement. |
| Account, minor, guardian, and session policy | `docs/decisions/account-terms-privacy-consent.md` | No new consent, age, guardian, persistent-session, or account-data collection. |
| Small-team aggregate disclosure | `docs/decisions/team-small-group-aggregate-threshold.md` | No new count, metric, chart, drilldown, slice, ordering hint, or API field. |

## Allowed Work Classes

| ID | Work class | Allowed changes | Explicitly prohibited | Completion evidence |
| --- | --- | --- | --- | --- |
| S1 | Public error recovery | Generic recovery copy, safe HTTP status/cache headers, route-level regression tests | Exception text, source paths, credentials, user input, or identifiers in public errors | `backend/tests/public-route-error-boundary.test.js` plus a real HTTP request with an injected marker absent from the response. |
| S2 | Record discovery and navigation | Broken-link recovery, valid empty states, focus management, same-name separation, stale local-draft clearing, accessible labels | Account-to-record linking, automatic identity merge, public internal record/source keys | Record workspace unit tests and `backend/tests/records-*-e2e.test.js`. |
| S3 | Read-only team navigation and wording | Existing aggregate-only labels, source-range wording, correction-link reachability, browser routing | Any new numeric aggregate, chart point, athlete count, team roster wording, person link, or granular filter | `backend/tests/team-public-dto-boundary.test.js` and `backend/tests/records-flow-e2e.test.js`. |
| S4 | Closed-surface truthfulness | Preparation-page copy, recovery links, no-store headers, server gates, configuration documentation | Removing a gate or adding any write-capable UI, API, WebSocket, upload, or environment flag | `backend/tests/launch-interaction-safety.test.js` and `backend/tests/deployment-wiring.test.js`. |
| S5 | Accessibility and responsive recovery | Keyboard focus return, tap targets, headings, contrast, no-console-error route recovery | New data collection, tracking identifiers, or user-behavior analytics | Browser checks at 390px and 1280px with console/page errors captured. |
| S6 | Direct-input calculator first use | Start calculator time/distance fields empty, keep calculation disabled until a valid direct entry, and make reset return to the same empty state | Sample athlete data, example performance values, saved calculator identity, training-log/account linking | Focused component tests plus a 390px browser check prove no result appears before valid input and a valid manually entered value produces a result. |

## Execution Tasks

### 1. Preserve the public error boundary

**Files and scope**
- `card-studio/routes/publicErrorResponse.js`
- Public children of `card-studio/routes/publicRoutes.js`
- `backend/tests/public-route-error-boundary.test.js`

**Implementation**
1. For every newly added public `500` path, use the existing generic responder.
2. Keep expected validation, unavailable, and not-found messages distinct only
   when they are intentional public states and contain no internal detail.
3. Add the new regression test to the root `npm test` script in the same
   change. Do not rely on a test file that CI does not run.

**Acceptance criteria**
- A forced unique error marker is absent from the actual HTTP body.
- The response is HTTP `500`, has `Cache-Control: no-store`, and returns the
  stable Korean recovery message.
- A normal public request stays `200` with its existing success DTO.

### 2. Maintain record-flow recovery without identity expansion

**Files and scope**
- `frontend/src/features/record-workspace/`
- `frontend/src/components/records/`
- `backend/tests/records-flow-e2e.test.js`
- `backend/tests/records-workspace-e2e.test.js`

**Implementation**
1. Treat a stale shared candidate, unavailable candidate, or final selected
   candidate removal as a route-recovery problem, not an identity match.
2. Keep the reset destination exactly
   `/records?flow=browse&browse=athlete` with replacement history when the
   last candidate is removed.
3. Keep a same-name candidate as a separately selectable person; do not merge
   by display name, school, or inferred history.
4. Preserve truthful browser-local wording when local storage is unavailable
   or cleanup cannot be confirmed.

**Acceptance criteria**
- A direct stale athlete link returns to record search in one visible action.
- Removing the final candidate clears the session draft before opening fresh
  search; browser Back does not reopen a stale review page.
- Two same-name candidates remain independently usable and do not trigger
  console or page errors.

### 3. Keep PaceRise deep links recoverable

**Files and scope**
- `frontend/src/pages/PaceRisePage.tsx`
- `frontend/src/pages/pacerise/paceriseUrlState.ts`
- `frontend/src/pages/pacerise/paceriseUrlState.test.ts`
- `backend/tests/pacerise-loading-recovery-e2e.test.js`

**Implementation**
1. Keep URL parsing pure and typed: invalid `id` or `tab` cannot become
   component state directly.
2. Resolve to the requested available competition; otherwise the active
   competition; otherwise the first available competition; otherwise no
   selection.
3. Canonicalize only after the competition list loads, using replacement
   history and without a second bootstrap request.
4. Preserve unrelated query parameters when user interactions change `id` or
   `tab`.

**Acceptance criteria**
- `id=abc`, a missing numeric id, and an invalid tab open a usable result
  screen whenever the API returns at least one competition.
- A canonical valid link is not rewritten.
- Back/forward query changes choose the resolved competition without another
  initial competition-list fetch.

### 4. Keep interaction surfaces explicitly closed

**Files and scope**
- `backend/middleware/launchFeatureGate.js`
- `src/server.js`
- `frontend/.env.example`
- `frontend/src/pages/CommunityPage.tsx`
- `frontend/src/pages/FeaturePreparingPage.tsx`
- `backend/tests/launch-interaction-safety.test.js`

**Implementation**
1. Preserve the `503` and `no-store` response for direct HTTP and WebSocket
   chat requests.
2. Preserve preparation pages without text, file, image, or publish controls
   for guests and signed-in visitors alike.
3. Keep `VITE_WS_URL`, private-storage configuration, and collector/scheduler
   enablement absent from public example configuration until an owner decision
   explicitly opens that scope.

**Acceptance criteria**
- At 390px and 1280px, `/community` and `/chat` show a preparation state and
  recovery links only.
- `GET`/`POST` chat endpoints and `/ws/chat` return `503` plus `no-store`.
- No public config example advertises a live chat or private-vault endpoint.

### 5. Release evidence and rollback discipline

**Files and scope**
- `.omo/evidence/persona-safe-next-wave/summary.txt`
- `docs/athletetime-persona-release-matrix.md`
- `docs/athletetime-deployment-target.md`

**Implementation**
1. Append one dated evidence summary per safe-wave release: changed surface,
   exact commands, passed/failed/skipped counts, browser routes, viewport,
   console status, and what was intentionally not tested.
2. Never record search terms, names, affiliations, ticket contents, emails,
   IP addresses, request bodies, tokens, or source identifiers in evidence.
3. Define rollback as restoring the prior Netlify/Render release only. Do not
   run down-migrations, delete rows, or reopen a gate as a rollback shortcut.

**Acceptance criteria**
- Each safe-wave evidence file is understandable without local terminal
  history and contains no personal or sensitive data.
- A release checklist covers `/`, `/records`, team browse, `/data-request`,
  `/community`, `/chat`, `/admin/operator-guide`, and an unknown route.
- The release matrix retains all six owner-decision boundaries.

### 6. Keep calculators direct-input only

**Files and scope**
- `frontend/src/pages/PaceCalculatorPage/components/TargetPaceCalculator.tsx`
- `frontend/src/pages/PaceCalculatorPage/components/TargetPaceInputs.tsx`
- `frontend/src/pages/TrainingCalculatorPage/hooks/useTrainingCalculator.ts`
- Existing focused calculator tests under `frontend/src/pages/*CalculatorPage/`

**Implementation**
1. Start every performance field with an empty value rather than a plausible
   runner record or a computed result.
2. Keep the calculate action unavailable until required direct values are
   valid; use short field-level Korean recovery text rather than an example
   athlete or performance.
3. Make reset restore exactly the first-use empty state.
4. Do not write calculator values to account, workspace, URL, analytics, or
   training-log storage as part of this task.

**Acceptance criteria**
- Initial render contains no calculated pace, VDOT, training prescription, or
  plausible sample performance.
- A blank or zero-only performance cannot produce a result.
- A manually entered valid distance and time produces the existing calculation
  result without a console or page error at `390x844`.
- Reset returns fields and output to the same empty state.

## Required Verification

Run these before merging any safe-wave change:

```bash
npm test
npm --prefix frontend run build:check
npm --prefix frontend test -- --run
node --test backend/tests/public-route-error-boundary.test.js
node --test backend/tests/launch-interaction-safety.test.js
node --test backend/tests/team-public-dto-boundary.test.js
```

Browser smoke must run as a guest at `390x844` and `1280x720` for:

```text
/
/records
/records?flow=browse&browse=team
/data-request
/community
/chat
/admin/operator-guide
/a-route-that-does-not-exist
```

Every path must render its intended recovery/heading state without console or
page errors. The team path may not reveal a person list or raw result rows.

## No-Go Rules

- Do not add telemetry until the owner separately approves an event schema,
  redaction rules, retention, sampling, and access controls. In particular,
  never log search strings, athlete names, affiliations, query strings, IP
  addresses, user identifiers, or request bodies as a "safe" substitute.
- Do not add team metrics or hide/display logic before an owner-selected
  threshold and a server-side suppression contract exist.
- Do not imply that membership, consent, age, guardian treatment, private
  notes, private photos, chat, community publication, row correction, or
  deletion is ready for general use.
- Do not enable `NAVER_NEWS_COLLECTOR_ENABLED` or
  `EDITORIAL_SCHEDULER_ENABLED`; do not create background editorial jobs.
- Do not use public upload helpers for any private or account-bound content.
- Do not turn calculator fields into a profile, training log, or record
  collection. The safe direct-input task is deliberately browser-session UI
  only.

## Decision Queue

The next functional expansion begins only when the owner records a choice in
one of the six gate files. Until then, the conservative recommendation in each
file is the operative choice: retain the existing closed/current behavior.

## Final Verification Wave

1. Review `git diff` for accidental data, config, source, or policy changes.
2. Run the required verification suite and record its exact results.
3. Perform the guest browser smoke at both viewports.
4. Confirm the six decision files remain owner-only and no environment flag
   silently changes a closed capability.
5. Push only after the working tree contains no test artifact, credential,
   raw record export, or unreviewed decision change.
