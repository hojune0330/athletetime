# AthleteTime: Persona-Led Record UX Improvement Plan

## Decision Summary

**Goal:** A middle-school user can find a public result, choose the right candidate, see records immediately, and return cleanly without mistaking a browser collection or team statistic for an official personal profile.

**Evidence base:** 18 read-only reviews across middle/high-school athletes, elite runners, university captains, coaches, guardians, fans, mobile/accessibility users, operators, data-contract reviewers, and adversarial users. Findings are advisory until reconfirmed against the active branch; earlier worktree reviews may describe a bug already fixed.

**Already complete on this branch:**

- Canonical athlete sharing removes transient search, compare, and device-local state.
- Athlete and saved-workspace pages open a visible event directly; explicit event URLs stay authoritative.
- A saved workspace can deliberately return to `종목 목록` through `eventIndex=true`, without an automatic-default loop.
- Team detail starts on the latest observed season and remains aggregate-only.

## Non-Negotiable Product Boundaries

1. Public records are an index of collected public results, not an official record service, verified profile, roster, ranking, or certificate.
2. Same-name candidates are never auto-merged. A workspace is a user-selected view, never evidence that records belong to one person.
3. Team surfaces expose only aggregate public-result data. No athlete name, athlete key, raw record, affiliation history, workspace, note, attachment, or hidden sort key may enter their public DTOs.
4. Browser collections, comparison drafts, and display preferences stay clearly labelled `이 기기에만 저장` until the owner approves a separate account-data design.
5. Do not add private photos, private notes, claim/ownership language, automatic identity matching, small-group disclosure, or community-write expansion in these waves.

## Owner Decision Gates

| Gate | Decision required | Default until approved |
| --- | --- | --- |
| G1 | Suppress exact team subgroup figures below which unique-athlete count? | No new small-group fields or charts; preserve the current aggregate contract only. |
| G2 | Should minor share cards redact name, team, event/date, or all details by default? | Do not broaden sharing or add share-card variants. |
| G3 | Can a logged-in account store selected public records across devices? | Browser-only collections; no account migration or ownership claim. |
| G4 | Private memo purpose, retention, recovery, staff access, and incident response | No memo API, schema, upload, or hidden feature flag. |
| G5 | Community identity, moderation staffing, rate limits, and minor-protection rules | No read/write expansion; re-audit active implementation separately. |

## Execution Waves

### Wave A: Clear Selection and Return Context

**Intent:** Make the route transition feel like moving to a clean next page, not losing the previous search.

**Files to inspect before editing**

- `frontend/src/pages/RecordsPage.tsx`
- `frontend/src/features/record-workspace/pages/RecordAthletePage.tsx`
- `frontend/src/features/record-workspace/components/RecordCandidateCard.tsx`
- `frontend/src/features/record-workspace/components/RecordCandidateList.tsx`
- `frontend/src/features/record-workspace/components/RecordIdentityHeader.tsx`
- `backend/tests/records-flow-e2e.test.js`

**Implementation decisions**

1. From an in-app candidate result, pass the prior result route only through navigation state, never through a shareable URL. A direct or refreshed shared athlete URL keeps its canonical form and falls back to `기록 찾기`.
2. On the dedicated athlete page, label the contextual action `결과로 돌아가기` only when that navigation state exists. Otherwise use `기록 찾기` and do not pretend a result list is recoverable.
3. Every same-name candidate card always shows the candidate name, observed affiliation, observed year range, and result count before opening. Keep the existing warning on the card itself, not only in a page-level banner.
4. Different-name candidates go only to comparison. Same-name candidates may be placed side by side in a workspace, with the existing non-merger notice visible above the rows.
5. Do not add an inferred “likely same person” score or background merge logic.

**Acceptance tests**

- Unit: candidate-card markup has all four context values plus a same-name caution when ambiguity exists.
- E2E mobile (375x667): search `Alpha` → open candidate → return; original candidates and query reappear. Open canonical `/records/athletes/:key` in a new tab → only `기록 찾기` appears.
- E2E: copied athlete URL contains no return context, query, compare, flow, draft, or workspace parameter.

### Wave B: One Mobile Action Dock, Not Stacked Fixed Bars

