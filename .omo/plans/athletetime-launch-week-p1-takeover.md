# AthleteTime Launch Week P1 Takeover

## TL;DR
> Summary:      Take over PR #5 on `codex/launch-week-ux-trust` at base/head commit `df36934` and finish the three P1 launch-week trust items without widening launch scope.
> Deliverables:
> - Anonymous zero-result `/records` search aggregation with no raw query, IP, user-agent, athlete key, team, or free-text sample storage; a secret-keyed one-way fingerprint is allowed only to merge repeated zero-result terms.
> - Competition result freshness labels on competition cards, derived only from existing result snapshot/provenance metadata.
> - 733KB frontend chunk risk triaged, split, measured, and guarded by exact build evidence.
> - Deferred dependency note: 2010-today data expansion remains after P1 and is not executed in this branch.
> Effort:       Medium
> Risk:         Medium - P1 touches public API contracts, frontend route loading, and launch trust copy where overclaiming or PII leakage would be high-cost.

## Post-Review Reconciliation
- The final implementation uses a secret-keyed one-way fingerprint only to merge repeated zero-result terms. It does not store raw query text, plain hashes, first syllables, IP, user-agent, user id, athlete key, team, or request headers.
- Any older Task 1 line below that says "no hashes" means no raw, plain, unsalted, or reversible query hash. The allowed implementation is the keyed fingerprint described above.
- Exact per-request timestamps are not stored. Zero-result records use date buckets such as `firstSeenDate`, `lastSeenDate`, and `updatedDate`.

## Scope
### Must have
- Work from PR #5 head branch `codex/launch-week-ux-trust`; verify `git rev-parse --short HEAD` is `df36934` before starting, or stop for rebase/plan update.
- Extend `/api/card-studio/analytics/records/search` so zero-result searches are counted anonymously after the existing query sanitization and after the search returns `total: 0`.
- Use only anonymous aggregate dimensions for zero-result recording: route/surface, date bucket, query length bucket, broad character-class bucket, count, and a secret-keyed one-way fingerprint used only for deduplication.
- Surface zero-result aggregate context in `/records` only as aggregate service-health or demand-signal copy; do not show user-entered text, guessed names, or inferred identity.
- Add result freshness metadata to result-competition list responses using existing `data/results` snapshot/provenance fields already normalized into `meta.crawled_at` / `meta.source_url`.
- Show freshness labels on both desktop and mobile competition cards where result availability is already shown in `ScheduleTab`.
- Keep the existing latest-result default behavior in `ResultsTab`.
- Triage and split frontend chunks with route-level lazy loading plus Vite/Rollup chunk configuration; prove the largest emitted JS chunk no longer reproduces the previous 733KB risk.
- Use TDD: for each implementation task, add or adjust failing tests first, then implement until they pass.
- Use existing tests as anchors: `backend/tests/launch-surface-nav.test.js`, `backend/tests/competition-results-order.test.js`, `backend/tests/athlete-user-ux.test.js`, and `backend/tests/record-to-community-readiness.test.js`.
- Capture evidence under `.omo/evidence/task-<N>-<slug>.<ext>`.
- Record 2010-today data expansion as a later dependency only; do not fetch, scrape, import, or mutate source-result coverage now.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- Do not re-expand primary navigation beyond the existing launch core loop.
- Do not add official, ranking, verified, complete-national-database, realtime, or latest-guaranteed claims.
- Do not add sample athlete data or default fake athlete paths.
- Do not store raw zero-result search text, plain/unsalted hashes, first syllables, exact names, teams, IP addresses, user agents, session IDs, cookies, athlete keys, request headers, or exact per-request timestamps.
- Do not use `git add .`; every commit must stage explicit paths only.
- Do not scrape blocked hosts or bypass robots/access controls.
- Do not run the deferred 2010-today data collection expansion.
- Do not suppress the Vite chunk warning by raising `build.chunkSizeWarningLimit` unless the largest JS chunk is also measurably reduced below the threshold.
- Do not introduce a database, queue, auth requirement, or admin UI for P1 analytics.
- Do not change unrelated auth, marketplace, chat, PaceRise, or data-request behavior except lazy-loading boundaries required for chunk splitting.

### Stop conditions
- Stop before editing if `git rev-parse --abbrev-ref HEAD` is not `codex/launch-week-ux-trust` or `git rev-parse --short HEAD` is not `df36934`; report the mismatch and ask for a rebase/plan update.
- Stop if a zero-result aggregate cannot be made useful without storing raw or reversible search text.
- Stop if freshness labels require new data collection, blocked-host scraping, or assumptions not present in `data/results` metadata.
- Stop if chunk reduction requires hiding/removing public routes rather than lazy-loading or chunk splitting.
- Stop if any required QA command fails after one focused fix loop; surface failing command, evidence path, and suspected owner.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: TDD + Node `node:test` backend/source-contract tests, TypeScript checks, Vite production build, and Playwright real Chrome browser QA.
- QA policy: every task has agent-executed scenarios
- Evidence: `.omo/evidence/task-<N>-<slug>.<ext>`

## Execution strategy
### Parallel execution waves
> Target 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks to maximize parallelism.

Wave 1 (no dependencies):
- Task 1: Zero-result aggregation backend and API contract
- Task 3: Result freshness backend metadata contract
- Task 5: Frontend route chunk split source boundary

Wave 2 (after Wave 1):
- Task 2: depends [1]
- Task 4: depends [3]
- Task 6: depends [5]

Wave 3 (after Wave 2):
- Task 7: depends [1, 2, 3, 4, 5, 6]

Critical path: Task 1 -> Task 2 -> Task 7

### Dependency matrix
| Task | Depends on | Blocks | Can parallelize with |
|------|------------|--------|----------------------|
| 1    | none       | 2, 7   | 3, 5                 |
| 2    | 1          | 7      | 4, 6                 |
| 3    | none       | 4, 7   | 1, 5                 |
| 4    | 3          | 7      | 2, 6                 |
| 5    | none       | 6, 7   | 1, 3                 |
| 6    | 5          | 7      | 2, 4                 |
| 7    | 1, 2, 3, 4, 5, 6 | final verification | none |

## Todos
> Implementation + Test = ONE task. Never separate.
> Every task MUST have: References + Acceptance Criteria + QA Scenarios + Commit.

