# Remaining Safe Work Before Fable

## TL;DR
> Summary:      Keep the relay safety patch in a verified hold state, harden observable API/UI proof, and prepare a source-recovery packet without restoring any relay rows before Fable/source files arrive.
> Deliverables:
> - Baseline validation and branch-state evidence for commit `d3e86bd`.
> - Targeted test hardening for held relay API/search behavior if gaps are found.
> - HTTP and browser manual QA artifacts proving held relay rows stay hidden.
> - Fable/source-recovery blocker packet listing exactly what remains blocked.
> Effort:       Short
> Risk:         Medium - data restoration is unsafe without original KAAF files/DOM fixtures.

## Scope
### Must have
- Verify the current relay hold baseline from `d3e86bd fix(results): hold unsafe relay result rows`.
- Keep all immediate work safe: validation, tests, QA, source-readiness notes, and only minimal code changes if a red test exposes a production gap.
- Preserve held relay events as `qualityHold` / `source_reverify_needed` with no fabricated rows.
- Prove three success criteria through agent-run tests plus manual QA artifacts:
  - Validator reports 25 public relay competitions and 0 violations.
  - API returns hold metadata and zero result rows for `2026__2026-road-005.json`.
  - Browser results tab shows hold copy and does not render polluted athlete rows.
  - Source-recovery packet confirms restoration is blocked until real source files/DOM fixtures/Fable review.
- Respect project rule: no `git add .`; do not revert other agents.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- Do not restore, infer, or fabricate relay rows from corrupted `name` / `affiliation` / `record` text.
- Do not scrape blocked hosts, bypass access controls, or expand collection beyond approved KAAF public schedule attachments.
- Do not run `scripts/hold-relay-results-for-reverify.js --write` unless a failing test proves data hold state regressed and the exact affected files are reviewed.
- Do not edit `data/results/*.json` before Fable/source review unless the only change is reapplying hold metadata after a red regression test.
- Do not commit evidence blindly; follow existing project convention and include paths in the handoff if evidence is not committed.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: TDD for production changes using Node `node:test`; tests-after/no-code-change is allowed only for baseline evidence tasks.
- QA policy: every task has agent-executed scenarios.
- Evidence: `.omo/evidence/fable-safe-work/task-<N>-<slug>.<ext>`

## Execution strategy
### Parallel execution waves
> Target 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks to maximize parallelism.

Wave 1 (no dependencies):
- Task 1: Baseline relay validator and branch evidence
- Task 2: Source availability and blocked-restoration audit
- Task 3: HTTP QA harness for held relay event endpoint
- Task 4: Browser QA harness for results tab hold copy
- Task 5: Test-gap review for dynamic relay API/search contracts

Wave 2 (after Wave 1):
- Task 6: TDD minimal hardening for any red API/search/UI contract gap; depends [3, 4, 5]
- Task 7: Fable handoff packet and blocked-work list; depends [1, 2, 3, 4]

Wave 3 (after Wave 2):
- Task 8: Final verification and commit preparation; depends [6, 7]

Critical path: Task 5 -> Task 6 -> Task 8

### Dependency matrix
| Task | Depends on | Blocks | Can parallelize with |
|------|------------|--------|----------------------|
| 1    | none       | 7, 8   | 2, 3, 4, 5           |
| 2    | none       | 7      | 1, 3, 4, 5           |
| 3    | none       | 6, 7   | 1, 2, 4, 5           |
| 4    | none       | 6, 7   | 1, 2, 3, 5           |
| 5    | none       | 6      | 1, 2, 3, 4           |
| 6    | 3, 4, 5    | 8      | 7                    |
| 7    | 1, 2, 3, 4 | 8      | 6                    |
| 8    | 1, 6, 7    | none   | final-only           |

## Todos
> Implementation + Test = ONE task. Never separate.
> Every task MUST have: References + Acceptance Criteria + QA Scenarios + Commit.

