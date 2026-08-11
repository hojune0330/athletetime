# AthleteTime 40-Persona Improvement Plan

Status: active planning baseline

## Why this plan exists

This plan consolidates the latest review of student athletes, runners, parents
and guardians, team leaders, school operators, first-time visitors, keyboard
users, shared-device users, editors, and hostile users. Its purpose is not to
add more public features. It is to make the existing promise dependable:

```text
find a collected public record -> choose a separate candidate -> inspect a
clear record collection -> return safely when information is incomplete
```

No plan item may turn a name match into identity verification, use public
upload storage for private material, or reopen a public interaction surface.

## What the review confirmed

### Strong foundations to retain

- Same-name candidates stay separate; there is no automatic person merge.
- The final candidate can be removed from a browser-local collection, returning
  to a fresh records search instead of leaving an invisible selection behind.
- Public team responses do not include names, athlete keys, raw records,
  affiliations, private workspace data, notes, attachments, or source IDs.
- Direct record links, stale comparison links, failed search requests, and
  route failures have a visible recovery action.
- Chat, community writing, marketplace writing, public uploads, and their
  associated APIs remain fail-closed while they are not ready.
- The public search response is not cacheable, reducing accidental storage of
  a visitor's name or affiliation query in shared caches.
- A direct result-page URL and its result identifier count as provenance when
  a schedule-page sequence is absent. This prevents a real source from being
  mislabeled as missing without inventing any new data.

### Coverage facts that must not be overstated

As of 2026-08-12, the competition catalogue has 284 traceable entries across
2018--2026 and its integrity check reports zero missing source URL or source
identifier warnings. Result files contain records from 2015--2026, but their
coverage is not uniform: 2015--2017 currently have result bundles without the
matching catalogue metadata, and the 2026 catalogue has 60 listed competitions
while only 6 have local result bundles.

The local files contain 239 result bundles in total. The public result index
intentionally serves 216: the remaining 23 are life-sport or masters-style
events retained as originals but excluded from public discovery. This is an
intentional scope boundary, not a silent loss of data.

Those are different datasets and neither statement means that every Korean or
overseas meet since 2005 is present. A year, competition, or athlete record
outside that verified range must remain a visible collection gap until its
source receipt, parsing result, and search result have each been reviewed.
No UI, SEO text, or editorial copy may describe the collection as a complete
career-history or all-results database. Before each release, regenerate the
coverage matrix for the intended date range and review the partial/orphan rows
instead of relying on this dated snapshot.

### Risks found by the review

| Area | What can go wrong | Current posture |
| --- | --- | --- |
| Small teams and schools | A season/event/division slice can reveal one young athlete. | Do not expand statistics before a server-side disclosure decision. |
| Accounts and minors | Terms, consent, guardian handling, session life, and shared-device behavior are not product details. | Keep policy-changing account work closed. |
| Private notes and photos | The existing public upload path returns public URLs. | Do not accept private content until a separate private vault is approved. |
| Chat and community | Browser-provided identity and report keys can be forged. | Keep route, API, and websocket unavailable. |
| Data-rights migration | A production database may have an already-recorded legacy migration state. | Do not run production migration before a disposable PostgreSQL rehearsal proves recovery. |
| Public data collection | Complete prevention of copying public results is not realistic. | Keep low result bounds, no-store responses, and server/CDN abuse controls; never log raw search terms for analytics. |

## Improvement sequence

### 2026-08-12 implementation audit

The following policy-neutral items are implemented and must now be treated as
release regression contracts, not as future feature promises:

- Registration sends an existing visitor to the canonical `/login` route, and
  password recovery has a stable `/login?mode=reset` address.
- A stale or malformed PaceRise competition link resolves to an available
  competition and keeps the selected tab in the URL instead of leaving a
  blank result area.
- The record workspace can remove its final selected candidate, clears the
  temporary draft, and returns to a fresh athlete search with replace-style
  history behavior.