- [ ] 1. Zero-result aggregation backend and API contract

  What to do: Add TDD coverage first, then implement a small zero-result aggregate service. Use the existing `/analytics/records/search` route after `recordAnalyticsService.searchAthletes(...)` returns. If `athletes.length === 0`, record an aggregate bucket with only: `surface: "records"`, date bucket, query length bucket (`2-3`, `4-6`, `7-12`, `13+`), character bucket (`hangul`, `latin`, `numeric`, `mixed`, `other`), and count. Persist only aggregate JSON under `data/analytics/zero-result-search.json` using the file-IO pattern from `dataRequestService`; tests must backup/restore this file like existing data-rights tests. Extend the search response with an `anonymousZeroResult` summary only when total is zero.
  Must NOT do: Do not store raw query, plain hashes, prefixes, first syllables, teams, athlete keys, IPs, user agents, cookies, headers, exact timestamps, or per-request logs. Do not record searches shorter than two sanitized characters. Do not add admin UI or DB storage.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [2, 7] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `card-studio/routes/publicRoutes.js:205` - existing `/analytics/records/search` sanitization, length gate, search call, and response location.
  - Pattern:  `card-studio/services/recordAnalyticsService.js:26` - current `searchAthletes(query, limit)` result behavior and empty-result return.
  - Pattern:  `card-studio/services/dataRequestService.js:43` - existing local JSON directory creation, read, and write pattern.
  - Pattern:  `backend/tests/data-rights-policy.test.js:133` - existing API privacy assertions for provenance and restricted identifiers.
  - API/Type: `frontend/src/api/recordAnalytics.ts:267` - frontend search client shape that must be extended after backend contract is stable.
  - External: `https://owasp.org/www-community/attacks/Information_exposure_through_query_strings_in_url` - reminder that search terms in URLs can be sensitive, so backend must not persist them again.

  Acceptance criteria (agent-executable only):
  - [ ] Add failing TDD assertions, then pass: `node --test backend/tests/data-rights-policy.test.js`
  - [ ] Pass targeted record UX suite: `node --test backend/tests/athlete-user-ux.test.js backend/tests/record-to-community-readiness.test.js`
  - [ ] Current implementation verification: `data/analytics/zero-result-searches.json` is runtime-only, gitignored, and must not contain raw query text, `queryText`, `queryHash`, `firstSeenAt`, or `lastSeenAt`.
  - [ ] Confirm aggregate file has no raw query or restricted identifiers: `powershell -NoProfile -Command "$p='data/analytics/zero-result-search.json'; if (!(Test-Path $p)) { throw 'missing aggregate file' }; $s=Get-Content -Raw $p; if ($s -match 'zzzzzzzz-launch-p1-zero|person_no|birthdate|birthDate|user-agent|ip|athleteKey|team|queryText|queryHash') { throw 'PII/raw query leaked into aggregate file' }"`
  - [ ] Confirm short searches are not recorded: `powershell -NoProfile -Command "$json=Get-Content -Raw 'data/analytics/zero-result-search.json' | ConvertFrom-Json; if (($json | ConvertTo-Json -Depth 10) -match 'lengthBucket.:.0-1') { throw 'short query bucket should not exist' }"`

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: zero-result search increments only anonymous buckets
    Tool:     powershell
    Steps:    New-Item -ItemType Directory -Force .omo/evidence | Out-Null; $p=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput .omo/evidence/task-1-zero-result-server.out -RedirectStandardError .omo/evidence/task-1-zero-result-server.err; try { Start-Sleep -Seconds 4; Invoke-RestMethod 'http://127.0.0.1:3005/api/card-studio/analytics/records/search?q=zzzzzzzz-launch-p1-zero&limit=12' | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 .omo/evidence/task-1-zero-result.json; Get-Content -Raw 'data/analytics/zero-result-search.json' | Set-Content -Encoding UTF8 .omo/evidence/task-1-zero-result-aggregate.json } finally { Stop-Process -Id $p.Id -Force }
    Expected: .omo/evidence/task-1-zero-result.json has success true, total 0, anonymousZeroResult present; .omo/evidence/task-1-zero-result-aggregate.json contains bucket/count fields and does not contain the searched string.
    Evidence: .omo/evidence/task-1-zero-result.json

  Scenario: invalid short search is rejected and not aggregated
    Tool:     powershell
    Steps:    New-Item -ItemType Directory -Force .omo/evidence | Out-Null; $p=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput .omo/evidence/task-1-short-query-server.out -RedirectStandardError .omo/evidence/task-1-short-query-server.err; try { Start-Sleep -Seconds 4; try { Invoke-RestMethod 'http://127.0.0.1:3005/api/card-studio/analytics/records/search?q=x' -ErrorAction Stop } catch { $_.Exception.Response.StatusCode.value__ | Set-Content .omo/evidence/task-1-zero-result-error.txt }; Get-Content -Raw 'data/analytics/zero-result-search.json' | Set-Content -Encoding UTF8 .omo/evidence/task-1-zero-result-error-aggregate.json } finally { Stop-Process -Id $p.Id -Force }
    Expected: .omo/evidence/task-1-zero-result-error.txt is 400; aggregate evidence does not gain any bucket for length 0-1.
    Evidence: .omo/evidence/task-1-zero-result-error.txt
  ```

  Commit: YES | Message: `feat(records): aggregate zero-result searches anonymously` | Files: [`card-studio/services/zeroResultSearchAggregationService.js`, `card-studio/routes/publicRoutes.js`, `backend/tests/data-rights-policy.test.js`, `data/analytics/zero-result-search.json` if the repo tracks initialized runtime JSON]

- [ ] 2. Zero-result `/records` UX uses anonymous aggregate safely

  What to do: Add TDD source assertions first, then extend the frontend search client and zero-result empty state. `searchRecordAthletes` must return both athlete candidates and optional `anonymousZeroResult` metadata, or add a sibling typed function if preserving the existing call is cleaner. In `RecordsPage`, when `searchState === 'ready'`, query length is >=2, and `athletes.length === 0`, render the existing empty state plus aggregate-safe context using stable `data-testid` selectors. Copy must say the search is within collected public records and suggest changing name/team/event terms; it must not imply the person does not exist or that AthleteTime is complete.
  Must NOT do: Do not echo the user's query beyond the existing search field. Do not show raw zero-result examples. Do not introduce sample athletes or "people also searched" names. Do not change athlete-detail or season-table behavior.

  Parallelization: Can parallel: YES | Wave 2 | Blocks: [7] | Blocked by: [1]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `frontend/src/pages/RecordsPage.tsx:295` - current zero-result branch to enhance.
  - Pattern:  `frontend/src/pages/RecordsPage.tsx:308` - idle state already uses anonymous insight cards; do not confuse idle suggestions with zero-result aggregation.
  - Pattern:  `frontend/src/api/recordAnalytics.ts:189` - existing anonymous aggregate type privacy flags.
  - Pattern:  `frontend/src/api/recordAnalytics.ts:267` - current search client returns only candidate array.
  - Test:     `backend/tests/athlete-user-ux.test.js:122` - record UX source tests for narrowing controls.
  - Test:     `backend/tests/athlete-user-ux.test.js:172` - existing identity/coverage safeguard tests.
  - Test:     `backend/tests/record-to-community-readiness.test.js:12` - record handoff tests that must keep passing.

  Acceptance criteria (agent-executable only):
  - [ ] Add failing TDD source tests, then pass: `node --test backend/tests/athlete-user-ux.test.js backend/tests/record-to-community-readiness.test.js`
  - [ ] Type-check frontend: `npm --prefix frontend run type-check`
  - [ ] Privacy grep passes on product code: `powershell -NoProfile -Command "$matches = rg -n 'people also searched|queryHash|queryText|official ranking|official result|complete national|sampleData|data/sample.json' frontend/src/pages/RecordsPage.tsx frontend/src/api/recordAnalytics.ts; if ($LASTEXITCODE -eq 0) { throw 'blocked records zero-result copy or field found' }"`
  - [ ] The zero-result UI exposes stable selectors for QA: `powershell -NoProfile -Command "$s=Get-Content -Raw 'frontend/src/pages/RecordsPage.tsx'; if ($s -notmatch 'data-testid=\"records-zero-result\"' -or $s -notmatch 'data-testid=\"records-zero-result-aggregate\"') { throw 'missing zero-result QA selectors' }"`

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: browser zero-result state shows anonymous aggregate context
    Tool:     playwright(real Chrome)
    Steps:    New-Item -ItemType Directory -Force .omo/evidence | Out-Null; $api=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput .omo/evidence/task-2-api.out -RedirectStandardError .omo/evidence/task-2-api.err; $ui=Start-Process -FilePath npm -ArgumentList '--prefix','frontend','run','dev','--','--host','127.0.0.1','--port','5173' -PassThru -RedirectStandardOutput .omo/evidence/task-2-ui.out -RedirectStandardError .omo/evidence/task-2-ui.err; try { Start-Sleep -Seconds 8; node -e "const { chromium } = require('playwright'); (async()=>{ const b=await chromium.launch({channel:'chrome'}); const p=await b.newPage({viewport:{width:390,height:844}}); await p.goto('http://127.0.0.1:5173/records?q=zzzzzzzz-launch-p1-zero', {waitUntil:'networkidle'}); await p.locator('[data-testid=records-zero-result]').waitFor({timeout:10000}); await p.screenshot({path:'.omo/evidence/task-2-zero-result.png', fullPage:true}); const text=await p.locator('[data-testid=records-zero-result]').innerText(); require('fs').writeFileSync('.omo/evidence/task-2-zero-result.txt', text); await b.close(); })()" } finally { Stop-Process -Id $ui.Id -Force; Stop-Process -Id $api.Id -Force }
    Expected: Screenshot shows the zero-result state plus aggregate-safe context; text evidence does not include `zzzzzzzz-launch-p1-zero`, official/ranking claims, or sample athlete names.
    Evidence: .omo/evidence/task-2-zero-result.png

  Scenario: successful record search still shows candidates, not zero-result aggregate
    Tool:     playwright(real Chrome)
    Steps:    New-Item -ItemType Directory -Force .omo/evidence | Out-Null; $api=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput .omo/evidence/task-2-api-success.out -RedirectStandardError .omo/evidence/task-2-api-success.err; $ui=Start-Process -FilePath npm -ArgumentList '--prefix','frontend','run','dev','--','--host','127.0.0.1','--port','5173' -PassThru -RedirectStandardOutput .omo/evidence/task-2-ui-success.out -RedirectStandardError .omo/evidence/task-2-ui-success.err; try { Start-Sleep -Seconds 8; node -e "const { chromium } = require('playwright'); (async()=>{ const b=await chromium.launch({channel:'chrome'}); const p=await b.newPage({viewport:{width:1280,height:900}}); await p.goto('http://127.0.0.1:5173/records?q=%EA%B9%80%EB%AF%BC', {waitUntil:'networkidle'}); await p.locator('[data-testid=records-zero-result]').waitFor({state:'detached',timeout:10000}).catch(()=>{}); await p.screenshot({path:'.omo/evidence/task-2-zero-result-error.png', fullPage:true}); const zero=await p.locator('[data-testid=records-zero-result]').count(); require('fs').writeFileSync('.omo/evidence/task-2-zero-result-error.txt', String(zero)); await b.close(); })()" } finally { Stop-Process -Id $ui.Id -Force; Stop-Process -Id $api.Id -Force }
    Expected: .omo/evidence/task-2-zero-result-error.txt is `0`; candidate or non-empty search UI remains available.
    Evidence: .omo/evidence/task-2-zero-result-error.png
  ```

  Commit: YES | Message: `feat(records): show safe zero-result context` | Files: [`frontend/src/api/recordAnalytics.ts`, `frontend/src/pages/RecordsPage.tsx`, `backend/tests/athlete-user-ux.test.js`, `backend/tests/record-to-community-readiness.test.js` if updated]

