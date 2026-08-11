# AthleteTime Persona Release Matrix

## Purpose

This is the release decision surface for record search UX. It separates behavior that is proven in a real browser from work that needs a privacy or operating-policy decision before implementation.

## Review Frame

The matrix covers 10 user roles across three high-risk conditions: first use, incomplete or ambiguous data, and small-screen or recovery use. That creates 30 review cases without pretending that one happy-path click represents every user.

| Role group | First-use question | Ambiguous or incomplete-data question | Small-screen or recovery question |
| --- | --- | --- | --- |
| Middle-school athlete | Can I start with one simple action? | Can I choose only my own candidate without a claim of ownership? | Can I go back without losing my place? |
| High-school athlete | Can I confirm the school and period before collecting? | Are same-name candidates still separate? | Can I use the primary action at 375px? |
| University athlete | Can I compare a bounded set without creating a merged profile? | Can I remove a wrong candidate from my local collection? | Does keyboard navigation stay visible? |
| Professional athlete | Can I find public records without an official-record claim? | Can I request a correction with minimal information? | Does a failed lookup offer one truthful next action? |
| Parent or guardian | Is the source range explained before a request? | Does the correction form avoid asking for unnecessary sensitive data? | Can a blocked device-storage state be understood? |
| Coach | Can I inspect records and provenance separately? | Does a temporary search failure preserve the original query? | Can I resume from an athlete detail page? |
| Team captain | Does the team screen answer the latest-season question first? | Is it aggregate-only rather than a hidden athlete list? | Can a season or view change remain in the URL? |
| School or team operator | Are team figures defined from indexed public results? | Are individual names, keys, source IDs, and raw rows absent? | Is small-group suppression explicitly gated? |
| Magazine editor | Are leads labelled as collected public records, not official results? | Can the source range and correction route be found? | Does a stale shared link recover to a useful page? |
| Keyboard or assistive-tech user | Does opening the mobile menu place focus predictably? | Does focus remain in the open dialog? | Do Escape and close restore the original trigger? |

## Proven in the Browser

The following real Chrome-at-375px scenarios pass with no unexpected console or page errors:

1. First-use record hub, candidate selection, same-name separation, six-person limit, confirmation, saved collection, back, forward, and shared links.
2. A temporary search `503` retries the exact original query instead of losing context.
3. A correction request keeps an explicit valid intent, changes an invalid intent to correction, and only pre-fills the public display name.
4. Blocked local storage shows a volatile-storage warning and preserves a safe route back to records search.
5. Athlete-detail return restores the results context without putting identity state into the canonical share URL.
6. Team browse and team detail begin with the latest observed season and remain aggregate-only.
7. The mobile drawer receives initial focus, contains keyboard focus, and restores focus to its trigger after Escape.
8. The mobile comparison dock remains the only fixed control during workspace selection.
9. A slow public-record search announces that it is in progress, disables repeat submission, and shows results after the request completes.
10. A comparison link with one unavailable profile keeps the available people separate and explains that only their records are shown.
11. A stale athlete or comparison link returns to record search through one touch-safe recovery action instead of leaving a blank page.

Evidence commands:

```text
node --test backend/tests/records-flow-e2e.test.js backend/tests/records-recovery-e2e.test.js backend/tests/records-workspace-e2e.test.js backend/tests/records-mobile-dock-e2e.test.js
npm.cmd --prefix frontend run type-check
npm.cmd --prefix frontend run build:check
npm.cmd test
```

## Product Rules Locked by This Matrix

- A matching name is a candidate, never a verified identity or an automatic merge.
- A public team screen is a season snapshot from collected public results, never an official roster, medal table, or athlete directory.
- Team public responses must not contain names, athlete keys, affiliations, raw records, workspace selections, notes, attachments, or source identifiers.
- A request to fix data starts as correction unless a person explicitly chooses another valid request type.
- Browser-local record collections remain device-local; a persistence failure must be visible.
- Error screens have one truthful recovery action. A transport failure must not be presented as proof that a record does not exist.

