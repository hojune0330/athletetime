# AthleteTime KAAF Backfill Service Readiness

## TL;DR
> Summary:      Make the supplied 2005-2017 KAAF originals backup process service-ready without exposing raw originals, keep TOP100 rows as candidate records, and verify current collected results still work through the public search/API surfaces.
> Deliverables:
> - Private archive import and reconciliation workflow for `C:/Users/SAMSUNG/Downloads/kaaf_backfill_originals_2005-2017_2026-07-08.tar.gz`
> - Raw-original protection scanner and audit evidence
> - TOP100 candidate search/API readiness with provenance and no official-claim promotion
> - Current collected records API regression coverage
> - Source-readiness summary endpoint, frontend source labels, runbook, npm scripts, and QA harness
> Effort:       Large
> Risk:         High - raw-file leakage, TOP100/official-result conflation, archive count mismatch (archive listing found 428 files while legacy evidence says 396), legacy Office/HWP parsing, and public search/API regressions.

## Scope
### Must have
- Process the supplied archive only into ignored private storage under `data/sources/import/originals/<batch>/`; never commit extracted `.xls`, `.xlsx`, `.pdf`, or `.hwp` originals.
- Generate a manifest and report with file count, year buckets, extension buckets, byte size, sha256, original filename, private storage path, and explicit comparison against the existing legacy manifest.
- Preserve and explain the count mismatch: the supplied archive listing produced 428 files (335 `.xls`, 37 `.xlsx`, 39 `.pdf`, 17 `.hwp`) across 2005-2017, while `.omo/evidence/legacy-results-normalization/legacy-kaaf-results-2000-2017-20260707-manifest.json` reports 396 downloaded files.
- Keep TOP100 data separate from `data/results`; it remains `sourceType: public_top_record_candidate`, `sourceTier: B`, and `reviewStatus: needs_external_confirmation`.
- Ensure TOP100 athlete search works through the existing analytics route and UI, including English-name search for `KIM KUKYOUNG`.
- Ensure current collected records from `data/results/<year>.json` continue to work through `/api/card-studio/results/competitions`, `/api/card-studio/results/:filename/events`, and `/api/card-studio/analytics/season-records`.
- Add explicit RED/GREEN tests before each production change, using Node's built-in test runner and frontend type/build checks where UI contracts change.
- Add exact HTTP, CLI, and browser QA commands that write evidence under `.omo/evidence/task-<N>-<slug>.*`.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- Do not commit extracted raw originals or copy them into `data/results`, `data/manual`, `frontend/public`, `community`, or any statically served directory.
- Do not add a public API that streams, downloads, previews, or reveals raw original file bodies.
- Do not store or expose `PERSON_NO`, birth date, contact, address, phone, resident identifiers, raw request bodies, or raw file bodies.
- Do not treat TOP100 as full competition result coverage or an official certification source.
- Do not bypass existing suppression, relay/quality-hold, blocked-host, rate-limit, or data-rights policies.
- Do not scrape or download from `result.kaaf.or.kr`; the archive is user-supplied and the plan should only process that local tarball.
- Do not delete, rewrite, or normalize originals in place; import copies are immutable backup artifacts.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: TDD + Node `node --test`, frontend `npm --prefix frontend run type-check`, frontend `npm --prefix frontend run build`, and task-specific Playwright scripts.
- QA policy: every task has agent-executed scenarios.
- Evidence: `.omo/evidence/task-<N>-<slug>.<ext>`

## Execution strategy
### Parallel execution waves
> Target 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks to maximize parallelism.

Wave 1 (no dependencies):
- Task 1: Add private backfill archive import service and CLI
- Task 2: Add raw-original protection scanner and leak tests
- Task 3: Harden TOP100 candidate analytics contract
- Task 4: Harden current collected-records API contract
- Task 5: Add operator runbook skeleton and doc contract tests

Wave 2 (after Wave 1):
- Task 6: Add source-readiness summary API, depends [1, 3, 4]
- Task 7: Add frontend source status labels and type coverage, depends [3, 6]
- Task 8: Add npm scripts and evidence command wrappers, depends [1, 2, 5, 6]

Wave 3 (after Wave 2):
- Task 9: Add full KAAF readiness QA harness, depends [1, 2, 3, 4, 6, 7, 8]

Critical path: Task 1 -> Task 6 -> Task 8 -> Task 9

### Dependency matrix
| Task | Depends on | Blocks | Can parallelize with |
|------|------------|--------|----------------------|
| 1    | none       | 6, 8, 9 | 2, 3, 4, 5 |
| 2    | none       | 8, 9 | 1, 3, 4, 5 |
| 3    | none       | 6, 7, 9 | 1, 2, 4, 5 |
| 4    | none       | 6, 9 | 1, 2, 3, 5 |
| 5    | none       | 8 | 1, 2, 3, 4 |
| 6    | 1, 3, 4 | 7, 8, 9 | 8 after Task 8 deps complete |
| 7    | 3, 6 | 9 | 8 |
| 8    | 1, 2, 5, 6 | 9 | 7 |
| 9    | 1, 2, 3, 4, 6, 7, 8 | final verification | none |

## Todos
> Implementation + Test = ONE task. Never separate.
> Every task MUST have: References + Acceptance Criteria + QA Scenarios + Commit.