- [ ] 1. Baseline relay validator and branch evidence

  What to do: Capture current branch, commit, dirty-state, validator, targeted relay test, and full suite outputs before any change. This is immediate root work and does not wait for Fable.
  Must NOT do: Do not edit files; do not stage files; do not run data rewrite scripts.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [7, 8] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `package.json:16` - full Node test suite already includes `backend/tests/relay-results-standard.test.js`.
  - Pattern:  `scripts/validate-relay-results.js:109` - validator scans `data/results/*.json`.
  - Pattern:  `scripts/validate-relay-results.js:125` - `--json` emits relay competition count and violations.
  - Test:     `backend/tests/relay-results-standard.test.js:17` - targeted validator contract.
  - Current:  `d3e86bd` - relay safety commit already pushed on branch `codex/pr5-w1w4-local`.
  - External: `https://github.com/nodejs/node/blob/main/doc/api/test.md` - `node --test` supports explicit test file paths.

  Acceptance criteria (agent-executable only):
  - [ ] Branch state captured: `powershell -NoProfile -Command "git status --short --branch | Tee-Object -FilePath .omo/evidence/fable-safe-work/task-1-branch-status.txt"` exits 0 and shows no product-file drift before work.
  - [ ] Validator passes: `powershell -NoProfile -Command "node scripts/validate-relay-results.js --json | Tee-Object -FilePath .omo/evidence/fable-safe-work/task-1-validator.json"` exits 0 and JSON contains `"relayCompetitions": 25` and `"violations": 0`.
  - [ ] Targeted relay tests pass: `powershell -NoProfile -Command "node --test backend/tests/relay-results-standard.test.js *> .omo/evidence/fable-safe-work/task-1-relay-test.txt"` exits 0 and output contains `# pass 5` or higher if tests were safely added later.
  - [ ] Full suite passes: `powershell -NoProfile -Command "npm test *> .omo/evidence/fable-safe-work/task-1-npm-test.txt"` exits 0.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Validator baseline is green
    Tool:     tmux
    Steps:    tmux new-session -d -s ulw-qa-relay-validator "cd /d C:\Users\SAMSUNG\Documents\2026 첫프젝\2026-first-item-pr5-w1w4 && node scripts/validate-relay-results.js --json"; Start-Sleep -Seconds 3; tmux capture-pane -pS -200 -t ulw-qa-relay-validator > .omo/evidence/fable-safe-work/task-1-validator-tmux.txt; tmux kill-session -t ulw-qa-relay-validator
    Expected: transcript contains `"relayCompetitions": 25`, `"violations": 0`, and `"details": []`.
    Evidence: .omo/evidence/fable-safe-work/task-1-validator-tmux.txt

  Scenario: Full suite gate has no regression
    Tool:     tmux
    Steps:    tmux new-session -d -s ulw-qa-npm-test "cd /d C:\Users\SAMSUNG\Documents\2026 첫프젝\2026-first-item-pr5-w1w4 && npm test"; poll `tmux capture-pane -pS -500 -t ulw-qa-npm-test` until process exits; save final pane to .omo/evidence/fable-safe-work/task-1-npm-test-tmux.txt; tmux kill-session -t ulw-qa-npm-test
    Expected: transcript contains `# fail 0` and a nonzero `# pass` count.
    Evidence: .omo/evidence/fable-safe-work/task-1-npm-test-tmux.txt
  ```

  Commit: NO | Message: `test(results): capture relay hold baseline` | Files: [`backend/tests/relay-results-standard.test.js` only if Task 6 adds tests]

- [ ] 2. Source availability and blocked-restoration audit

  What to do: Prove whether source files/DOM fixtures needed for true restoration exist locally. Record an explicit blocked list for every missing source class. This is immediate root work.
  Must NOT do: Do not download new sources; do not call live KAAF pages; do not use `--write`; do not treat `data/raw_duplicates` as relay source truth unless file names and metadata match the relay competitions.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [7] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `data/sources/.gitkeep` - local `data/sources` currently has no committed source files.
  - Pattern:  `backend/tests/source-download-cli.test.js:56` - approved ledger source downloads into private storage.
  - Pattern:  `backend/tests/source-download-cli.test.js:85` - unapproved source download exits nonzero without making a request.
  - Pattern:  `backend/tests/kaaf-schedule-result-harvester.test.js:27` - allowed result attachments are deduped non-life-sport KAAF `FILEs_4` files.
  - Pattern:  `backend/tests/kaaf-schedule-result-harvester.test.js:56` - harvester must not touch `result.kaaf.or.kr`.
  - Pattern:  `card-studio/services/kaafResultOriginalSearchService.js:51` - manifest audit reports missing/hash/policy issues.
  - Pattern:  `docs/athletetime-relay-results-standardization.md:102` - restoration requires original result pages/files; otherwise mark `source_reverify_needed`.

  Acceptance criteria (agent-executable only):
  - [ ] Source file inventory captured: `powershell -NoProfile -Command "Get-ChildItem -Recurse -File data/sources,data/raw_duplicates | Select-Object FullName,Length | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 .omo/evidence/fable-safe-work/task-2-source-inventory.json"` exits 0.
  - [ ] Missing source blocker captured: `powershell -NoProfile -Command "$sources=(Get-ChildItem -Recurse -File data/sources | Where-Object {$_.Name -ne '.gitkeep'}); if ($sources.Count -ne 0) { throw 'unexpected committed source files present; audit before continuing' }; 'BLOCKED: no relay source files or DOM fixtures present under data/sources' | Set-Content -Encoding UTF8 .omo/evidence/fable-safe-work/task-2-blocked.txt"` exits 0.
  - [ ] Policy guard test passes: `powershell -NoProfile -Command "node --test backend/tests/source-download-cli.test.js backend/tests/kaaf-schedule-result-harvester.test.js backend/tests/kaaf-result-original-search.test.js *> .omo/evidence/fable-safe-work/task-2-source-tests.txt"` exits 0.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Local source state proves restoration is blocked
    Tool:     tmux
    Steps:    tmux new-session -d -s ulw-qa-source-audit "cd /d C:\Users\SAMSUNG\Documents\2026 첫프젝\2026-first-item-pr5-w1w4 && powershell -NoProfile -Command \"Get-ChildItem -Recurse -File data/sources,data/raw_duplicates | Select-Object FullName,Length | Format-Table -AutoSize\""; Start-Sleep -Seconds 3; tmux capture-pane -pS -200 -t ulw-qa-source-audit > .omo/evidence/fable-safe-work/task-2-source-audit-tmux.txt; tmux kill-session -t ulw-qa-source-audit
    Expected: transcript shows `data/sources\.gitkeep` only under `data/sources`; no relay source attachment/DOM fixture files are present.
    Evidence: .omo/evidence/fable-safe-work/task-2-source-audit-tmux.txt

  Scenario: Approved-source guardrails still pass
    Tool:     tmux
    Steps:    tmux new-session -d -s ulw-qa-source-tests "cd /d C:\Users\SAMSUNG\Documents\2026 첫프젝\2026-first-item-pr5-w1w4 && node --test backend/tests/source-download-cli.test.js backend/tests/kaaf-schedule-result-harvester.test.js backend/tests/kaaf-result-original-search.test.js"; poll until exit; tmux capture-pane -pS -500 -t ulw-qa-source-tests > .omo/evidence/fable-safe-work/task-2-source-tests-tmux.txt; tmux kill-session -t ulw-qa-source-tests
    Expected: transcript contains `# fail 0`.
    Evidence: .omo/evidence/fable-safe-work/task-2-source-tests-tmux.txt
  ```

  Commit: NO | Message: `docs(results): record relay restoration blockers` | Files: [`.omo/evidence/fable-safe-work/task-2-*` if evidence is committed by convention]

- [ ] 3. HTTP QA harness for held relay event endpoint

  What to do: Drive the actual Express server and prove the public event API returns hold metadata and zero public rows for a known held relay result file. This is immediate root work.
  Must NOT do: Do not assert only on internal files; do not use `--dry-run`; do not leave the server running.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [6, 7] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `src/server.js:149` - `/health` and `/api/health` expose readiness for QA.
  - Pattern:  `src/server.js:205` - card-studio public API is mounted at `/api/card-studio`.
  - Pattern:  `card-studio/routes/publicRoutes.js:558` - public result competition list endpoint.
  - Pattern:  `card-studio/routes/publicRoutes.js:585` - public result event endpoint delegates to `createResultEventsHandler`.
  - Pattern:  `card-studio/routes/resultEventsRoute.js:67` - held events are mapped through `mapHeldEvent`.
  - Pattern:  `card-studio/routes/resultEventsRoute.js:120` - event endpoint returns `{ success, data: { meta, events, totalEvents, totalAthletes } }`.
  - Pattern:  `card-studio/services/resultsStore.js:98` - synthetic filename is `<year>__<competitionId>.json`.
  - Test:     `backend/tests/relay-results-standard.test.js:42` - current test only checks source strings; HTTP QA closes the runtime gap.

  Acceptance criteria (agent-executable only):
  - [ ] API server starts: HTTP `GET /api/health` returns status 200 and JSON body with `"status":"healthy"`.
  - [ ] Held relay endpoint returns hold metadata: `GET /api/card-studio/results/2026__2026-road-005.json/events` body contains at least one event with `"qualityHold":true`, `"resultsStatus":"source_reverify_needed"`, `"heldResultCount">0`, `"results":[]`.
  - [ ] Held endpoint does not leak polluted names: response body does not contain `10:39`, `238:44`, or corrupted runner text from the relay incident sample.
  - [ ] Cleanup receipt confirms server PID is stopped and port is free.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: HTTP happy path shows held relay metadata
    Tool:     HTTP call
    Steps:    powershell -NoProfile -Command "New-Item -ItemType Directory -Force .omo/evidence/fable-safe-work | Out-Null; $env:PORT='5315'; $p=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput .omo/evidence/fable-safe-work/task-3-server.out -RedirectStandardError .omo/evidence/fable-safe-work/task-3-server.err; try { Start-Sleep -Seconds 5; curl.exe -i http://127.0.0.1:5315/api/health > .omo/evidence/fable-safe-work/task-3-health.txt; curl.exe -i http://127.0.0.1:5315/api/card-studio/results/2026__2026-road-005.json/events > .omo/evidence/fable-safe-work/task-3-held-event-http.txt; node -e \"const fs=require('fs'); const text=fs.readFileSync('.omo/evidence/fable-safe-work/task-3-held-event-http.txt','utf8'); const body=JSON.parse(text.slice(text.indexOf('{'))); const held=body.data.events.filter(e=>e.qualityHold===true); if(!held.length) throw new Error('no held relay event'); if(!held.some(e=>e.resultsStatus==='source_reverify_needed' && e.results.length===0 && e.heldResultCount>0)) throw new Error('bad hold shape'); if(/10:39|238:44/.test(JSON.stringify(body))) throw new Error('polluted relay text leaked');\" } finally { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue; 'cleanup: stopped PID '+$p.Id | Set-Content -Encoding UTF8 .omo/evidence/fable-safe-work/task-3-cleanup.txt }"
    Expected: health artifact includes `HTTP/1.1 200`; held-event artifact includes `HTTP/1.1 200`; node assertion exits 0; cleanup file exists.
    Evidence: .omo/evidence/fable-safe-work/task-3-held-event-http.txt

  Scenario: HTTP edge path rejects path traversal
    Tool:     HTTP call
    Steps:    powershell -NoProfile -Command "New-Item -ItemType Directory -Force .omo/evidence/fable-safe-work | Out-Null; $env:PORT='5316'; $p=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput .omo/evidence/fable-safe-work/task-3-server-edge.out -RedirectStandardError .omo/evidence/fable-safe-work/task-3-server-edge.err; try { Start-Sleep -Seconds 5; curl.exe -i 'http://127.0.0.1:5316/api/card-studio/results/..%2F2026.json/events' > .omo/evidence/fable-safe-work/task-3-path-traversal-http.txt } finally { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue; 'cleanup: stopped PID '+$p.Id | Set-Content -Encoding UTF8 .omo/evidence/fable-safe-work/task-3-edge-cleanup.txt }"
    Expected: artifact contains HTTP 400 or 404 and no file body; any HTTP 200 is FAIL.
    Evidence: .omo/evidence/fable-safe-work/task-3-path-traversal-http.txt
  ```

  Commit: NO | Message: `test(results): prove held relay event HTTP contract` | Files: [`backend/tests/relay-results-standard.test.js` only if Task 6 codifies the HTTP gap]