- [ ] 3. Result freshness backend metadata contract

  What to do: Add TDD coverage first, then carry existing snapshot/provenance fields into the result competition list. Extend `resultsStore._cache.files` entries to include `sourceUrl` and `collectedAt` from normalized raw meta. Extend `searchService.getCompetitions()` and `/results/competitions` to preserve those fields. Keep newest-first ordering unchanged. Add tests that at least one public result competition has a `collectedAt` string when fixture metadata has `crawledAt`/`collectedAt`, and that life-sport exclusion still holds.
  Must NOT do: Do not scrape or download new result files. Do not infer freshness from file modification time when `meta.crawled_at` exists. Do not label stale/missing dates as current, live, official, or guaranteed latest.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [4, 7] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `card-studio/services/resultsStore.js:109` - `_toRawShape` already maps `comp.sourceUrl` and `comp.crawledAt || comp.collectedAt` into meta.
  - Pattern:  `card-studio/services/resultsStore.js:163` - public result competition list currently emits filename, competition, year, period, venue, source only.
  - Pattern:  `card-studio/services/resultsStore.js:185` - `listCompetitions()` contract to update.
  - Pattern:  `card-studio/services/searchService.js:30` - result-backed competition list adapter currently drops provenance fields.
  - Pattern:  `card-studio/routes/publicRoutes.js:534` - `/results/competitions` enrich/filter response.
  - Pattern:  `card-studio/routes/publicRoutes.js:640` - detailed result event meta already returns `sourceUrl` and `collectedAt`.
  - Test:     `backend/tests/competition-results-order.test.js:35` - newest-first order contract.
  - Test:     `backend/tests/competition-results-order.test.js:46` - public index exclusion contract.

  Acceptance criteria (agent-executable only):
  - [ ] Add failing backend tests, then pass: `node --test backend/tests/competition-results-order.test.js`
  - [ ] Existing privacy/provenance tests still pass: `node --test backend/tests/data-rights-policy.test.js`
  - [ ] HTTP response includes freshness fields: `powershell -NoProfile -Command "$p=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput .omo/evidence/task-3-server.out -RedirectStandardError .omo/evidence/task-3-server.err; try { Start-Sleep -Seconds 4; $r=Invoke-RestMethod 'http://127.0.0.1:3005/api/card-studio/results/competitions?year=2026'; $r | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 .omo/evidence/task-3-result-competitions.json; if (($r.data | Select-Object -First 1).PSObject.Properties.Name -notcontains 'collectedAt') { throw 'missing collectedAt' } } finally { Stop-Process -Id $p.Id -Force }"`
  - [ ] No data expansion was introduced: `powershell -NoProfile -Command "$matches = git diff --name-only -- data/results data/competitions data/raw_duplicates data/sources; if ($matches) { throw ('data collection files changed unexpectedly: ' + ($matches -join ', ')) }"`

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: result competition list exposes collectedAt/sourceUrl without changing order
    Tool:     powershell
    Steps:    New-Item -ItemType Directory -Force .omo/evidence | Out-Null; $p=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput .omo/evidence/task-3-server-order.out -RedirectStandardError .omo/evidence/task-3-server-order.err; try { Start-Sleep -Seconds 4; $r=Invoke-RestMethod 'http://127.0.0.1:3005/api/card-studio/results/competitions'; $r | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 .omo/evidence/task-3-freshness.json; $dates=$r.data | ForEach-Object { [regex]::Matches($_.period,'\d{4}-\d{2}-\d{2}') | Select-Object -Last 1 | ForEach-Object Value }; for ($i=1; $i -lt $dates.Count; $i++) { if ($dates[$i-1] -lt $dates[$i]) { throw 'order regression' } } } finally { Stop-Process -Id $p.Id -Force }
    Expected: Evidence JSON has result competitions with `collectedAt` and/or `sourceUrl`; period ordering is newest first.
    Evidence: .omo/evidence/task-3-freshness.json

  Scenario: excluded life-sport result files remain inaccessible
    Tool:     powershell
    Steps:    node --test backend/tests/competition-results-order.test.js *> .omo/evidence/task-3-freshness-error.txt
    Expected: Test output passes the public-index exclusion test and includes no mojibake replacement-character regression.
    Evidence: .omo/evidence/task-3-freshness-error.txt
  ```

  Commit: YES | Message: `feat(competitions): expose result freshness metadata` | Files: [`card-studio/services/resultsStore.js`, `card-studio/services/searchService.js`, `card-studio/routes/publicRoutes.js`, `backend/tests/competition-results-order.test.js`]

- [ ] 4. Competition cards show result freshness labels

  What to do: Add TDD source assertions first, then update frontend result competition typing and card rendering. Change `ScheduleTab` from `Set<string>` to a map keyed by normalized competition name that keeps result filename, source, source label, source URL, collectedAt, and period. Add a small helper for safe freshness labels, e.g. `formatResultFreshnessLabel(collectedAt)` returning `snapshot YYYY-MM-DD` or `snapshot date unknown`. Render this label next to the existing result badge on desktop rows and mobile cards, with `data-testid="competition-result-freshness"`. Optionally include the same label in the results dropdown option text, but do not change default selection.
  Must NOT do: Do not claim realtime, latest guaranteed, official ranking, or complete result coverage. Do not replace existing result links with external source links. Do not remove current D-day/status badges.

  Parallelization: Can parallel: YES | Wave 2 | Blocks: [7] | Blocked by: [3]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `frontend/src/api/competitions.ts:280` - `ResultCompetition` type currently lacks `sourceUrl` and `collectedAt`.
  - Pattern:  `frontend/src/api/competitions.ts:315` - detailed `ResultMeta` already has `sourceUrl` and `collectedAt`.
  - Pattern:  `frontend/src/components/competitions/ResultSourceSummary.tsx:18` - existing collection-date formatting logic.
  - Pattern:  `frontend/src/components/competitions/tabs/ScheduleTab.tsx:15` - current result-availability lookup.
  - Pattern:  `frontend/src/components/competitions/tabs/ScheduleTab.tsx:154` - desktop row result badge location.
  - Pattern:  `frontend/src/components/competitions/tabs/ScheduleTab.tsx:197` - mobile card result badge location.
  - Pattern:  `frontend/src/components/competitions/tabs/ResultsTab.tsx:32` - latest result default that must not regress.
  - Test:     `backend/tests/athlete-user-ux.test.js:212` - latest result default source assertion.
  - Test:     `backend/tests/athlete-user-ux.test.js:220` - result ordering copy guardrail.
  - Test:     `backend/tests/athlete-user-ux.test.js:228` - provenance/trust summary guardrail.

  Acceptance criteria (agent-executable only):
  - [ ] Add failing source tests, then pass: `node --test backend/tests/athlete-user-ux.test.js backend/tests/competition-results-order.test.js`
  - [ ] Type-check frontend: `npm --prefix frontend run type-check`
  - [ ] Source guardrail grep passes: `powershell -NoProfile -Command "$matches = rg -n 'latest guaranteed|realtime|official ranking|official result|complete national|fresh guaranteed|실시간 공식|최신 보장|공식 결과 순위|전국 전체 랭킹' frontend/src/components/competitions frontend/src/api/competitions.ts; if ($LASTEXITCODE -eq 0) { throw 'blocked freshness claim found' }"`
  - [ ] QA selector exists in both desktop and mobile render paths: `powershell -NoProfile -Command "$s=Get-Content -Raw 'frontend/src/components/competitions/tabs/ScheduleTab.tsx'; if (($s | Select-String 'data-testid=\"competition-result-freshness\"' -AllMatches).Matches.Count -lt 2) { throw 'freshness selector must appear in desktop and mobile paths' }"`

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: desktop competition card/row shows result freshness
    Tool:     playwright(real Chrome)
    Steps:    New-Item -ItemType Directory -Force .omo/evidence | Out-Null; $api=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput .omo/evidence/task-4-api.out -RedirectStandardError .omo/evidence/task-4-api.err; $ui=Start-Process -FilePath npm -ArgumentList '--prefix','frontend','run','dev','--','--host','127.0.0.1','--port','5173' -PassThru -RedirectStandardOutput .omo/evidence/task-4-ui.out -RedirectStandardError .omo/evidence/task-4-ui.err; try { Start-Sleep -Seconds 8; node -e "const { chromium } = require('playwright'); (async()=>{ const b=await chromium.launch({channel:'chrome'}); const p=await b.newPage({viewport:{width:1366,height:900}}); await p.goto('http://127.0.0.1:5173/competitions', {waitUntil:'networkidle'}); await p.locator('[data-testid=competition-result-freshness]').first().waitFor({timeout:15000}); await p.screenshot({path:'.omo/evidence/task-4-freshness-desktop.png', fullPage:true}); const text=await p.locator('[data-testid=competition-result-freshness]').first().innerText(); require('fs').writeFileSync('.omo/evidence/task-4-freshness-desktop.txt', text); await b.close(); })()" } finally { Stop-Process -Id $ui.Id -Force; Stop-Process -Id $api.Id -Force }
    Expected: Desktop screenshot shows an existing result badge plus a snapshot/freshness label; text contains a date or explicit unknown-date fallback and no official/latest-guaranteed wording.
    Evidence: .omo/evidence/task-4-freshness-desktop.png

  Scenario: mobile competition card shows result freshness without overlap
    Tool:     playwright(real Chrome)
    Steps:    New-Item -ItemType Directory -Force .omo/evidence | Out-Null; $api=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput .omo/evidence/task-4-api-mobile.out -RedirectStandardError .omo/evidence/task-4-api-mobile.err; $ui=Start-Process -FilePath npm -ArgumentList '--prefix','frontend','run','dev','--','--host','127.0.0.1','--port','5173' -PassThru -RedirectStandardOutput .omo/evidence/task-4-ui-mobile.out -RedirectStandardError .omo/evidence/task-4-ui-mobile.err; try { Start-Sleep -Seconds 8; node -e "const { chromium } = require('playwright'); (async()=>{ const b=await chromium.launch({channel:'chrome'}); const p=await b.newPage({viewport:{width:390,height:844}}); await p.goto('http://127.0.0.1:5173/competitions', {waitUntil:'networkidle'}); await p.locator('[data-testid=competition-result-freshness]').first().waitFor({timeout:15000}); await p.screenshot({path:'.omo/evidence/task-4-freshness-error.png', fullPage:true}); const boxes=await p.locator('[data-testid=competition-result-freshness]').first().boundingBox(); require('fs').writeFileSync('.omo/evidence/task-4-freshness-error.txt', JSON.stringify(boxes)); await b.close(); })()" } finally { Stop-Process -Id $ui.Id -Force; Stop-Process -Id $api.Id -Force }
    Expected: Mobile screenshot shows the freshness label readable inside the card; bounding box evidence is non-null.
    Evidence: .omo/evidence/task-4-freshness-error.png
  ```

  Commit: YES | Message: `feat(competitions): label result snapshot freshness` | Files: [`frontend/src/api/competitions.ts`, `frontend/src/components/competitions/ResultSourceSummary.tsx` if helper is shared, `frontend/src/components/competitions/tabs/ScheduleTab.tsx`, `frontend/src/components/competitions/tabs/ResultsTab.tsx` if option label is updated, `backend/tests/athlete-user-ux.test.js`]