- Device-local record selections, collections, and comparison state have a
  visible clear action. If a browser blocks the deletion, the page says that
  cleanup could not be confirmed and offers the same action again; it does not
  claim success.
- Public workspace provenance keeps a useful source label, source URL, and
  collection date while omitting internal source IDs, person numbers,
  birthdates, and raw external identifiers.
- The same public-provenance allowlist now covers legacy athlete profiles,
  legacy record search, and competition-result HTTP responses. Those routes
  retain a source label, public URL, and collection date, but never serialize
  an internal source file key or identity-assistance field.
- Public collection-health reporting exposes only aggregate counts and issue
  categories. Raw review samples, internal file names, source identifiers,
  and identity-analysis output remain server-only.
- Preparation-only community, chat, marketplace, upload, reaction, poll, and
  editorial-feed paths are closed at the page, HTTP, and websocket boundaries.
  Their unavailable response is `503` with `Cache-Control: no-store`; no
  closed surface returns a misleading empty-success payload.
- Frontend and API responses deny unused camera, microphone, location,
  payment, and USB permissions. A future feature must add a reviewed reason
  before any one of these browser capabilities can be requested.
- The production content-security policy also blocks external form submission,
  page framing, plugin objects, and unexpected document base URLs.

The regression set for these items includes route recovery, device-storage
failure, public-provenance across both current and legacy record endpoints,
data-request sensitive-input, and closed-surface tests. It must run before any
work that changes the related UI or API contracts.

### 2026-08-12 runtime dependency check

The production dependency audit completed with zero reported vulnerabilities
for both the repository root and `frontend` package trees using
`npm audit --omit=dev`. This is a dated check, not a permanent security
guarantee: repeat it before each deployment and treat any production advisory
as a repair task rather than a release exception.

After the frontend lockfile's patch-level security update, the full dependency
audits also reported zero vulnerabilities for both package trees. The update
did not force a framework major-version change; type checking, the production
build, and the frontend test command completed successfully afterward.

### Wave A: Keep the core journey calm and recoverable

Scope: reversible UI, routing, and test improvements only.

1. Keep the record hub focused on one action: enter a name or affiliation.
2. Preserve each selected candidate in a collection without merging people.
3. Keep collection, comparison, and individual record detail as distinct
   screens. A visitor must explicitly choose before moving between them.
4. Continue testing narrow screens, keyboard focus, direct links, stale links,
   failed requests, and back navigation as one browser suite.
5. Keep calculator inputs empty until a visitor enters a real value. Never make
   an example result look like that visitor's performance.

Done means: every core route has a clear next action, a failed request can be
retried without losing its context, and a 375px browser pass has no unexpected
console or page errors.

### Wave B: Make browser-local state truthful

Scope: no new server storage and no account connection.

1. Label temporary selection, device-local record collection, and comparison
   state differently.
2. When browser storage cannot be cleared, say that the result is unconfirmed
   and offer a retry. Do not claim that data was erased.
3. Keep local training data separate from public records, account data,
   uploads, and analytics.
4. Add a visible device-data clearing action wherever a feature intentionally
   persists a person-facing selection on the browser.

Done means: quota failure, blocked storage, malformed saved data, a shared
device, and reload all produce truthful copy and leave the page usable.

### Wave C: Strengthen public-read boundary contracts

Scope: safe backend and verification work; no new public data fields.

1. Keep public search, record-preview, and team response DTO allowlists under
   regression tests. Internal source IDs, birthdates, person numbers, raw
   external IDs, account state, and private content stay absent.
2. Keep public search responses non-cacheable and bounded. Measure only
   anonymous aggregate service health, never the raw name or affiliation a
   visitor searched.
3. Run the serial browser suite from isolated temporary ports and caches before
   release. The test runner must never clean a repository root or a shared
   workspace.
4. Keep a release preflight that checks repository identity, static contracts,
   type/build checks, and test isolation before an optional full browser run.
5. Require a clean production-dependency audit for both the API and frontend;
   a known security warning is a repair task, not a release exception.