- [ ] 4. Browser QA harness for results tab hold copy

  What to do: Drive the real browser-facing page to verify the results tab renders the hold state instead of a corrupted row table. This is immediate root work.
  Must NOT do: Do not replace browser QA with API-only checks; do not accept a blank screenshot; do not leave server/Vite/Chrome contexts running.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [6, 7] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `frontend/src/pages/CompetitionsPage.tsx:5` - URL contract supports `?tab=schedule|results|search&comp=...`.
  - Pattern:  `frontend/src/pages/CompetitionsPage.tsx:78` - `ResultsTab` is rendered for `tab=results`.
  - Pattern:  `frontend/src/components/competitions/tabs/ResultsTab.tsx:48` - selected file loads through `getResultEvents`.
  - Pattern:  `frontend/src/components/competitions/tabs/ResultsTab.tsx:169` - events render through `ResultEventAccordion`.
  - Pattern:  `frontend/src/components/competitions/tabs/ResultEventAccordion.tsx:31` - UI detects `qualityHold` or `source_reverify_needed`.
  - Pattern:  `frontend/src/components/competitions/tabs/ResultEventAccordion.tsx:58` - held state renders the hold message instead of the results table.
  - API/Type: `frontend/src/api/competitions.ts:292` - `ResultEvent` includes hold fields.
  - Test:     `frontend/package.json:15` - frontend type check command.

  Acceptance criteria (agent-executable only):
  - [ ] Frontend type check passes: `powershell -NoProfile -Command "npm --prefix frontend run type-check *> .omo/evidence/fable-safe-work/task-4-type-check.txt"` exits 0.
  - [ ] Browser opens `http://127.0.0.1:5173/competitions?tab=results&comp=2026__2026-road-005.json`, expands all results, and screenshot shows hold copy.
  - [ ] Browser action log asserts page text contains the hold copy and does not contain `10:39` or `238:44`.
  - [ ] Cleanup receipt confirms API process, Vite process, and browser context are closed.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Browser results tab renders held relay copy
    Tool:     playwright(real Chrome)
    Steps:    powershell -NoProfile -Command "New-Item -ItemType Directory -Force .omo/evidence/fable-safe-work | Out-Null; $env:PORT='5317'; $api=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput .omo/evidence/fable-safe-work/task-4-api.out -RedirectStandardError .omo/evidence/fable-safe-work/task-4-api.err; $ui=Start-Process -FilePath npm -ArgumentList '--prefix','frontend','run','dev','--','--host','127.0.0.1','--port','5173' -PassThru -RedirectStandardOutput .omo/evidence/fable-safe-work/task-4-ui.out -RedirectStandardError .omo/evidence/fable-safe-work/task-4-ui.err; try { Start-Sleep -Seconds 8; node -e \"const { chromium } = require('playwright'); (async()=>{ const browser=await chromium.launch({channel:'chrome'}); const page=await browser.newPage({viewport:{width:1366,height:900}}); const errors=[]; page.on('console', msg=>{ if(msg.type()==='error') errors.push(msg.text()) }); await page.goto('http://127.0.0.1:5173/competitions?tab=results&comp=2026__2026-road-005.json',{waitUntil:'networkidle'}); await page.getByText(/경기 결과|결과/).first().waitFor({timeout:15000}); await page.getByRole('button', { name: /전체|펼치|Expand/i }).click().catch(async()=>{ const buttons=await page.locator('button').all(); for (const b of buttons.slice(0,8)) await b.click().catch(()=>{}); }); const body=await page.locator('body').innerText(); if(!/기록|확인|정리|source_reverify_needed/.test(body)) throw new Error('hold copy missing'); if(/10:39|238:44/.test(body)) throw new Error('polluted relay text visible'); await page.screenshot({path:'.omo/evidence/fable-safe-work/task-4-browser-held-relay.png', fullPage:true}); require('fs').writeFileSync('.omo/evidence/fable-safe-work/task-4-browser-log.json', JSON.stringify({errors, bodyLength: body.length, url: page.url()}, null, 2)); await browser.close(); })()\" } finally { Stop-Process -Id $ui.Id -Force -ErrorAction SilentlyContinue; Stop-Process -Id $api.Id -Force -ErrorAction SilentlyContinue; 'cleanup: stopped api '+$api.Id+' ui '+$ui.Id | Set-Content -Encoding UTF8 .omo/evidence/fable-safe-work/task-4-cleanup.txt }"
    Expected: screenshot exists and is nonblank; log JSON has empty `errors`; command exits 0.
    Evidence: .omo/evidence/fable-safe-work/task-4-browser-held-relay.png and .omo/evidence/fable-safe-work/task-4-browser-log.json

  Scenario: Browser malformed result file stays graceful
    Tool:     playwright(real Chrome)
    Steps:    powershell -NoProfile -Command "New-Item -ItemType Directory -Force .omo/evidence/fable-safe-work | Out-Null; $env:PORT='5318'; $api=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -RedirectStandardOutput .omo/evidence/fable-safe-work/task-4-api-edge.out -RedirectStandardError .omo/evidence/fable-safe-work/task-4-api-edge.err; $ui=Start-Process -FilePath npm -ArgumentList '--prefix','frontend','run','dev','--','--host','127.0.0.1','--port','5174' -PassThru -RedirectStandardOutput .omo/evidence/fable-safe-work/task-4-ui-edge.out -RedirectStandardError .omo/evidence/fable-safe-work/task-4-ui-edge.err; try { Start-Sleep -Seconds 8; node -e \"const { chromium } = require('playwright'); (async()=>{ const browser=await chromium.launch({channel:'chrome'}); const page=await browser.newPage({viewport:{width:390,height:844}}); const errors=[]; page.on('pageerror', e=>errors.push(e.message)); await page.goto('http://127.0.0.1:5174/competitions?tab=results&comp=missing-file.json',{waitUntil:'networkidle'}); await page.screenshot({path:'.omo/evidence/fable-safe-work/task-4-browser-missing-file.png', fullPage:true}); require('fs').writeFileSync('.omo/evidence/fable-safe-work/task-4-browser-missing-file.json', JSON.stringify({errors, body:(await page.locator('body').innerText()).slice(0,1000)}, null, 2)); await browser.close(); })()\" } finally { Stop-Process -Id $ui.Id -Force -ErrorAction SilentlyContinue; Stop-Process -Id $api.Id -Force -ErrorAction SilentlyContinue; 'cleanup: stopped api '+$api.Id+' ui '+$ui.Id | Set-Content -Encoding UTF8 .omo/evidence/fable-safe-work/task-4-edge-cleanup.txt }"
    Expected: screenshot exists; log JSON has no page errors; UI remains navigable rather than blank.
    Evidence: .omo/evidence/fable-safe-work/task-4-browser-missing-file.png
  ```

  Commit: NO | Message: `test(results): verify relay hold browser flow` | Files: [`frontend/src/components/competitions/tabs/ResultEventAccordion.tsx`, `backend/tests/athlete-user-ux.test.js` only if Task 6 exposes a real UI gap]

- [ ] 5. Test-gap review for dynamic relay API/search contracts

  What to do: Review whether current `backend/tests/relay-results-standard.test.js` relies too much on static source matching. Add a red test only for an observable gap: route handler mapping, search de-indexing, or scraper branch ordering. This is immediate root work; production changes are only allowed if the new test fails for the right reason.
  Must NOT do: Do not add brittle exact-string snapshots of Korean copy; assert structured fields and absence of polluted patterns.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [6] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Test:     `backend/tests/relay-results-standard.test.js:42` - current backend exposure test is source-string based.
  - Test:     `backend/tests/relay-results-standard.test.js:54` - current search test is source-string based.
  - Pattern:  `card-studio/routes/resultEventsRoute.js:25` - `mapHeldEvent` emits the runtime hold shape.
  - Pattern:  `card-studio/routes/resultEventsRoute.js:67` - `mapVisibleEvent` switches held events before row mapping.
  - Pattern:  `card-studio/services/searchService.js:134` - search skips held events.
  - Pattern:  `card-studio/services/searchService.js:142` - search filters unverified/polluted rows.
  - Pattern:  `card-studio/services/relayResultQualityService.js:20` - polluted text is detected in name/team/affiliation/note.

  Acceptance criteria (agent-executable only):
  - [ ] Review note exists: `powershell -NoProfile -Command "Set-Content -Encoding UTF8 .omo/evidence/fable-safe-work/task-5-test-gap-review.md '<executor writes findings here>'"` with findings on static-vs-runtime test coverage.
  - [ ] If a runtime gap is found, RED is captured before production edits: `node --test backend/tests/relay-results-standard.test.js --test-name-pattern "held relay"` fails for a structured assertion, not syntax/import.
  - [ ] If no production gap is found, no source changes are made and Task 6 is marked no-op with evidence.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Search de-indexing is proven from runtime service output
    Tool:     tmux
    Steps:    tmux new-session -d -s ulw-qa-search-held "cd /d C:\Users\SAMSUNG\Documents\2026 첫프젝\2026-first-item-pr5-w1w4 && node -e \"const search=require('./card-studio/services/searchService'); const out=search.search('10:39'); console.log(JSON.stringify({sections: out.sections?.length || 0, raw: out}, null, 2)); if(JSON.stringify(out).includes('238:44')) process.exit(1);\""; Start-Sleep -Seconds 5; tmux capture-pane -pS -300 -t ulw-qa-search-held > .omo/evidence/fable-safe-work/task-5-search-held-tmux.txt; tmux kill-session -t ulw-qa-search-held
    Expected: transcript exits 0 and does not contain polluted relay text such as `238:44`.
    Evidence: .omo/evidence/fable-safe-work/task-5-search-held-tmux.txt

  Scenario: Static-only test gap is documented before changes
    Tool:     tmux
    Steps:    tmux new-session -d -s ulw-qa-test-gap "cd /d C:\Users\SAMSUNG\Documents\2026 첫프젝\2026-first-item-pr5-w1w4 && powershell -NoProfile -Command \"rg -n 'readText|assert.match|createResultEventsHandler|search\\(' backend/tests/relay-results-standard.test.js card-studio/routes/resultEventsRoute.js card-studio/services/searchService.js\""; Start-Sleep -Seconds 3; tmux capture-pane -pS -300 -t ulw-qa-test-gap > .omo/evidence/fable-safe-work/task-5-test-gap-tmux.txt; tmux kill-session -t ulw-qa-test-gap
    Expected: transcript identifies current static assertions and runtime functions to cover.
    Evidence: .omo/evidence/fable-safe-work/task-5-test-gap-tmux.txt
  ```

  Commit: NO | Message: `test(results): cover held relay runtime contracts` | Files: [`backend/tests/relay-results-standard.test.js` if new tests are added]