- [ ] 1. Add private backfill archive import service and CLI

  What to do: Write RED tests first in `backend/tests/kaaf-backfill-originals-import.test.js` for `BACKFILL-IMPORT-001`, `BACKFILL-IMPORT-002`, and `BACKFILL-IMPORT-003`. Implement `card-studio/services/kaafBackfillOriginalsService.js` and `tools/import-kaaf-backfill-originals.js`. The service must safely inspect and extract `.tar.gz` entries, reject path traversal, copy only under `data/sources/import/originals/<batch>/`, compute sha256/file size/extension/year buckets, write manifest/report artifacts, and return JSON suitable for scripts. Default batch: `20260708-kaaf-backfill-2005-2017`.
  Must NOT do: Do not write extracted files outside `data/sources/import/originals`; do not write raw bodies to JSON; do not mutate `data/results`; do not normalize original filenames destructively.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [6, 8, 9] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `card-studio/services/sourceDownloadService.js:13` - existing private original storage default is `data/sources/import/originals`.
  - Pattern:  `card-studio/services/sourceDownloadService.js:112` - follow path resolution and root-escape checks.
  - Pattern:  `card-studio/services/sourceDownloadService.js:130` - follow metadata persistence shape for downloaded originals.
  - Pattern:  `card-studio/services/sourceLedgerService.js:21` - download sources require original filenames and must strip raw body fields.
  - Pattern:  `backend/tests/kaaf-schedule-result-harvester.test.js:117` - manifest tests assert file bytes, sha256, and no raw body.
  - Pattern:  `.gitignore:56` - originals path is intentionally git-ignored.
  - Pattern:  `WORKFLOW.md:29` - repo policy says raw KAAF originals must stay local/private.
  - API/Type: `tools/import-kaaf-top100-batch.js:159` - CLI argument parsing and JSON output pattern.
  - Test:     `backend/tests/source-download-cli.test.js:56` - CLI JSON success and failure pattern.
  - External: `https://github.com/nodejs/node/blob/main/doc/api/test.md` - Node built-in `node --test` runner.

  Acceptance criteria (agent-executable only):
  - [ ] RED captured before implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'BACKFILL-IMPORT' backend/tests/kaaf-backfill-originals-import.test.js *> .omo/evidence/task-1-backfill-import-red.txt; if ($LASTEXITCODE -eq 0) { exit 1 }"`
  - [ ] GREEN captured after implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'BACKFILL-IMPORT' backend/tests/kaaf-backfill-originals-import.test.js *> .omo/evidence/task-1-backfill-import-green.txt; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"`
  - [ ] Actual archive import succeeds: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; $json = node tools/import-kaaf-backfill-originals.js --archive 'C:/Users/SAMSUNG/Downloads/kaaf_backfill_originals_2005-2017_2026-07-08.tar.gz' --batch 20260708-kaaf-backfill-2005-2017 --storage-root data/sources/import/originals --report-dir .omo/evidence/task-1-backfill-import --json | Tee-Object .omo/evidence/task-1-backfill-import.json | ConvertFrom-Json; if (!$json.ok -or $json.archiveFileCount -ne 428 -or $json.extensions.'.xls' -ne 335 -or $json.extensions.'.xlsx' -ne 37 -or $json.extensions.'.pdf' -ne 39 -or $json.extensions.'.hwp' -ne 17) { exit 1 }"`
  - [ ] Git never tracks originals: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; $tracked = git ls-files data/sources/import/originals; $tracked | Tee-Object .omo/evidence/task-1-git-originals.txt; if ($tracked) { exit 1 }"`

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: Actual supplied archive imports to ignored private storage
    Tool:     powershell
    Steps:    cd C:/Users/SAMSUNG/Documents/GitHub/athletetime; node tools/import-kaaf-backfill-originals.js --archive C:/Users/SAMSUNG/Downloads/kaaf_backfill_originals_2005-2017_2026-07-08.tar.gz --batch 20260708-kaaf-backfill-2005-2017 --storage-root data/sources/import/originals --report-dir .omo/evidence/task-1-backfill-import --json > .omo/evidence/task-1-backfill-import.json
    Expected: JSON has ok=true, archiveFileCount=428, years 2005..2017, extensions .xls=335/.xlsx=37/.pdf=39/.hwp=17, and every privateStoragePath starts with data/sources/import/originals/20260708-kaaf-backfill-2005-2017/
    Evidence: .omo/evidence/task-1-backfill-import.json

  Scenario: Missing archive fails with typed error
    Tool:     powershell
    Steps:    cd C:/Users/SAMSUNG/Documents/GitHub/athletetime; node tools/import-kaaf-backfill-originals.js --archive C:/missing-kaaf-backfill.tar.gz --batch bad --json > .omo/evidence/task-1-backfill-import-error.json; if ($LASTEXITCODE -eq 0) { exit 1 }
    Expected: JSON has ok=false and error.code=BACKFILL_ARCHIVE_NOT_FOUND
    Evidence: .omo/evidence/task-1-backfill-import-error.json
  ```

  Commit: YES | Message: `feat(data): import kaaf backfill originals privately` | Files: [backend/tests/kaaf-backfill-originals-import.test.js, card-studio/services/kaafBackfillOriginalsService.js, tools/import-kaaf-backfill-originals.js]

- [ ] 2. Add raw-original protection scanner and leak tests

  What to do: Write RED tests first in `backend/tests/raw-original-protection.test.js` for `RAW-PROTECT-001`, `RAW-PROTECT-002`, and `RAW-PROTECT-003`. Implement `tools/assert-raw-originals-private.js` and any small helper needed in `card-studio/services/rawOriginalProtectionService.js`. The scanner must verify no raw originals are tracked by git, no manifests include raw body fields, extracted original paths stay under the private root, and server/static config does not publish `data/sources/import/originals`.
  Must NOT do: Do not loosen `.gitignore`; do not add static serving for `data`; do not consider "raw originals private" true if the scanner cannot inspect the manifest.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [8, 9] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `.gitignore:56` - raw originals are excluded from git tracking.
  - Pattern:  `src/server.js:118` - server static mounts are explicit and should not include `data`.
  - Pattern:  `src/server.js:140` - SPA static directory is `community`, not `data`.
  - Pattern:  `card-studio/services/sourceLedgerService.js:22` - raw body field names already forbidden in source ledger.
  - Pattern:  `card-studio/services/sourceLedgerService.js:98` - restricted field scanner pattern.
  - Pattern:  `card-studio/services/sourceLedgerService.js:103` - sanitize raw body fields by deletion.
  - Test:     `backend/tests/source-download.test.js:73` - existing private storage root assertion.
  - Test:     `backend/tests/source-download.test.js:122` - existing raw body absence assertion.
  - External: `https://github.com/nodejs/node/blob/main/doc/api/test.md` - Node built-in `node --test` runner.

  Acceptance criteria (agent-executable only):
  - [ ] RED captured before implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'RAW-PROTECT' backend/tests/raw-original-protection.test.js *> .omo/evidence/task-2-raw-protection-red.txt; if ($LASTEXITCODE -eq 0) { exit 1 }"`
  - [ ] GREEN captured after implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'RAW-PROTECT' backend/tests/raw-original-protection.test.js *> .omo/evidence/task-2-raw-protection-green.txt; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"`
  - [ ] Scanner passes current repo: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node tools/assert-raw-originals-private.js --manifest .omo/evidence/task-1-backfill-import/manifest.json --json | Tee-Object .omo/evidence/task-2-raw-protection.json | ConvertFrom-Json | % { if (!$_.ok) { exit 1 } }"`
  - [ ] Scanner detects a raw body fixture: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; Set-Content .omo/evidence/task-2-bad-manifest.json '{\"files\":[{\"privateStoragePath\":\"data/sources/import/originals/x.xls\",\"rawFileBody\":\"abc\"}]}'; node tools/assert-raw-originals-private.js --manifest .omo/evidence/task-2-bad-manifest.json --json > .omo/evidence/task-2-raw-protection-error.json; if ($LASTEXITCODE -eq 0) { exit 1 }"`

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: Scanner approves private originals after archive import
    Tool:     powershell
    Steps:    cd C:/Users/SAMSUNG/Documents/GitHub/athletetime; node tools/assert-raw-originals-private.js --manifest .omo/evidence/task-1-backfill-import/manifest.json --json > .omo/evidence/task-2-raw-protection.json
    Expected: JSON has ok=true, trackedOriginalCount=0, staticExposure=false, rawBodyHits=[]
    Evidence: .omo/evidence/task-2-raw-protection.json

  Scenario: Scanner rejects manifest with raw file body
    Tool:     powershell
    Steps:    cd C:/Users/SAMSUNG/Documents/GitHub/athletetime; Set-Content .omo/evidence/task-2-bad-manifest.json '{"files":[{"privateStoragePath":"data/sources/import/originals/x.xls","rawFileBody":"abc"}]}'; node tools/assert-raw-originals-private.js --manifest .omo/evidence/task-2-bad-manifest.json --json > .omo/evidence/task-2-raw-protection-error.json; if ($LASTEXITCODE -eq 0) { exit 1 }
    Expected: JSON has ok=false and error.code=RAW_ORIGINAL_BODY_EXPOSED
    Evidence: .omo/evidence/task-2-raw-protection-error.json
  ```

  Commit: YES | Message: `test(data): guard kaaf raw originals from exposure` | Files: [backend/tests/raw-original-protection.test.js, card-studio/services/rawOriginalProtectionService.js, tools/assert-raw-originals-private.js]

- [ ] 3. Harden TOP100 candidate analytics contract

  What to do: Extend `backend/tests/manual-top-records-ingest.test.js` with RED tests `TOP100-SERVICE-001` through `TOP100-SERVICE-005`. Then adjust `manualTopRecordsService`, `recordAnalyticsService`, or `tools/import-kaaf-top100-batch.js` only as needed. Lock these contracts: count summary stays 24,630/16,885/7,745; restricted identifiers stay absent; team/relay rows stay held; English and Korean search reach candidate rows; candidate rows keep `public_top_record_candidate`, `sourceTier: B`, `reviewStatus: needs_external_confirmation`, and source URL/batch provenance.
  Must NOT do: Do not move TOP100 into `data/results`; do not mark candidate rows as official; do not index relay/team rows into athlete search.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [6, 7, 9] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `data/manual/kaaf-top100/20260708-kaaf-top100-summary.json:1` - current TOP100 batch summary and counts.
  - Pattern:  `data/manual/kaaf-top100/20260708-kaaf-top100-review.md:13` - operating rule says candidate batch, not full result dump.
  - Pattern:  `docs/athletetime-manual-top100-ingest-handoff.md:20` - safety rules and no restricted identifiers.
  - Pattern:  `card-studio/services/manualTopRecordsService.js:8` - TOP100 data directory.
  - Pattern:  `card-studio/services/manualTopRecordsService.js:68` - list only `indexable_candidate` records.
  - Pattern:  `tools/import-kaaf-top100-batch.js:13` - safe key allowlist for manual candidate output.
  - Pattern:  `tools/import-kaaf-top100-batch.js:87` - indexability excludes team events, blank names, blank marks, and blank dates.
  - Pattern:  `card-studio/services/recordAnalyticsService.js:421` - TOP100 candidate conversion to analytics record.
  - Pattern:  `card-studio/services/recordAnalyticsService.js:473` - public candidate provenance fields.
  - Pattern:  `card-studio/services/recordAnalyticsService.js:829` - public record shape includes `source`.
  - Test:     `backend/tests/manual-top-records-ingest.test.js:12` - current count and sensitive-scan tests.
  - Test:     `backend/tests/manual-top-records-ingest.test.js:41` - current service search test.
  - External: `https://github.com/nodejs/node/blob/main/doc/api/test.md` - Node built-in `node --test` runner.

  Acceptance criteria (agent-executable only):
  - [ ] RED captured before implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'TOP100-SERVICE' backend/tests/manual-top-records-ingest.test.js *> .omo/evidence/task-3-top100-red.txt; if ($LASTEXITCODE -eq 0) { exit 1 }"`
  - [ ] GREEN captured after implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'TOP100-SERVICE|manual TOP100' backend/tests/manual-top-records-ingest.test.js *> .omo/evidence/task-3-top100-green.txt; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"`
  - [ ] No restricted keys in committed TOP100 output: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; Select-String -Path data/manual/kaaf-top100/20260708-kaaf-top100-records.jsonl -Pattern 'PERSON_NO|person_no|birthDate|birthdate|resident|phone|email|contact|address' -CaseSensitive:$false | Tee-Object .omo/evidence/task-3-top100-sensitive-scan.txt; if ($LASTEXITCODE -eq 0 -and (Get-Content .omo/evidence/task-3-top100-sensitive-scan.txt)) { exit 1 }"`
  - [ ] Analytics warmup includes TOP100 without throwing: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node -e \"const s=require('./card-studio/services/recordAnalyticsService'); const stats=s.warmup(); console.log(JSON.stringify(stats)); if(!stats.records||!stats.athletes) process.exit(1)\" *> .omo/evidence/task-3-top100-warmup.txt"`

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: TOP100 English-name search returns candidate provenance
    Tool:     curl
    Steps:    Start server with `powershell -NoProfile -Command "cd C:/Users/SAMSUNG/Documents/GitHub/athletetime; $p=Start-Process node -ArgumentList 'src/server.js' -PassThru -WindowStyle Hidden; Start-Sleep 4; curl.exe -i 'http://127.0.0.1:3000/api/card-studio/analytics/records/search?q=KIM%20KUKYOUNG&limit=3' > .omo/evidence/task-3-top100-http.txt; Stop-Process -Id $p.Id -Force"`
    Expected: HTTP status is 200 and body includes success=true, at least one athlete result, and candidate details remain sourceType=public_top_record_candidate after selecting the athlete profile in Task 6/9 QA
    Evidence: .omo/evidence/task-3-top100-http.txt

  Scenario: Short query fails without recording candidate data
    Tool:     curl
    Steps:    Start server with `powershell -NoProfile -Command "cd C:/Users/SAMSUNG/Documents/GitHub/athletetime; $p=Start-Process node -ArgumentList 'src/server.js' -PassThru -WindowStyle Hidden; Start-Sleep 4; curl.exe -i 'http://127.0.0.1:3000/api/card-studio/analytics/records/search?q=K&limit=3' > .omo/evidence/task-3-top100-http-error.txt; Stop-Process -Id $p.Id -Force"`
    Expected: HTTP status is 400 and body includes error "Search query must be at least 2 characters."
    Evidence: .omo/evidence/task-3-top100-http-error.txt
  ```

  Commit: YES | Message: `test(records): lock top100 candidate analytics contract` | Files: [backend/tests/manual-top-records-ingest.test.js, card-studio/services/manualTopRecordsService.js, card-studio/services/recordAnalyticsService.js, tools/import-kaaf-top100-batch.js]