**Intent:** Avoid the bottom of a phone becoming unusable while a user is choosing, comparing, or editing results.

**Files to inspect before editing**

- `frontend/src/components/records/RecordSearchResults.tsx`
- `frontend/src/components/record-insights/CompareTray.tsx`
- `frontend/src/features/record-workspace/components/WorkspaceDraftTray.tsx`
- `frontend/src/features/record-workspace/components/RecordSelectionBar.tsx`
- `frontend/src/components/records/RecordsMineNameStep.tsx`
- `frontend/src/components/records/RecordsMineCandidateStep.tsx`
- `backend/tests/records-flow-e2e.test.js`

**Implementation decisions**

1. Use one visible mobile bottom action at a time. Priority order is: record-hide confirmation, candidate-selection confirmation, comparison action, then passive saved-collection reminder.
2. The lower-priority state remains reachable as an inline compact summary, never as a second `position: fixed` surface.
3. Every tappable primary/secondary control has at least `min-h-11` and a visible `focus-visible` ring.
4. Reserve bottom spacing with the actual active dock height plus mobile safe area. Do not rely on a hard-coded spacer that assumes a single line of copy.
5. During record search, disable the repeat submit button and expose `aria-busy` on the results region. Use one concise loading label rather than letting repeated taps create ambiguity.

**Acceptance tests**

- Unit: action priority resolves to exactly one dock for each selection/edit/compare state.
- E2E at 320x568, 375x667, and 390x844: final candidate card remains visible and clickable above the dock; no two fixed controls overlap.
- Keyboard: focus each raw button, verify visible ring, activate it with Enter, and keep focus in the changed panel.
- Reduced-motion: all new transitions respect existing `motion-reduce` behavior.

### Wave C: Device-Local and Minimum-Data Clarity

**Intent:** Make browser storage and correction requests understandable without adding identity or private-data features.

**Files to inspect before editing**

- `frontend/src/components/record-insights/useMyAthlete.ts`
- `frontend/src/components/records/RecordsHub.tsx`
- `frontend/src/features/record-workspace/pages/RecordWorkspaceManagerPage.tsx`
- `frontend/src/features/record-workspace/pages/RecordWorkspacePage.tsx`
- `frontend/src/pages/DataRequestPage.tsx`
- `card-studio/services/dataRequestValidation.js`
- `backend/tests/*data-request*.test.js`

**Implementation decisions**

1. Replace any ownership-sounding entry wording with `이 기기에서 모은 기록` or `이 기기에 담기` where the feature is actually local storage. Do not rename public profile labels to imply the athlete owns the data.
2. Put `이 기기에만 저장` beside the action that writes local state, plus one `모음 비우기` action in the workspace manager. Clearing removes only the local collection; it never sends a deletion request or changes public records.
3. The data-request form continues to require only athlete name and reason. Affiliation, competition, event, and contact remain optional and visually labelled as optional.
4. Add a small, type-specific minimum-data hint. It tells users to omit birth date, school ID, medical information, account passwords, or any other unnecessary sensitive information.
5. No attachment, image, private note, or account-verification field is introduced in this wave.

**Acceptance tests**

- Local collection UI contains `이 기기에만 저장`; it contains no `verified`, `owned`, `claim`, or equivalent ownership assertion.
- Clearing a collection removes local state only; the linked public athlete URL still loads in a fresh browser context.
- Data-request client and server tests reject no previously optional field as newly required.
- Form copy tells a user that contact is optional and sensitive identifiers should not be entered.

### Wave D: Team Season Dashboard Clarity Without Individual Leakage

**Intent:** A coach can see the season-level public-results snapshot without treating it as a roster or using it to follow a named student.

**Files to inspect before editing**

- `frontend/src/components/records/TeamStatisticsResults.tsx`
- `frontend/src/features/team-performance/TeamPerformancePage.tsx`
- `frontend/src/features/team-performance/TeamPerformanceSummary.tsx`
- `frontend/src/features/team-performance/TeamSeasonTrend.tsx`
- `frontend/src/features/team-performance/teamPerformanceContracts.ts`
- `card-studio/services/teamDetailService.js`
- `backend/tests/team-performance-api.test.js`