- [ ] 5. Frontend route chunk split source boundary

  What to do: Add TDD source assertions first, then convert non-core/heavy routes in `App.tsx` to `React.lazy` with a single `Suspense` fallback. Keep launch-core public routes eager unless measurement proves they must be split: `/`, `/records`, `/competitions`, `/profile-card`, `/community`, `/about-data`, `/data-request`, and 404. Lazy-load admin pages, calculators, chat, PaceRise, marketplace, match-result CRUD/detail, schedule-card, write/edit, profile, login/register/verify if needed. Ensure `RequireAuth`, `AdminRoute`, and layouts still wrap lazy elements correctly. Add or update source tests in `launch-surface-nav.test.js` to assert non-core pages are no longer statically imported.
  Must NOT do: Do not remove routes. Do not move secondary tools back into primary nav. Do not lazy-load `Layout` in a way that delays header/nav rendering. Do not introduce visible "loading marketing" copy; fallback should be small and neutral.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [6, 7] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `frontend/src/App.tsx:9` - current static page imports that likely feed the large first-party chunk.
  - Pattern:  `frontend/src/App.tsx:79` - route tree to preserve.
  - Pattern:  `frontend/src/App.tsx:121` - `/records` route must continue rendering.
  - Pattern:  `frontend/src/App.tsx:165` - `/competitions` route must continue rendering.
  - Pattern:  `backend/tests/launch-surface-nav.test.js:21` - primary nav guardrail.
  - Pattern:  `backend/tests/launch-surface-nav.test.js:64` - mobile tab bar core-loop guardrail.
  - Pattern:  `frontend/src/components/layout/Header.tsx:289` - primary nav items currently limited to launch core.
  - External: `https://react.dev/reference/react/lazy` - React lazy loading reference.
  - External: `https://react.dev/reference/react/Suspense` - React suspense fallback reference.

  Acceptance criteria (agent-executable only):
  - [ ] Add failing source tests, then pass: `node --test backend/tests/launch-surface-nav.test.js`
  - [ ] Full record/competition source tests still pass: `node --test backend/tests/athlete-user-ux.test.js backend/tests/record-to-community-readiness.test.js`
  - [ ] Type-check frontend: `npm --prefix frontend run type-check`
  - [ ] Static import guard passes: `powershell -NoProfile -Command "$s=Get-Content -Raw 'frontend/src/App.tsx'; foreach ($name in 'PaceRisePage','PaceCalculatorPage','TrainingCalculatorPage','ChatPage','MarketplacePage','AdminDashboardPage','ScheduleCardPage') { if ($s -match ('import\\s+'+$name+'\\s+from')) { throw ('heavy route still statically imported: '+$name) } }; if ($s -notmatch 'lazy\\(\\(\\) => import\\(' -or $s -notmatch '<Suspense') { throw 'missing lazy/Suspense route split' }"`
  - [ ] Nav guard still passes no primary expansion: `powershell -NoProfile -Command "$matches = rg -n 'path: ''/(pacerise|pace-calculator|training-calculator|marketplace|chat)''' frontend/src/components/layout/MobileTabBar.tsx; if ($LASTEXITCODE -eq 0) { throw 'secondary route added to mobile primary tab bar' }"`

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: launch-core routes still render after lazy split
    Tool:     playwright(real Chrome)
    Steps:    New-Item -ItemType Directory -Force .omo/evidence | Out-Null; $api=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput .omo/evidence/task-5-api.out -RedirectStandardError .omo/evidence/task-5-api.err; $ui=Start-Process -FilePath npm -ArgumentList '--prefix','frontend','run','dev','--','--host','127.0.0.1','--port','5173' -PassThru -RedirectStandardOutput .omo/evidence/task-5-ui.out -RedirectStandardError .omo/evidence/task-5-ui.err; try { Start-Sleep -Seconds 8; node -e "const { chromium } = require('playwright'); (async()=>{ const b=await chromium.launch({channel:'chrome'}); const p=await b.newPage({viewport:{width:1280,height:900}}); const routes=['/','/records','/competitions','/about-data','/data-request']; const out=[]; for (const r of routes) { await p.goto('http://127.0.0.1:5173'+r,{waitUntil:'networkidle'}); out.push(r+':'+await p.locator('body').innerText({timeout:5000}).then(t=>t.length)); } require('fs').writeFileSync('.omo/evidence/task-5-lazy-routes.txt', out.join('\n')); await p.screenshot({path:'.omo/evidence/task-5-lazy-routes.png', fullPage:true}); await b.close(); })()" } finally { Stop-Process -Id $ui.Id -Force; Stop-Process -Id $api.Id -Force }
    Expected: Evidence text lists nonzero body text length for each launch-core route; screenshot is nonblank.
    Evidence: .omo/evidence/task-5-lazy-routes.png

  Scenario: lazy secondary route still loads on demand
    Tool:     playwright(real Chrome)
    Steps:    New-Item -ItemType Directory -Force .omo/evidence | Out-Null; $api=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput .omo/evidence/task-5-api-error.out -RedirectStandardError .omo/evidence/task-5-api-error.err; $ui=Start-Process -FilePath npm -ArgumentList '--prefix','frontend','run','dev','--','--host','127.0.0.1','--port','5173' -PassThru -RedirectStandardOutput .omo/evidence/task-5-ui-error.out -RedirectStandardError .omo/evidence/task-5-ui-error.err; try { Start-Sleep -Seconds 8; node -e "const { chromium } = require('playwright'); (async()=>{ const b=await chromium.launch({channel:'chrome'}); const p=await b.newPage({viewport:{width:1280,height:900}}); const errors=[]; p.on('pageerror', e=>errors.push(e.message)); await p.goto('http://127.0.0.1:5173/pace-calculator',{waitUntil:'networkidle'}); await p.screenshot({path:'.omo/evidence/task-5-lazy-routes-error.png', fullPage:true}); require('fs').writeFileSync('.omo/evidence/task-5-lazy-routes-error.txt', errors.join('\n')); await b.close(); })()" } finally { Stop-Process -Id $ui.Id -Force; Stop-Process -Id $api.Id -Force }
    Expected: Secondary route screenshot is nonblank and page error evidence is empty.
    Evidence: .omo/evidence/task-5-lazy-routes-error.png
  ```

  Commit: YES | Message: `perf(frontend): lazy-load secondary routes` | Files: [`frontend/src/App.tsx`, `backend/tests/launch-surface-nav.test.js`]

- [ ] 6. Vite chunk configuration and 733KB build evidence

  What to do: Add TDD/source assertions first, then adjust `frontend/vite.config.ts` only as needed after Task 5. Keep existing `vendor`, `ui`, and `query` chunks unless measurement shows a better split. Add explicit chunks for heavy stable libraries if emitted with main app code, such as icon libraries and document/export libraries. Run a production build and capture the asset table. The target is no single emitted JS file in `community/assets` at or above 500 KiB uncompressed, and no reappearance of a ~733KB app chunk. Do not raise `chunkSizeWarningLimit` as the main fix.
  Must NOT do: Do not use `build.chunkSizeWarningLimit` to hide the warning without reducing chunk size. Do not edit unrelated build/deploy settings. Do not run formatters that rewrite unrelated files.

  Parallelization: Can parallel: YES | Wave 2 | Blocks: [7] | Blocked by: [5]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `frontend/vite.config.ts:58` - current Vite build config.
  - Pattern:  `frontend/vite.config.ts:65` - existing manual chunk object.
  - Pattern:  `frontend/package.json:8` - `build` command.
  - Pattern:  `frontend/package.json:9` - `build:check` command.
  - Pattern:  `frontend/src/App.tsx:9` - static route imports to confirm Task 5 changed.
  - External: `https://v7.vite.dev/guide/build` - Vite build customization through `build.rollupOptions`.
  - External: `https://v7.vite.dev/config/build-options#build-chunksizewarninglimit` - chunk-size warning threshold is uncompressed kB and should not be used as a blind suppression.
  - External: `https://rollupjs.org/configuration-options/#output-manualchunks` - Rollup `output.manualChunks` object/function behavior.

  Acceptance criteria (agent-executable only):
  - [ ] Add failing source/build-boundary tests, then pass: `node --test backend/tests/launch-surface-nav.test.js`
  - [ ] Type and build pass: `npm --prefix frontend run build:check`
  - [ ] Capture build output: `powershell -NoProfile -Command "npm --prefix frontend run build *>&1 | Tee-Object -FilePath .omo/evidence/task-6-frontend-build.txt"`
  - [ ] Largest JS chunk is below 500 KiB: `powershell -NoProfile -Command "$largest=Get-ChildItem -Recurse -File 'community/assets' -Filter '*.js' | Sort-Object Length -Descending | Select-Object -First 1; $largest | Select-Object Name,Length,@{Name='KiB';Expression={[math]::Round($_.Length/1KB,1)}} | ConvertTo-Json | Set-Content -Encoding UTF8 .omo/evidence/task-6-largest-js.json; if ($largest.Length -ge 512000) { throw ('largest JS chunk too large: ' + $largest.Name + ' ' + $largest.Length) }"`
  - [ ] No warning suppression-only change: `powershell -NoProfile -Command "$s=Get-Content -Raw 'frontend/vite.config.ts'; if ($s -match 'chunkSizeWarningLimit\\s*:\\s*(7\\d\\d|[89]\\d\\d|\\d{4,})') { throw 'chunkSizeWarningLimit raised instead of splitting chunk' }"`

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: production build emits split assets below threshold
    Tool:     powershell
    Steps:    New-Item -ItemType Directory -Force .omo/evidence | Out-Null; npm --prefix frontend run build *>&1 | Tee-Object -FilePath .omo/evidence/task-6-build-output.txt; Get-ChildItem -Recurse -File 'community/assets' -Filter '*.js' | Sort-Object Length -Descending | Select-Object -First 20 Name,Length,@{Name='KiB';Expression={[math]::Round($_.Length/1KB,1)}} | ConvertTo-Json | Set-Content -Encoding UTF8 .omo/evidence/task-6-chunk-risk.json
    Expected: Build exits 0; evidence JSON shows largest JS chunk under 500 KiB and no 733KB chunk.
    Evidence: .omo/evidence/task-6-chunk-risk.json

  Scenario: production preview loads core pages after split
    Tool:     playwright(real Chrome)
    Steps:    New-Item -ItemType Directory -Force .omo/evidence | Out-Null; npm --prefix frontend run build *> .omo/evidence/task-6-preview-build.txt; $api=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput .omo/evidence/task-6-api.out -RedirectStandardError .omo/evidence/task-6-api.err; $preview=Start-Process -FilePath npm -ArgumentList '--prefix','frontend','run','preview','--','--host','127.0.0.1','--port','5173' -PassThru -RedirectStandardOutput .omo/evidence/task-6-preview.out -RedirectStandardError .omo/evidence/task-6-preview.err; try { Start-Sleep -Seconds 8; node -e "const { chromium } = require('playwright'); (async()=>{ const b=await chromium.launch({channel:'chrome'}); const p=await b.newPage({viewport:{width:1280,height:900}}); const errors=[]; p.on('console', msg=>{ if (msg.type()==='error') errors.push(msg.text()) }); for (const r of ['/records','/competitions']) { await p.goto('http://127.0.0.1:5173'+r,{waitUntil:'networkidle'}); } await p.screenshot({path:'.omo/evidence/task-6-chunk-risk-error.png', fullPage:true}); require('fs').writeFileSync('.omo/evidence/task-6-chunk-risk-error.txt', errors.join('\n')); await b.close(); })()" } finally { Stop-Process -Id $preview.Id -Force; Stop-Process -Id $api.Id -Force }
    Expected: Preview routes load with no captured console errors.
    Evidence: .omo/evidence/task-6-chunk-risk-error.png
  ```

  Commit: YES | Message: `perf(frontend): split oversized launch chunks` | Files: [`frontend/vite.config.ts`, `frontend/src/App.tsx` if Task 5 and Task 6 are combined by executor, `backend/tests/launch-surface-nav.test.js` if chunk-boundary assertions are added there]

- [ ] 7. Integrated launch P1 guardrail and handoff verification

  What to do: After Tasks 1-6 are implemented, run targeted and full verification. Add only minimal source-test assertions if an integration gap is found: no primary nav re-expansion, no official/ranking claims in new UI text, no sample athlete data, no blocked-host scraping hooks, and no data collection expansion. Capture a PR-ready evidence summary under `.omo/evidence/launch-week-p1/summary.txt` that lists commands run, result, largest chunk size, and manual QA screenshots. This task may update tests but should not add new product features.
  Must NOT do: Do not stage all files. Do not add a new P2/P3 feature. Do not modify `data/results`, `data/competitions`, `data/raw_duplicates`, or `data/sources` as part of P1.

  Parallelization: Can parallel: NO | Wave 3 | Blocks: [final verification] | Blocked by: [1, 2, 3, 4, 5, 6]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `backend/tests/launch-surface-nav.test.js:21` - primary nav contract.
  - Pattern:  `backend/tests/athlete-user-ux.test.js:91` - no sample showcase/default path.
  - Pattern:  `backend/tests/athlete-user-ux.test.js:220` - no latest/official/ranking result claims.
  - Pattern:  `backend/tests/data-rights-policy.test.js:133` - no restricted identifiers in record/result APIs.
  - Pattern:  `backend/tests/coverage-matrix.test.js:65` - existing copy that 2010-today coverage is incomplete.
  - Pattern:  `docs/athletetime-final-decision-blueprint.md:64` - do not claim official status.
  - Pattern:  `docs/athletetime-final-decision-blueprint.md:69` - do not bypass robots or access controls.
  - Current PR context: PR #5 changed filenames from connector: `.omo/evidence/launch-week-ux/summary.txt`, `backend/tests/launch-surface-nav.test.js`, `docs/athletetime-service-purpose-and-retention.md`, `frontend/src/components/layout/Footer.tsx`, `frontend/src/components/layout/Header.tsx`, `frontend/src/pages/MainPage.tsx`, `frontend/src/pages/NotFoundPage.tsx`, `package.json`.

  Acceptance criteria (agent-executable only):
  - [ ] Targeted tests pass: `node --test backend/tests/launch-surface-nav.test.js backend/tests/athlete-user-ux.test.js backend/tests/record-to-community-readiness.test.js backend/tests/competition-results-order.test.js backend/tests/data-rights-policy.test.js`
  - [ ] Full backend suite passes: `npm test`
  - [ ] Frontend checks pass: `npm --prefix frontend run type-check && npm --prefix frontend run build`
  - [ ] Guardrail grep passes on changed product code: `powershell -NoProfile -Command "$diff = git diff -- frontend/src card-studio/services card-studio/routes; $diff | Set-Content -Encoding UTF8 .omo/evidence/task-7-product-diff.txt; if ($diff -match 'official ranking|official result|complete national|latest guaranteed|sampleData|data/sample.json|person_no|birthdate|birthDate') { throw 'blocked term found in changed product code' }"`
  - [ ] No deferred data expansion files changed: `powershell -NoProfile -Command "$changed = git diff --name-only -- data/results data/competitions data/raw_duplicates data/sources; if ($changed) { throw ('deferred data files changed: ' + ($changed -join ', ')) }"`
  - [ ] Evidence summary exists: `powershell -NoProfile -Command "if (!(Test-Path '.omo/evidence/launch-week-p1/summary.txt')) { throw 'missing launch-week P1 evidence summary' }"`

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: launch P1 browser smoke covers records and competitions
    Tool:     playwright(real Chrome)
    Steps:    New-Item -ItemType Directory -Force .omo/evidence/launch-week-p1 | Out-Null; $api=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput .omo/evidence/launch-week-p1/api.out -RedirectStandardError .omo/evidence/launch-week-p1/api.err; $ui=Start-Process -FilePath npm -ArgumentList '--prefix','frontend','run','dev','--','--host','127.0.0.1','--port','5173' -PassThru -RedirectStandardOutput .omo/evidence/launch-week-p1/ui.out -RedirectStandardError .omo/evidence/launch-week-p1/ui.err; try { Start-Sleep -Seconds 8; node -e "const { chromium } = require('playwright'); (async()=>{ const b=await chromium.launch({channel:'chrome'}); const p=await b.newPage({viewport:{width:1280,height:900}}); const errors=[]; p.on('console', msg=>{ if (msg.type()==='error') errors.push(msg.text()) }); await p.goto('http://127.0.0.1:5173/records?q=zzzzzzzz-launch-p1-zero',{waitUntil:'networkidle'}); await p.screenshot({path:'.omo/evidence/task-7-launch-p1.png', fullPage:true}); await p.goto('http://127.0.0.1:5173/competitions',{waitUntil:'networkidle'}); await p.screenshot({path:'.omo/evidence/task-7-launch-p1-competitions.png', fullPage:true}); require('fs').writeFileSync('.omo/evidence/task-7-launch-p1.txt', errors.join('\n')); await b.close(); })()" } finally { Stop-Process -Id $ui.Id -Force; Stop-Process -Id $api.Id -Force }
    Expected: Records zero-result and competitions freshness screenshots are captured; console error text is empty.
    Evidence: .omo/evidence/task-7-launch-p1.png

  Scenario: final git hygiene excludes broad staging and deferred data mutation
    Tool:     powershell
    Steps:    git status --short | Set-Content -Encoding UTF8 .omo/evidence/task-7-launch-p1-error.txt; git diff --name-only -- data/results data/competitions data/raw_duplicates data/sources | Set-Content -Encoding UTF8 .omo/evidence/task-7-launch-p1-data-diff.txt
    Expected: Status lists only intended source/test/evidence files; data diff evidence is empty.
    Evidence: .omo/evidence/task-7-launch-p1-error.txt
  ```

  Commit: YES | Message: `test(launch): verify P1 takeover guardrails` | Files: [`backend/tests/launch-surface-nav.test.js`, `backend/tests/athlete-user-ux.test.js`, `backend/tests/record-to-community-readiness.test.js`, `.omo/evidence/launch-week-p1/summary.txt` if evidence is committed by project convention]

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
- Reference the plan file path in the final commit footer: `Plan: .omo/plans/athletetime-launch-week-p1-takeover.md`.
- Stage explicit files only, for example `git add card-studio/services/zeroResultSearchAggregationService.js card-studio/routes/publicRoutes.js backend/tests/data-rights-policy.test.js`; never use `git add .`.
- If `.omo/evidence` is not committed by project convention, still capture it and cite paths in PR/hand-off notes.