- [ ] 4. Harden current collected-records API contract

  What to do: Write RED tests first in `backend/tests/current-collected-records-service-readiness.test.js` for `CURRENT-RESULTS-001` through `CURRENT-RESULTS-005`. Then update only the smallest necessary code in `resultsStore`, `searchService`, `resultEventsRoute`, or `recordAnalyticsService`. Lock current records as `public_result`/collected results, ensure TOP100 never appears as a fake competition, ensure `/results/competitions?year=2026` returns current collected result competitions, ensure `/results/:filename/events` rejects path traversal, and ensure `/analytics/season-records` still returns season rows.
  Must NOT do: Do not merge TOP100 candidates into result competition listings; do not expose life-sport/held results as public; do not remove existing suppression/quality-hold behavior.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [6, 9] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `data/results/2018.json` - collected result data starts at 2018 and is tracked.
  - Pattern:  `card-studio/services/resultsStore.js:134` - results data loads from `data/results/<year>.json`.
  - Pattern:  `card-studio/services/resultsStore.js:162` - result records convert to legacy raw shape.
  - Pattern:  `card-studio/services/resultsStore.js:192` - result competition list API source.
  - Pattern:  `card-studio/services/resultsStore.js:200` - public filenames exclude non-public competitions.
  - Pattern:  `card-studio/services/searchService.js:34` - public result competition list uses `resultsStore`.
  - Pattern:  `card-studio/services/searchService.js:96` - result row search surface.
  - Pattern:  `card-studio/routes/publicRoutes.js:558` - `/results/competitions` route.
  - Pattern:  `card-studio/routes/publicRoutes.js:585` - `/results/:filename/events` route.
  - Pattern:  `card-studio/routes/resultEventsRoute.js:128` - result events handler.
  - Pattern:  `card-studio/routes/resultEventsRoute.js:133` - path traversal guard.
  - Pattern:  `card-studio/routes/resultEventsRoute.js:166` - successful result events response shape.
  - Test:     `backend/tests/competition-results-order.test.js:35` - result competitions ordering and public filtering.
  - Test:     `backend/tests/coverage-matrix.test.js:24` - coverage matrix distinguishes local alignment from global completeness.
  - External: `https://github.com/nodejs/node/blob/main/doc/api/test.md` - Node built-in `node --test` runner.

  Acceptance criteria (agent-executable only):
  - [ ] RED captured before implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'CURRENT-RESULTS' backend/tests/current-collected-records-service-readiness.test.js *> .omo/evidence/task-4-current-results-red.txt; if ($LASTEXITCODE -eq 0) { exit 1 }"`
  - [ ] GREEN captured after implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'CURRENT-RESULTS' backend/tests/current-collected-records-service-readiness.test.js *> .omo/evidence/task-4-current-results-green.txt; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"`
  - [ ] Existing result tests remain green: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test backend/tests/competition-results-order.test.js backend/tests/competition-highlights.test.js *> .omo/evidence/task-4-existing-result-tests.txt; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"`
  - [ ] TOP100 does not appear as a result competition: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node -e \"const s=require('./card-studio/services/searchService'); const hits=s.getCompetitions().filter(c=>/top100|manual-top100/i.test(c.filename+' '+c.competition)); console.log(JSON.stringify(hits)); if(hits.length) process.exit(1)\" *> .omo/evidence/task-4-no-top100-competition.txt"`

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: Current collected competitions and events are available
    Tool:     curl
    Steps:    Start server with `powershell -NoProfile -Command "cd C:/Users/SAMSUNG/Documents/GitHub/athletetime; $p=Start-Process node -ArgumentList 'src/server.js' -PassThru -WindowStyle Hidden; Start-Sleep 4; curl.exe -s 'http://127.0.0.1:3000/api/card-studio/results/competitions?year=2026' > .omo/evidence/task-4-current-competitions.json; $data=Get-Content .omo/evidence/task-4-current-competitions.json | ConvertFrom-Json; $filename=$data.data[0].filename; curl.exe -i \"http://127.0.0.1:3000/api/card-studio/results/$filename/events\" > .omo/evidence/task-4-current-events.txt; Stop-Process -Id $p.Id -Force; if (!$filename) { exit 1 }"`
    Expected: competitions JSON has success=true and at least one data item; events HTTP response is 200 and includes success=true, meta, events, and totalEvents
    Evidence: .omo/evidence/task-4-current-events.txt

  Scenario: Result events path traversal is rejected
    Tool:     curl
    Steps:    Start server with `powershell -NoProfile -Command "cd C:/Users/SAMSUNG/Documents/GitHub/athletetime; $p=Start-Process node -ArgumentList 'src/server.js' -PassThru -WindowStyle Hidden; Start-Sleep 4; curl.exe -i 'http://127.0.0.1:3000/api/card-studio/results/..%2Fsecret/events' > .omo/evidence/task-4-current-events-error.txt; Stop-Process -Id $p.Id -Force"`
    Expected: HTTP status is 400 or 404 and no file contents are returned
    Evidence: .omo/evidence/task-4-current-events-error.txt
  ```

  Commit: YES | Message: `test(results): lock collected records api readiness` | Files: [backend/tests/current-collected-records-service-readiness.test.js, card-studio/services/resultsStore.js, card-studio/services/searchService.js, card-studio/routes/resultEventsRoute.js, card-studio/services/recordAnalyticsService.js]