Done means: the public response tests, no-store contract, no-private-upload
contract, production-dependency audits, and isolated browser suite all pass
from a clean checkout.

### Wave D: Operating preparation without turning features on

Scope: documentation, runbooks, and approval packets.

1. Maintain a correction request path that asks only for the minimum human
   context. Server validation must reject obvious phone numbers, email
   addresses, and resident-registration-number patterns from free text rather
   than preserving them in an ordinary request reason.
2. Keep the source range, collection date, and correction entry visible where
   a public record or aggregate is shown.
3. Keep the data-rights migration runbook fail-closed: backup confirmation,
   disposable PostgreSQL rehearsal, expected-schema proof, and rollback
   evidence precede any production command.
4. Use a competition-cycle editorial plan, not a daily automated news feed.
   Publication stays human-approved and includes a source receipt, last-check
   date, and correction route.

Done means: an operator can follow the runbooks without being told to bypass a
gate, use production as a test environment, or reopen chat/upload features.

## Owner-only decisions deliberately held

These decisions are intentionally not selected by this plan. They change the
privacy, retention, or moderation boundary and cannot be safely inferred from
UX preferences.

| Decision | Choices already prepared | Default until written approval |
| --- | --- | --- |
| Small-team disclosure | Keep current boundary; one minimum cohort; stricter school/youth cohort | No new detailed count, chart, sort hint, or public slice |
| Account terms and minors | Keep hold; general account policy; account plus guardian policy | No new consent, age, guardian, or session-retention collection |
| Private notes/photos | Keep closed; text notes; staged private vault | No server-side private content and no public-upload reuse |
| Row-level data rights | Keep current requests; narrowly scoped lifecycle after rehearsal | No public-row change from a request |
| Verified community/chat | Keep closed; approved authenticated/moderated system | Route, API, and websocket remain unavailable |
| Magazine publication | Keep internal drafts; human-approved periodic magazine | No automatic athlete narrative or news publication |

See the individual packets in `docs/decisions/` before any one of these
boundaries is changed.

## How lower-complexity work can be safely delegated

| Packet | Safe owner | Forbidden shortcuts | Acceptance evidence |
| --- | --- | --- | --- |
| Browser journey regression | QA worker | Do not delete test caches outside the temp namespace. | Serial E2E result, console/page-error capture, exit code. |
| Copy and layout clarity | Frontend worker | Do not change public fields, account linkage, or policy meaning. | 375px check, keyboard check, focused component test. |
| API boundary regression | Backend worker | Do not add team/detail fields or log raw search queries. | DTO recursion test, cache-header test, rate-bound test. |
| Runbook and source receipt | Operations worker | Do not run a production migration or claim legal approval. | Link check, dry-run/rehearsal evidence, reviewed stop condition. |
| Policy-bound feature | Owner plus security reviewer | Do not substitute a UI disclaimer for a server-side rule. | Written decision, threat review, cross-account or cohort tests. |

## Release checklist

Before a public release, record the following outcome rather than relying on a
single happy-path page visit:

1. A nonmember finds a record, handles same-name candidates, and recovers from
   a failed search.
2. A student and a guardian see no ownership claim, unnecessary sensitive-data
   field, or misleading official-result language.
3. A shared-device user can see exactly what remains local and can attempt a
   truthful clear action.
4. A team operator sees only the currently approved aggregate range and never
   reaches a member directory through the team screen.
5. A hostile requester receives bounded, non-cacheable public data and cannot
   use preparation-only write, chat, or upload endpoints.
6. Keyboard and 375px mobile checks complete with no unexpected console or
   page errors.
7. Any owner-only decision remains closed unless its dedicated packet has a
   written approval and every stated release test has passed.

## Next checkpoint

The immediate safe priority is to keep Wave A through C continuously verified
while the owner considers the six boundary decisions. The next code feature
should be selected only after one of those decisions is written down; until
then, the best improvement is reliability, clarity, provenance, and recovery
rather than another data-collection or social feature.