## Success criteria
- All Must-Have shipped; all QA scenarios pass with captured evidence; F1-F4 approved; commit history clean.
- Exact command succeeds: `node --test backend/tests/launch-surface-nav.test.js backend/tests/athlete-user-ux.test.js backend/tests/record-to-community-readiness.test.js backend/tests/competition-results-order.test.js backend/tests/data-rights-policy.test.js`
- Exact command succeeds: `npm test`
- Exact command succeeds: `npm --prefix frontend run type-check`
- Exact command succeeds: `npm --prefix frontend run build`
- Exact command succeeds and writes evidence: `powershell -NoProfile -Command "$largest=Get-ChildItem -Recurse -File 'community/assets' -Filter '*.js' | Sort-Object Length -Descending | Select-Object -First 1; $largest | Select-Object Name,Length,@{Name='KiB';Expression={[math]::Round($_.Length/1KB,1)}} | ConvertTo-Json | Set-Content -Encoding UTF8 .omo/evidence/task-6-largest-js.json; if ($largest.Length -ge 512000) { throw ('largest JS chunk too large: ' + $largest.Name + ' ' + $largest.Length) }"`
- Manual QA evidence exists at `.omo/evidence/task-2-zero-result.png`, `.omo/evidence/task-4-freshness-desktop.png`, `.omo/evidence/task-6-chunk-risk.json`, and `.omo/evidence/task-7-launch-p1.png`.
- Guardrails remain true: no primary nav re-expansion, no official/ranking/latest-guaranteed claims, no sample athlete data, no blocked-host scraping, no PII-bearing zero-result storage, and no 2010-today data expansion changes.