## Do Not Implement Without a Decision

| Decision | Why it is held | Required decision before code |
| --- | --- | --- |
| D1: small-group rule | A season × event × division breakdown can identify one child or athlete. | Set the threshold, define whether groups are hidden or redacted, and apply it server-side before charts or detailed filters ship. |
| D2: team-count wording | A count can be read as a roster or official participation list. | Decide whether the aggregate may show a numeric athlete count or only a range such as “less than 5”. |
| D3: deletion policy | Correction, hiding, deletion, and objection require different operator duties. | Define evidence, review order, retention, and public status wording. |
| D4: private notes and photos | Existing public upload storage must never receive private material. | Choose an account-bound private storage service, signed access, retention/deletion rules, and separate API contract. |
| D5: verified-member chat | Replacing anonymous chat changes identity, moderation, and migration behavior. | Define membership verification, abuse controls, moderation, reporting, and migration tests. |

## Release Order

1. Keep the proven record, correction, team-aggregate, and mobile flows available.
2. Resolve D1 and D2 before showing granular team distributions or counts for small groups.
3. Resolve D4 before enabling any personal note or photo feature.
4. Resolve D3 and D5 as separately reviewed operating changes, not as UI-only work.

This order protects the core promise: find collected public athletics records clearly, correct them when needed, and avoid turning ambiguous data into claims about a person.

## 2026-08-11 Review Consolidation

The 30-case matrix remains the baseline: ten roles, each checked for first use,
ambiguous data, and small-screen or recovery use. The latest hands-on review
adds four release facts that change implementation order.

### Safe to improve without a policy decision

1. Keep refining public, read-only surfaces: direct search instructions, one
   recovery action after a failed request, keyboard and touch navigation, and
   numeric calculator output. These changes must not add identity fields,
   retention, or new storage.
2. Keep the calculator tables as in-page tools. Download or print failure must
   remain visible in the page instead of a blocking browser dialog. Downloaded
   output must contain only the calculation table, never a saved record
   collection or account detail.
3. Improve browser test readiness before treating a timeout as a product fault:
   wait for the loading fallback to disappear, the route heading to exist, and
   the initial API state to settle together. This distinguishes a lazy-route or
   hot-reload timing race from a real page failure.

### Stop conditions that require an owner decision

| Gate | Why implementation must stop | Minimum evidence before release |
| --- | --- | --- |
| Team small-group rule | A season, event, or division slice can reveal a child or a single athlete. | Owner-set minimum group size, server-side suppression, and API plus UI regression tests. |
| Team terminology | A numeric count can be mistaken for an official roster or medal table. | Approved wording and a proof that source range, last observed date, and exclusions are visible. |
| Private note or photo | The current public upload route returns a public Cloudinary URL. Reusing it for private material is a privacy breach. | Separate account-bound storage, signed access, deletion and retention rules, and cross-account access tests. |
| Data-rights migration | A deployed database that already recorded migration 007 can skip its replacement table after a later compatibility migration renames the legacy table. | Disposable PostgreSQL test covering the recorded-007 state, rollback proof, and a reviewed forward-only repair. |
| Verified-member chat | Replacing anonymous sessions changes identity, moderation, reporting, and migration behavior. | Membership, moderation, retention, and migration contracts approved together. |

### Current release posture

- Public record search, separate same-name candidates, device-local record
  collections, correction entry, team aggregate boundaries, and calculator
  tools can continue to receive reversible UX fixes.
- Do not merge or run the data-rights migration against production until the
  recorded-007 migration scenario is proven. Passing static tests alone is not
  sufficient because the current database integration suite is skipped without
  a disposable `TEST_DATABASE_URL`.
- Do not expose a private-note control as an active feature until the private
  storage gate is completed. A disabled teaser is safer than collecting data
  that the service is not prepared to protect.