**Implementation decisions**

1. Keep the first view to four metrics: unique indexed competitions, confirmed 1–3-place results, comparable indexed improvement records, and distinct events. Labels always say they are based on collected public results.
2. Pin the active period under the team name: latest observed season, a selected season, or all indexed seasons. Explain that an absent season is not proof of no participation.
3. Rename trend bars as record volume unless a ratio has a documented, stable denominator. Do not add “best team,” “top athlete,” or individual-highlight widgets.
4. The only path from team to individual is an empty `기록 찾기` route. It passes no team search, local workspace, selected athlete, or private state.
5. Before each team UI change, extend the recursive forbidden-key test. This wave does not implement the G1 small-group suppression rule.

**Acceptance tests**

- Public team API JSON recursively contains none of `name`, `athleteKey`, `records`, `affiliations`, `workspace`, `note`, `attachment`, raw result arrays, or sortable equivalents.
- Mobile team search → latest-season snapshot completes within three taps and starts with latest scope.
- Every scope shows indexed period, latest collected date, source/coverage note, and aggregate-only wording.
- Team page offers no roster, athlete card, or prefetched individual search query.

### Wave E: Revalidate Security Gates Before Any Public Expansion

**Intent:** Treat old review reports as leads, not facts, and block expansion if current behavior regresses.

**Files to inspect before editing**

- `backend/routes/posts.js`
- `backend/routes/comments.js`
- `backend/routes/votes.js`
- `backend/auth/routes.js`
- `backend/routes/upload.js`
- relevant `backend/tests/*security*.test.js`, `backend/tests/*posts*.test.js`, and `backend/tests/*cloudinary*.test.js`

**Implementation decisions**

1. First write active-branch regression tests for blinded-content filtering, client-controlled anonymous identity, account enumeration, development admin bootstrap, and public upload boundaries.
2. If a regression is proven, fix it in a dedicated security PR with a narrow change and an HTTP-level test. Do not bury the fix inside record UI work.
3. Public Cloudinary URLs remain prohibited for private memo/photo storage even if the upload endpoint requires login.
4. Do not enable community writes, verified-member chat, or account-to-athlete claim features until their separate owner gate is approved.

**Acceptance tests**

- Public list/detail/comment payloads do not expose blinded content.
- Any anonymous write identity is server-issued and request-bound, or writes remain disabled.
- Signup/recovery responses do not disclose whether an email exists before mailbox control is proven.
- Production denies development admin bootstrap routes; tests cover missing/weak configuration.
- No private feature can obtain a public upload URL.

## Model and Agent Routing

| Work class | Recommended owner | Output required before handoff |
| --- | --- | --- |
| Copy, focus styles, local-storage labels, fixture/E2E additions | Terra, medium reasoning | exact changed paths, targeted test output, mobile screenshot/evidence if it changes layout |
| Navigation context, dock state machine, team DTO contract | Terra, high reasoning | state diagram, failing test first, focused browser flow, no forbidden API keys |
| Identity wording, minors, G1–G5 decisions, security remediation | Sol, very high reasoning | decision ledger or security threat model; no code change without the matching owner gate |

## Full Verification Wave

1. Run focused unit and API contracts for the touched module first.
2. Run `node --test backend/tests/records-flow-e2e.test.js` on Chrome at the three defined phone sizes.
3. Run `npm --prefix frontend run build:check` and `git diff --check`.
4. Run the full repository test command in CI. If the local host terminates it at an environment timeout, report that separately instead of calling it green.
5. Review rendered copy for prohibited claims: official, verified, owned, ranked, complete history, automatic same person, roster, private sync.
6. Before merge, inspect the exact diff, preserve unrelated worktree changes, and publish a PR note listing which G1–G5 gates remain deferred.

## Completion Definition

- A guest or logged-in user can complete public record lookup in a few deliberate screen transitions without losing same-name context.
- A saved collection opens useful records immediately, remains visibly device-local, and never claims identity ownership.
- Team pages remain aggregate-only at the API and visual levels.
- Mobile fixed controls do not overlap, keyboard focus is visible, and loading/recovery has one clear action.
- Sensitive/private expansion remains impossible by default until its explicit owner decision and security gate are completed.