- [ ] 6. TDD minimal hardening for any red API/search/UI contract gap

  What to do: Execute only if Tasks 3-5 expose a real failing observable. Write the failing test first, capture RED, make the smallest production/test change, capture GREEN, then rerun Task 3 and Task 4 QA. If Tasks 3-5 pass, mark this task no-op.
  Must NOT do: Do not change year data or restore rows; do not refactor broad modules; do not normalize copy unless a failing test proves user-facing breakage.

  Parallelization: Can parallel: YES | Wave 2 | Blocks: [8] | Blocked by: [3, 4, 5]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `card-studio/services/relayResultQualityService.js:36` - single source for hold transformation.
  - Pattern:  `card-studio/routes/resultEventsRoute.js:86` - route handler injection point can be tested without starting the full server.
  - Pattern:  `card-studio/services/resultsStore.js:110` - data adapter applies `holdUnsafeRelayEvents`.
  - Pattern:  `frontend/src/api/competitions.ts:292` - frontend event type includes hold fields.
  - Pattern:  `frontend/src/components/competitions/tabs/ResultEventAccordion.tsx:58` - UI hold branch.
  - Test:     `backend/tests/relay-results-standard.test.js:17` - keep Given/When/Then naming.
  - External: `https://github.com/nodejs/node/blob/main/doc/api/test.md` - use explicit `node --test <file>`.

  Acceptance criteria (agent-executable only):
  - [ ] RED evidence exists if code changes: `.omo/evidence/fable-safe-work/task-6-red.txt` contains failing `node --test` output for the exact new assertion.
  - [ ] GREEN evidence exists if code changes: `.omo/evidence/fable-safe-work/task-6-green.txt` contains passing targeted test output.
  - [ ] Changed JS/TS files pass syntax/type checks: `node --check <changed .js files>` and `npm --prefix frontend run type-check` if frontend changed.
  - [ ] Task 3 HTTP QA and Task 4 browser QA are rerun after any production change with fresh artifacts suffixed `-postfix`.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Production gap fixed through red-green
    Tool:     tmux
    Steps:    If Task 5 found a gap, run `tmux new-session -d -s ulw-qa-task6-green "cd /d C:\Users\SAMSUNG\Documents\2026 첫프젝\2026-first-item-pr5-w1w4 && node --test backend/tests/relay-results-standard.test.js"` after the minimal fix; capture pane to .omo/evidence/fable-safe-work/task-6-green-tmux.txt; kill the session.
    Expected: transcript contains `# fail 0`; RED and GREEN files both exist if any production file changed.
    Evidence: .omo/evidence/fable-safe-work/task-6-green-tmux.txt

  Scenario: No-op path remains safe
    Tool:     tmux
    Steps:    If Tasks 3-5 found no production gap, run `tmux new-session -d -s ulw-qa-task6-noop "cd /d C:\Users\SAMSUNG\Documents\2026 첫프젝\2026-first-item-pr5-w1w4 && git diff --name-only"`; capture pane to .omo/evidence/fable-safe-work/task-6-noop-diff.txt; kill the session.
    Expected: artifact is empty or lists only intentional plan/evidence files; no product source changes.
    Evidence: .omo/evidence/fable-safe-work/task-6-noop-diff.txt
  ```

  Commit: YES if code/tests changed, otherwise NO | Message: `test(results): cover held relay runtime contracts` | Files: [`backend/tests/relay-results-standard.test.js`, `card-studio/routes/resultEventsRoute.js`, `card-studio/services/searchService.js`, `frontend/src/components/competitions/tabs/ResultEventAccordion.tsx` only as proven by RED]

- [ ] 7. Fable handoff packet and blocked-work list

  What to do: Produce the handoff text Fable/root can use immediately: what is verified, what is safe to continue, what is blocked, and exact required source artifacts for restoration. This is immediate root work.
  Must NOT do: Do not ask Fable for broad review without listing concrete blockers; do not claim restoration complete.

  Parallelization: Can parallel: YES | Wave 2 | Blocks: [8] | Blocked by: [1, 2, 3, 4]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `docs/athletetime-relay-results-standardization.md:45` - validator covers 25 public competitions.
  - Pattern:  `docs/athletetime-relay-results-standardization.md:90` - uncertain rows should be preserved as `parseStatus: "unverified"` rather than invented.
  - Pattern:  `docs/athletetime-relay-results-standardization.md:102` - restoration requires original source files/pages.
  - Pattern:  `docs/athletetime-relay-results-standardization.md:114` - completion requires validator and tests.
  - Pattern:  `backend/tests/kaaf-schedule-result-harvester.test.js:27` - allowed source class is KAAF public schedule result attachments.
  - Pattern:  `card-studio/services/kaafResultOriginalSearchService.js:105` - originals can be searched by metadata/content without exposing raw body.

  Acceptance criteria (agent-executable only):
  - [ ] Handoff exists at `.omo/evidence/fable-safe-work/task-7-fable-handoff.md`.
  - [ ] Handoff includes "Immediate root work done/available", "Blocked until Fable/source files", "Do not fabricate", and "Manual QA evidence paths" headings.
  - [ ] Handoff lists required source artifacts: original KAAF result file/page for each held relay competition, DOM fixture with rowspan/colspan if parser restoration is attempted, expected parsed relay schema sample, and Fable review decision.
  - [ ] Handoff includes exact commands from Tasks 1, 3, and 4.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Handoff contains all blockers and evidence paths
    Tool:     tmux
    Steps:    tmux new-session -d -s ulw-qa-handoff-scan "cd /d C:\Users\SAMSUNG\Documents\2026 첫프젝\2026-first-item-pr5-w1w4 && powershell -NoProfile -Command \"rg -n 'Immediate root work|Blocked until Fable|Do not fabricate|Manual QA evidence|source files|DOM fixture|task-1-validator|task-3-held-event|task-4-browser' .omo/evidence/fable-safe-work/task-7-fable-handoff.md\""; Start-Sleep -Seconds 3; tmux capture-pane -pS -300 -t ulw-qa-handoff-scan > .omo/evidence/fable-safe-work/task-7-handoff-scan.txt; tmux kill-session -t ulw-qa-handoff-scan
    Expected: every required heading/evidence marker has at least one hit.
    Evidence: .omo/evidence/fable-safe-work/task-7-handoff-scan.txt

  Scenario: Handoff did not modify protected data
    Tool:     tmux
    Steps:    tmux new-session -d -s ulw-qa-data-diff "cd /d C:\Users\SAMSUNG\Documents\2026 첫프젝\2026-first-item-pr5-w1w4 && powershell -NoProfile -Command \"git diff --name-only -- data/results data/sources data/raw_duplicates scripts/hold-relay-results-for-reverify.js\""; Start-Sleep -Seconds 3; tmux capture-pane -pS -200 -t ulw-qa-data-diff > .omo/evidence/fable-safe-work/task-7-data-diff.txt; tmux kill-session -t ulw-qa-data-diff
    Expected: artifact is empty unless Task 6 had a proven hold-regression fix; any data/results change without RED evidence is FAIL.
    Evidence: .omo/evidence/fable-safe-work/task-7-data-diff.txt
  ```

  Commit: YES if handoff/evidence is committed by convention, otherwise NO | Message: `docs(results): hand off relay restoration blockers` | Files: [`.omo/evidence/fable-safe-work/task-7-fable-handoff.md`]