- [ ] 5. Add operator runbook skeleton and doc contract tests

  What to do: Write RED doc tests first in `backend/tests/kaaf-backfill-runbook.test.js` for `RUNBOOK-001` through `RUNBOOK-004`. Add `docs/athletetime-kaaf-backfill-service-readiness.md` explaining: supplied archive location, import command, expected 428 archive count, existing 396 legacy-manifest count and reconciliation policy, private-storage policy, TOP100 candidate policy, current collected records policy, exact API QA commands, Fable/operator promotion rules, rollback/cleanup rules, and "do not claim complete/official coverage" language.
  Must NOT do: Do not add manual-only steps as success criteria; every runbook verification command must be executable by an agent.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [8] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `docs/athletetime-manual-top100-ingest-handoff.md:1` - existing handoff doc style.
  - Pattern:  `docs/athletetime-manual-top100-ingest-handoff.md:20` - TOP100 safety rules.
  - Pattern:  `docs/athletetime-manual-top100-ingest-handoff.md:35` - operator workflow outline.
  - Pattern:  `WORKFLOW.md:36` - repo test policy uses `npm test`.
  - Pattern:  `WORKFLOW.md:41` - raw original protection policy.
  - Pattern:  `card-studio/services/coverageMatrixService.js:170` - coverage matrix explicitly refuses full-coverage claims.
  - Test:     `backend/tests/operator-guide.test.js` - existing doc/static contract pattern.
  - Test:     `backend/tests/operator-guide-source.test.js` - existing source-doc contract pattern.
  - External: `https://github.com/nodejs/node/blob/main/doc/api/test.md` - Node built-in `node --test` runner.

  Acceptance criteria (agent-executable only):
  - [ ] RED captured before implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'RUNBOOK' backend/tests/kaaf-backfill-runbook.test.js *> .omo/evidence/task-5-runbook-red.txt; if ($LASTEXITCODE -eq 0) { exit 1 }"`
  - [ ] GREEN captured after implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'RUNBOOK' backend/tests/kaaf-backfill-runbook.test.js *> .omo/evidence/task-5-runbook-green.txt; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"`
  - [ ] Runbook contains exact archive path and commands: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; Select-String -Path docs/athletetime-kaaf-backfill-service-readiness.md -Pattern 'kaaf_backfill_originals_2005-2017_2026-07-08.tar.gz|import-kaaf-backfill-originals|assert-raw-originals-private|records/search|results/competitions' | Tee-Object .omo/evidence/task-5-runbook-command-scan.txt; if ((Get-Content .omo/evidence/task-5-runbook-command-scan.txt).Length -lt 5) { exit 1 }"`

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: Runbook command block references executable tools
    Tool:     powershell
    Steps:    cd C:/Users/SAMSUNG/Documents/GitHub/athletetime; node --test --test-name-pattern RUNBOOK backend/tests/kaaf-backfill-runbook.test.js > .omo/evidence/task-5-runbook-green.txt
    Expected: Test exits 0 and verifies archive path, private-storage warning, TOP100 candidate warning, current-results QA, and no official/full-coverage language
    Evidence: .omo/evidence/task-5-runbook-green.txt

  Scenario: Runbook rejects manual-only completion wording
    Tool:     powershell
    Steps:    cd C:/Users/SAMSUNG/Documents/GitHub/athletetime; Select-String -Path docs/athletetime-kaaf-backfill-service-readiness.md -Pattern 'manually verify|user should test|looks correct|eyeball' -CaseSensitive:$false > .omo/evidence/task-5-runbook-error-scan.txt; if ((Get-Content .omo/evidence/task-5-runbook-error-scan.txt)) { exit 1 }
    Expected: Scan output is empty
    Evidence: .omo/evidence/task-5-runbook-error-scan.txt
  ```

  Commit: YES | Message: `docs(data): document kaaf backfill service readiness` | Files: [backend/tests/kaaf-backfill-runbook.test.js, docs/athletetime-kaaf-backfill-service-readiness.md]

- [ ] 6. Add source-readiness summary API

  What to do: Write RED tests first in `backend/tests/record-source-readiness-api.test.js` for `SOURCE-READY-001` through `SOURCE-READY-005`. Add a public read-only endpoint at `GET /api/card-studio/analytics/records/source-summary`. It must return summary data for current collected results, TOP100 candidates, and latest backfill-original import manifest if available. Include counts, coverage ranges, source tiers, review statuses, warnings, and no raw original paths beyond private relative paths. Use existing route/rate-limit patterns.
  Must NOT do: Do not return raw file bodies, absolute local paths, or a download URL for private originals; do not require authentication for this read-only readiness summary unless existing public analytics routes require it.

  Parallelization: Can parallel: YES | Wave 2 | Blocks: [7, 8, 9] | Blocked by: [1, 3, 4]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `card-studio/routes/publicRoutes.js:215` - analytics search route with query sanitization and JSON envelope.
  - Pattern:  `card-studio/routes/publicRoutes.js:252` - athlete summary route JSON envelope.
  - Pattern:  `card-studio/routes/publicRoutes.js:265` - season records route JSON envelope.
  - Pattern:  `card-studio/routes/publicRoutes.js:558` - result competitions public route.
  - Pattern:  `src/server.js:198` - card-studio public router is mounted under `/api/card-studio`.
  - Pattern:  `src/server.js:205` - public router mount path.
  - Pattern:  `src/server.js:207` - record analytics warmup is non-blocking.
  - API/Type: `card-studio/services/manualTopRecordsService.js:80` - TOP100 summary.
  - API/Type: `card-studio/services/resultsStore.js:192` - current collected result competition count.
  - API/Type: `card-studio/services/kaafBackfillOriginalsService.js` - new archive manifest reader from Task 1.
  - External: `https://github.com/expressjs/express/blob/master/_autodocs/9-router.md` - Express router and `app.use` pattern.
  - External: `https://github.com/nodejs/node/blob/main/doc/api/test.md` - Node built-in `node --test` runner.

  Acceptance criteria (agent-executable only):
  - [ ] RED captured before implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'SOURCE-READY' backend/tests/record-source-readiness-api.test.js *> .omo/evidence/task-6-source-ready-red.txt; if ($LASTEXITCODE -eq 0) { exit 1 }"`
  - [ ] GREEN captured after implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'SOURCE-READY' backend/tests/record-source-readiness-api.test.js *> .omo/evidence/task-6-source-ready-green.txt; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"`
  - [ ] Endpoint has no raw body or absolute path leakage: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; $p=Start-Process node -ArgumentList 'src/server.js' -PassThru -WindowStyle Hidden; Start-Sleep 4; curl.exe -s 'http://127.0.0.1:3000/api/card-studio/analytics/records/source-summary' > .omo/evidence/task-6-source-summary.json; Stop-Process -Id $p.Id -Force; Select-String -Path .omo/evidence/task-6-source-summary.json -Pattern 'rawFileBody|fileBody|C:\\\\Users\\\\|Downloads' -CaseSensitive:$false | Tee-Object .omo/evidence/task-6-source-summary-leak-scan.txt; if ((Get-Content .omo/evidence/task-6-source-summary-leak-scan.txt)) { exit 1 }"`
  - [ ] Endpoint reports TOP100 and current result sources distinctly: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; $json=Get-Content .omo/evidence/task-6-source-summary.json | ConvertFrom-Json; if (!$json.success -or !$json.data.top100 -or !$json.data.currentResults -or $json.data.top100.sourceType -ne 'public_top_record_candidate') { exit 1 }"`

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: Source readiness endpoint returns separate source summaries
    Tool:     curl
    Steps:    Start server with `powershell -NoProfile -Command "cd C:/Users/SAMSUNG/Documents/GitHub/athletetime; $p=Start-Process node -ArgumentList 'src/server.js' -PassThru -WindowStyle Hidden; Start-Sleep 4; curl.exe -i 'http://127.0.0.1:3000/api/card-studio/analytics/records/source-summary' > .omo/evidence/task-6-source-summary-http.txt; Stop-Process -Id $p.Id -Force"`
    Expected: HTTP status is 200; JSON has data.currentResults, data.top100, data.backfillOriginals, warnings[]; top100.sourceType is public_top_record_candidate
    Evidence: .omo/evidence/task-6-source-summary-http.txt

  Scenario: Source readiness endpoint has no raw body or absolute private path
    Tool:     powershell
    Steps:    cd C:/Users/SAMSUNG/Documents/GitHub/athletetime; Select-String -Path .omo/evidence/task-6-source-summary-http.txt -Pattern 'rawFileBody|fileBody|C:\\Users\\|Downloads' -CaseSensitive:$false > .omo/evidence/task-6-source-summary-error.txt; if ((Get-Content .omo/evidence/task-6-source-summary-error.txt)) { exit 1 }
    Expected: Scan output is empty
    Evidence: .omo/evidence/task-6-source-summary-error.txt
  ```

  Commit: YES | Message: `feat(api): expose record source readiness summary` | Files: [backend/tests/record-source-readiness-api.test.js, card-studio/routes/publicRoutes.js, card-studio/services/recordSourceReadinessService.js, card-studio/services/kaafBackfillOriginalsService.js]

- [ ] 7. Add frontend source status labels and type coverage

  What to do: Write RED tests first in `backend/tests/athlete-user-ux.test.js` or a new `backend/tests/record-source-labels.test.js` for `SOURCE-LABEL-001` through `SOURCE-LABEL-004`. Update `frontend/src/api/recordAnalytics.ts` so `PublicRecord.source` includes `sourceTier`, `reviewStatus`, and `batch`. Update `RecordsPage` and/or `RecordSearchResults` so TOP100 rows are visibly labeled as candidate/needs-confirmation data while current collected results are labeled as collected public results. Keep wording factual and avoid official/certified/full-coverage claims.
  Must NOT do: Do not add marketing copy; do not hide the existing data-rights notice; do not make the label depend only on provider=`KAAF`.

  Parallelization: Can parallel: YES | Wave 2 | Blocks: [9] | Blocked by: [3, 6]

  References (executor has NO interview context - be exhaustive):
  - API/Type: `frontend/src/api/recordAnalytics.ts:40` - `PublicRecord` type.
  - API/Type: `frontend/src/api/recordAnalytics.ts:62` - current source type omits `sourceTier` and `reviewStatus`.
  - API/Type: `frontend/src/api/recordAnalytics.ts:267` - record search API client.
  - Pattern:  `frontend/src/pages/RecordsPage.tsx:31` - data policy label helper import.
  - Pattern:  `frontend/src/pages/RecordsPage.tsx:946` - `RecordLine` renders record source details.
  - Pattern:  `frontend/src/pages/RecordsPage.tsx:963` - existing source provider display.
  - Pattern:  `frontend/src/components/records/RecordSearchResults.tsx:175` - athlete result card candidate list surface.
  - Pattern:  `backend/tests/athlete-user-ux.test.js:122` - frontend source scanning tests for records UX.
  - External: `https://github.com/microsoft/playwright/blob/v1.58.2/docs/src/api/class-browsertype.md` - Playwright real Chrome/CDP browser automation and screenshots.

  Acceptance criteria (agent-executable only):
  - [ ] RED captured before implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'SOURCE-LABEL' backend/tests/record-source-labels.test.js *> .omo/evidence/task-7-source-label-red.txt; if ($LASTEXITCODE -eq 0) { exit 1 }"`
  - [ ] GREEN captured after implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'SOURCE-LABEL' backend/tests/record-source-labels.test.js *> .omo/evidence/task-7-source-label-green.txt; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"`
  - [ ] Frontend type-check passes: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; npm --prefix frontend run type-check *> .omo/evidence/task-7-frontend-type-check.txt; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"`
  - [ ] Frontend build passes: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; npm --prefix frontend run build *> .omo/evidence/task-7-frontend-build.txt; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"`
  - [ ] Copy scan forbids official/certified claims: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; Select-String -Path frontend/src/pages/RecordsPage.tsx,frontend/src/components/records/RecordSearchResults.tsx -Pattern 'official|certified|complete coverage|full coverage|공식|인증|전체 보유' -CaseSensitive:$false | Tee-Object .omo/evidence/task-7-official-copy-scan.txt; if ((Get-Content .omo/evidence/task-7-official-copy-scan.txt)) { exit 1 }"`

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: Browser shows TOP100 candidate status on record detail
    Tool:     playwright(real Chrome)
    Steps:    Start backend and frontend preview, then run `node -e "const { chromium } = require('playwright'); (async()=>{ const browser=await chromium.launch({ channel:'chrome' }); const page=await browser.newPage({ viewport:{ width:1280, height:900 } }); await page.goto('http://127.0.0.1:5173/records?q=KIM%20KUKYOUNG', { waitUntil:'networkidle' }); await page.getByText(/KIM KUKYOUNG|KUKYOUNG|candidate|needs confirmation|TOP100/i).first().waitFor({ timeout:15000 }); await page.screenshot({ path:'.omo/evidence/task-7-source-label-browser.png', fullPage:true }); await browser.close(); })().catch((error)=>{ console.error(error); process.exit(1); })" > .omo/evidence/task-7-source-label-browser.txt`
    Expected: Browser automation exits 0 and screenshot contains the record search page with a visible candidate/confirmation status for TOP100-derived records
    Evidence: .omo/evidence/task-7-source-label-browser.png

  Scenario: Browser copy does not claim official or complete coverage
    Tool:     playwright(real Chrome)
    Steps:    Run `node -e "const { chromium } = require('playwright'); (async()=>{ const browser=await chromium.launch({ channel:'chrome' }); const page=await browser.newPage(); await page.goto('http://127.0.0.1:5173/records?q=KIM%20KUKYOUNG', { waitUntil:'networkidle' }); const text=await page.locator('body').innerText(); require('fs').writeFileSync('.omo/evidence/task-7-source-label-copy.txt', text); if(/official|certified|complete coverage|full coverage/i.test(text)) process.exit(2); await browser.close(); })().catch((error)=>{ console.error(error); process.exit(1); })"`
    Expected: Text artifact contains no official/certified/full coverage claims
    Evidence: .omo/evidence/task-7-source-label-copy.txt
  ```

  Commit: YES | Message: `feat(records): label candidate record sources` | Files: [backend/tests/record-source-labels.test.js, frontend/src/api/recordAnalytics.ts, frontend/src/pages/RecordsPage.tsx, frontend/src/components/records/RecordSearchResults.tsx]

- [ ] 8. Add npm scripts and evidence command wrappers

  What to do: Write RED tests first in `backend/tests/kaaf-readiness-scripts.test.js` for `SCRIPTS-001` through `SCRIPTS-004`. Add root `package.json` scripts for `kaaf:backfill:import`, `kaaf:backfill:protect`, `kaaf:source-summary`, and `test:kaaf-readiness`. The scripts must call the real tools and test files added above. Add a short `tools/print-record-source-summary.js` wrapper only if it materially simplifies `kaaf:source-summary`.
  Must NOT do: Do not make scripts depend on global shell tools beyond Node/npm/curl for QA; do not run extraction as part of `npm test`; keep expensive archive import explicit.

  Parallelization: Can parallel: YES | Wave 2 | Blocks: [9] | Blocked by: [1, 2, 5, 6]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `package.json:13` - root `test` script enumerates Node test files.
  - Pattern:  `tools/download-source.js:32` - CLI error handling and JSON option pattern.
  - Pattern:  `tools/build-kaaf-result-catalog.js:59` - tool wrapper reads args and emits JSON.
  - Pattern:  `tools/import-kaaf-top100-batch.js:159` - TOP100 import CLI pattern.
  - Test:     `backend/tests/source-download-cli.test.js:56` - script/CLI JSON test pattern.
  - Test:     `backend/tests/coverage-matrix.test.js:100` - CLI artifact creation test pattern.
  - External: `https://github.com/nodejs/node/blob/main/doc/api/test.md` - Node built-in `node --test` runner.

  Acceptance criteria (agent-executable only):
  - [ ] RED captured before implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'SCRIPTS' backend/tests/kaaf-readiness-scripts.test.js *> .omo/evidence/task-8-scripts-red.txt; if ($LASTEXITCODE -eq 0) { exit 1 }"`
  - [ ] GREEN captured after implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'SCRIPTS' backend/tests/kaaf-readiness-scripts.test.js *> .omo/evidence/task-8-scripts-green.txt; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"`
  - [ ] KAAF readiness tests run by npm script: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; npm run test:kaaf-readiness *> .omo/evidence/task-8-test-kaaf-readiness.txt; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"`
  - [ ] Explicit import script produces JSON from actual archive: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; npm run kaaf:backfill:import -- --archive C:/Users/SAMSUNG/Downloads/kaaf_backfill_originals_2005-2017_2026-07-08.tar.gz --batch 20260708-kaaf-backfill-2005-2017 --json *> .omo/evidence/task-8-npm-import.txt; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"`

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: KAAF readiness test script runs all targeted tests
    Tool:     powershell
    Steps:    cd C:/Users/SAMSUNG/Documents/GitHub/athletetime; npm run test:kaaf-readiness > .omo/evidence/task-8-test-kaaf-readiness.txt
    Expected: Command exits 0 and output names backfill import, raw protection, TOP100, current results, source summary, runbook, scripts, and source labels tests
    Evidence: .omo/evidence/task-8-test-kaaf-readiness.txt

  Scenario: Expensive archive import remains explicit
    Tool:     powershell
    Steps:    cd C:/Users/SAMSUNG/Documents/GitHub/athletetime; npm test > .omo/evidence/task-8-npm-test-no-import.txt; Select-String -Path .omo/evidence/task-8-npm-test-no-import.txt -Pattern 'import-kaaf-backfill-originals|kaaf_backfill_originals_2005-2017' -CaseSensitive:$false > .omo/evidence/task-8-npm-test-import-scan.txt; if ((Get-Content .omo/evidence/task-8-npm-test-import-scan.txt)) { exit 1 }
    Expected: `npm test` does not run the archive import; expensive import only runs through explicit `kaaf:backfill:import`
    Evidence: .omo/evidence/task-8-npm-test-import-scan.txt
  ```

  Commit: YES | Message: `chore(data): add kaaf readiness commands` | Files: [backend/tests/kaaf-readiness-scripts.test.js, package.json, tools/print-record-source-summary.js]

- [ ] 9. Add full KAAF readiness QA harness

  What to do: Write RED tests first in `backend/tests/kaaf-readiness-qa-harness.test.js` for `QA-HARNESS-001` through `QA-HARNESS-004`. Implement `tools/qa-kaaf-service-readiness.js` to run the real local archive import/protection scan, start the backend server on an available port, call source summary/search/current-results APIs, optionally run the frontend browser check if `--browser` is passed, and write a consolidated JSON/Markdown evidence report. It must clean up started processes and leave no bound port.
  Must NOT do: Do not treat green unit tests as full completion; this harness is for real-surface QA and must fail if any HTTP call, browser check, or raw-protection scan fails.

  Parallelization: Can parallel: NO | Wave 3 | Blocks: [final verification] | Blocked by: [1, 2, 3, 4, 6, 7, 8]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `src/server.js:39` - server port reads `PORT` env var.
  - Pattern:  `src/server.js:149` - `/health` and `/api/health` health checks.
  - Pattern:  `card-studio/routes/publicRoutes.js:215` - record search route.
  - Pattern:  `card-studio/routes/publicRoutes.js:252` - athlete profile route.
  - Pattern:  `card-studio/routes/publicRoutes.js:558` - current result competitions route.
  - Pattern:  `card-studio/routes/publicRoutes.js:585` - current result events route.
  - Pattern:  `tools/import-kaaf-backfill-originals.js` - archive import command from Task 1.
  - Pattern:  `tools/assert-raw-originals-private.js` - raw protection command from Task 2.
  - Test:     `backend/tests/athlete-user-ux.test.js:332` - existing HTTP request test style.
  - External: `https://github.com/nodejs/node/blob/main/doc/api/test.md` - Node built-in `node --test` runner.
  - External: `https://github.com/microsoft/playwright/blob/v1.58.2/docs/src/api/class-browsertype.md` - Playwright Chrome automation and screenshots.

  Acceptance criteria (agent-executable only):
  - [ ] RED captured before implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'QA-HARNESS' backend/tests/kaaf-readiness-qa-harness.test.js *> .omo/evidence/task-9-qa-harness-red.txt; if ($LASTEXITCODE -eq 0) { exit 1 }"`
  - [ ] GREEN captured after implementation: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node --test --test-name-pattern 'QA-HARNESS' backend/tests/kaaf-readiness-qa-harness.test.js *> .omo/evidence/task-9-qa-harness-green.txt; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"`
  - [ ] Full harness passes without browser: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; node tools/qa-kaaf-service-readiness.js --archive C:/Users/SAMSUNG/Downloads/kaaf_backfill_originals_2005-2017_2026-07-08.tar.gz --batch 20260708-kaaf-backfill-2005-2017 --evidence-dir .omo/evidence/task-9-qa --json *> .omo/evidence/task-9-qa-harness.json; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"`
  - [ ] Harness leaves no server process on its chosen port: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; $summary=Get-Content .omo/evidence/task-9-qa-harness.json | ConvertFrom-Json; $port=$summary.port; try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://127.0.0.1:$port/health; exit 1 } catch { exit 0 }"`
  - [ ] Full targeted suite passes: `powershell -NoProfile -Command "cd 'C:/Users/SAMSUNG/Documents/GitHub/athletetime'; npm run test:kaaf-readiness *> .omo/evidence/task-9-targeted-suite.txt; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"`

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: Full service-readiness harness passes through real HTTP surfaces
    Tool:     powershell
    Steps:    cd C:/Users/SAMSUNG/Documents/GitHub/athletetime; node tools/qa-kaaf-service-readiness.js --archive C:/Users/SAMSUNG/Downloads/kaaf_backfill_originals_2005-2017_2026-07-08.tar.gz --batch 20260708-kaaf-backfill-2005-2017 --evidence-dir .omo/evidence/task-9-qa --json > .omo/evidence/task-9-qa-harness.json
    Expected: JSON has ok=true; checks.import.ok=true; checks.rawProtection.ok=true; checks.sourceSummary.status=200; checks.top100Search.status=200; checks.currentResults.status=200; checks.noRawLeak.ok=true
    Evidence: .omo/evidence/task-9-qa-harness.json

  Scenario: Harness fails on bad archive path and cleans up server
    Tool:     powershell
    Steps:    cd C:/Users/SAMSUNG/Documents/GitHub/athletetime; node tools/qa-kaaf-service-readiness.js --archive C:/missing-kaaf-backfill.tar.gz --batch bad --evidence-dir .omo/evidence/task-9-qa-error --json > .omo/evidence/task-9-qa-harness-error.json; if ($LASTEXITCODE -eq 0) { exit 1 }
    Expected: JSON has ok=false, error.code=BACKFILL_ARCHIVE_NOT_FOUND or QA_IMPORT_FAILED, and no server port remains reachable
    Evidence: .omo/evidence/task-9-qa-harness-error.json
  ```

  Commit: YES | Message: `test(data): add kaaf readiness qa harness` | Files: [backend/tests/kaaf-readiness-qa-harness.test.js, tools/qa-kaaf-service-readiness.js]

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
- Reference the plan file path in the final commit footer: `Plan: .omo/plans/athletetime-kaaf-backfill-service-readiness.md`.

## Success criteria
- All Must-Have shipped; all QA scenarios pass with captured evidence; F1-F4 approved; commit history clean.