- [ ] 8. Final verification and commit preparation

  What to do: Run final gates, prepare atomic commit instructions, and surface anything still blocked. This is root work after all immediate tasks.
  Must NOT do: Do not declare complete until F1-F4 approve; do not auto-commit unless explicitly authorized.

  Parallelization: Can parallel: NO | Wave 3 | Blocks: [] | Blocked by: [1, 6, 7]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `package.json:16` - full backend test command.
  - Pattern:  `frontend/package.json:15` - frontend type check command.
  - Pattern:  `scripts/validate-relay-results.js:143` - validator exit code is 0 only when violations are 0.
  - Pattern:  `docs/athletetime-relay-results-standardization.md:118` - final relay standardization gate includes `npm test` and frontend build.
  - Project rule: no `git add .`; stage exact paths only after review.

  Acceptance criteria (agent-executable only):
  - [ ] `node scripts/validate-relay-results.js --json` exits 0 and matches 25/0.
  - [ ] `node --test backend/tests/relay-results-standard.test.js` exits 0.
  - [ ] `npm test` exits 0.
  - [ ] `npm --prefix frontend run type-check` exits 0.
  - [ ] `git diff --check` exits 0.
  - [ ] `git status --short` shows only intentional plan/evidence/test/source changes.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: Final command gate
    Tool:     tmux
    Steps:    tmux new-session -d -s ulw-qa-final-gate "cd /d C:\Users\SAMSUNG\Documents\2026 첫프젝\2026-first-item-pr5-w1w4 && powershell -NoProfile -Command \"node scripts/validate-relay-results.js --json; node --test backend/tests/relay-results-standard.test.js; npm test; npm --prefix frontend run type-check; git diff --check\""; poll until exit; tmux capture-pane -pS -1000 -t ulw-qa-final-gate > .omo/evidence/fable-safe-work/task-8-final-gate.txt; tmux kill-session -t ulw-qa-final-gate
    Expected: transcript contains no failing command; `node:test` sections show `# fail 0`.
    Evidence: .omo/evidence/fable-safe-work/task-8-final-gate.txt

  Scenario: Commit scope is exact, not blanket staged
    Tool:     tmux
    Steps:    tmux new-session -d -s ulw-qa-final-status "cd /d C:\Users\SAMSUNG\Documents\2026 첫프젝\2026-first-item-pr5-w1w4 && powershell -NoProfile -Command \"git status --short; git diff --name-only; git diff --cached --name-only\""; Start-Sleep -Seconds 3; tmux capture-pane -pS -300 -t ulw-qa-final-status > .omo/evidence/fable-safe-work/task-8-final-status.txt; tmux kill-session -t ulw-qa-final-status
    Expected: status lists only intentional files; cached list is empty unless the executor intentionally staged exact files after review.
    Evidence: .omo/evidence/fable-safe-work/task-8-final-status.txt
  ```

  Commit: YES only if Task 6 or Task 7 produced commit-worthy changes | Message: `test(results): verify relay hold before restoration` | Files: [exact changed tests/docs/evidence only; never `git add .`]

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
- Reference the plan file path in the final commit footer: `Plan: .omo/plans/remaining-safe-work-before-fable.md`.
- Do not auto-commit unless the user explicitly authorizes it. Stage exact paths only, never `git add .`.

## Success criteria
- All immediate root work is executable without Fable: baseline validator/tests, source audit, HTTP QA, browser QA, and Fable handoff packet.
- All blocked work is explicitly blocked until original KAAF source files/DOM fixtures and Fable review are available.
- No data fabrication, no blocked scraping, no broad staging, and no unrelated reversions.
- All QA scenarios pass with captured evidence under `.omo/evidence/fable-safe-work/`.
