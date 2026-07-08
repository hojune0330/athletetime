# AthleteTime Track A XLSX Promotion

## TL;DR
> Summary:      Promote only the approved Track A horizontal-podium `.xlsx` slice into `data/results/2015.json`, `data/results/2016.json`, `data/results/2017.json`, and `data/results/index.json`, with tests and evidence proving service compatibility and manual TOP100 dedupe impact.
> Deliverables:
> - Promotion command/service with TDD coverage
> - Generated service JSON for 10 approved `.xlsx` workbooks / 4,292 result rows
> - Updated analytics and results API regression tests
> - Evidence report including `manualTopRecordStats.skippedDuplicates` before/after/delta
> Effort:       Medium
> Risk:         Medium - data promotion touches shared result/search/analytics surfaces and changes manual TOP100 dedupe totals.

## Scope
### Must have
- Promote PR #33's approved parsed horizontal `.xlsx` candidates only: 10 workbooks and 4,292 rows from `.omo/evidence/legacy-results-normalization/track-a-2015-2017/normalized-candidates.jsonl`.
- Generate/commit `data/results/2015.json`, `data/results/2016.json`, `data/results/2017.json`, and matching `data/results/index.json` entries.
- Generated `data/results/<year>.json` shape must match the existing service schema:
  ```json
  {
    "competitionId": "2015-track_field-0288",
    "toCd": "",
    "competitionName": "<candidate competitionName>",
    "year": "2015",
    "period": "2015-08-10",
    "venue": "",
    "source": "kaaf",
    "sourceUrl": "",
    "collectedAt": "2026-07-08",
    "events": [
      {
        "event": "<candidate event>",
        "division": "<candidate division>",
        "date": "2015-08-10",
        "venue": "",
        "wind": null,
        "results": [
          {
            "rank": 1,
            "name": "<candidate name>",
            "affiliation": "<candidate affiliation>",
            "record": "<candidate record>",
            "personal_best": "",
            "note": "",
            "newRecord": ""
          }
        ]
      }
    ]
  }
  ```
- Use deterministic `competitionId` format `<year>-track_field-<first sourcePath numeric token>`, for example `2015-track_field-0288`, to avoid future `.xls` slice renumbering.
- Group rows by `year + source.privateStoragePath + competitionName`; group events by `division + event`; preserve candidate row order within each event.
- Derive `period`/`date` from the first `YYYYMMDD` token in `source.privateStoragePath` or `source.originalFilename`; format as `YYYY-MM-DD`; leave `venue` blank when the evidence has no venue.
- Report `manualTopRecordStats.skippedDuplicates` baseline, promoted value, and delta in `.omo/evidence/task-3-track-a-manual-top-delta.json`.
- Keep existing candidate evidence and candidate batch files unchanged.
- Use one PR for this slice only: branch `codex/track-a-xlsx-results-promotion`, PR title `feat(data): promote Track A xlsx legacy results`.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- Do not convert, parse, promote, or classify the 83 `.xls` files beyond preserving the existing deferred report.
- Do not update any `docs/data-candidates/**/candidate-records.jsonl`.
- Do not commit raw/original spreadsheet files under `data/sources/import/originals/`.
- Do not add UI changes, Track H community work, Track F 2026 work, `.pdf`, `.hwp`, or `.xls` converter work.
- Do not expose `source.privateStoragePath`, `PERSON_NO`, birth date, phone, email, address, or any other non-public source metadata in `data/results/*.json` or public API responses.
- Do not treat manual TOP100 candidates as authoritative when a promoted `data/results` row exists; `data/results` wins.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: TDD + Node built-in test runner (`node --test`)
- QA policy: every task has agent-executed scenarios
- Evidence: `.omo/evidence/task-<N>-track-a-xlsx-promotion.<ext>`

## Execution strategy
### Parallel execution waves
> Target 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks to maximize parallelism.

Wave 1 (no dependencies):
- Task 1: Build promotion command/service with TDD temp-output contract
- Task 2: Lock candidate inventory and generated-shape contract

Wave 2 (after Wave 1):
- Task 3: Generate and commit Track A data files plus manual TOP100 delta evidence

Wave 3 (after Wave 2):
- Task 4: Add results service/API regression coverage
- Task 5: Add promotion guardrail coverage

Wave 4 (after Wave 3):
- Task 6: Capture HTTP/CLI QA evidence and prepare PR boundary

Critical path: Task 1 -> Task 3 -> Task 4 -> Task 6

### Dependency matrix
| Task | Depends on | Blocks | Can parallelize with |
|------|------------|--------|----------------------|
| 1    | none       | 3      | 2                    |
| 2    | none       | 3, 5   | 1                    |
| 3    | 1, 2       | 4, 5, 6 | none                |
| 4    | 3          | 6      | 5                    |
| 5    | 2, 3       | 6      | 4                    |
| 6    | 4, 5       | none   | none                 |

## Todos
> Implementation + Test = ONE task. Never separate.
> Every task MUST have: References + Acceptance Criteria + QA Scenarios + Commit.

- [ ] 1. Build Track A promotion command/service with TDD temp-output contract

  What to do: Add `card-studio/services/legacyResultPromotionService.js` and `tools/promote-track-a-xlsx-results.js`. Start with failing tests in `backend/tests/track-a-xlsx-promotion.test.js`, then implement the minimal transformer. The command must support `--candidate-file`, `--inspection-file`, `--out-dir`, `--index`, `--evidence-dir`, `--write`, `--dry-run`, and `--json`. In dry-run/temp mode, it must write generated files to the supplied out-dir without touching committed `data/results/`.
  Must NOT do: Do not write production data files in this task. Do not import a new spreadsheet dependency; reuse normalized candidates and existing Node APIs.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [3] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `tools/normalize-legacy-results.js:142` - existing CLI argument parsing and default evidence directory pattern.
  - Pattern:  `tools/normalize-legacy-results.js:157` - existing generated evidence file writes.
  - Pattern:  `card-studio/services/legacyResultNormalizationService.js:157` - candidate extraction shape (`year`, `competitionName`, `division`, `event`, `rank`, `name`, `affiliation`, `record`, source info).
  - Pattern:  `card-studio/services/legacyResultNormalizationService.js:169` - normalized candidate row fields to map into result rows.
  - Pattern:  `card-studio/services/xlsxTextExtractor.js:111` - existing XLSX reader entrypoint, kept as context only; do not re-parse source workbooks for promotion.
  - API/Type: `data/results/2026.json:1` - existing `data/results/<year>.json` file is an array of competition objects.
  - API/Type: `docs/work-orders/20260708-top100-promotion-and-legacy-normalization.md:93` - documented result schema for legacy promotion.
  - Test:     `backend/tests/legacy-result-normalization.test.js:79` - temp directory CLI test pattern using `execFileSync`.
  - External: `https://github.com/nodejs/node/blob/main/doc/api/test.md` - official Node `node --test` runner reference.
  - External: `https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/structure-of-a-spreadsheetml-document` - SpreadsheetML workbook/worksheet structure reference for why existing parser output is the source of truth.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/track-a-xlsx-promotion.test.js` passes after first capturing a RED failure in `.omo/evidence/task-1-track-a-xlsx-promotion-red.tap`.
  - [ ] `node tools/promote-track-a-xlsx-results.js --candidate-file .omo/evidence/legacy-results-normalization/track-a-2015-2017/normalized-candidates.jsonl --inspection-file .omo/evidence/legacy-results-normalization/track-a-2015-2017/xlsx-inspection.json --out-dir .omo/evidence/task-1-track-a-temp-results --index .omo/evidence/task-1-track-a-temp-results/index.json --evidence-dir .omo/evidence/task-1-track-a-xlsx-promotion --dry-run --json > .omo/evidence/task-1-track-a-xlsx-promotion.json` exits 0.
  - [ ] The JSON report asserts `candidateRows: 4292`, `promotedWorkbooks: 10`, `years: [2015,2016,2017]`, `deferredXlsFiles: 83`, and `excludedNonEliteFiles: 1`.
  - [ ] `git diff --name-only -- data/results` is empty at the end of this task.

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: dry-run promotion creates temp service JSON only
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "node tools/promote-track-a-xlsx-results.js --candidate-file .omo/evidence/legacy-results-normalization/track-a-2015-2017/normalized-candidates.jsonl --inspection-file .omo/evidence/legacy-results-normalization/track-a-2015-2017/xlsx-inspection.json --out-dir .omo/evidence/task-1-track-a-temp-results --index .omo/evidence/task-1-track-a-temp-results/index.json --evidence-dir .omo/evidence/task-1-track-a-xlsx-promotion --dry-run --json | Set-Content .omo/evidence/task-1-track-a-xlsx-promotion.json; node -e \"const fs=require('fs'); const r=JSON.parse(fs.readFileSync('.omo/evidence/task-1-track-a-xlsx-promotion.json','utf8')); if(r.candidateRows!==4292||r.promotedWorkbooks!==10||r.deferredXlsFiles!==83) throw new Error('bad promotion counts');\""
    Expected: command exits 0 and `.omo/evidence/task-1-track-a-temp-results/2015.json`, `2016.json`, `2017.json`, and `index.json` exist with 4,292 total result rows.
    Evidence: .omo/evidence/task-1-track-a-xlsx-promotion.json

  Scenario: missing candidate evidence fails with typed error
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "$p=Start-Process -FilePath node -ArgumentList 'tools/promote-track-a-xlsx-results.js','--candidate-file','.omo/evidence/missing-track-a.jsonl','--inspection-file','.omo/evidence/legacy-results-normalization/track-a-2015-2017/xlsx-inspection.json','--out-dir','.omo/evidence/task-1-missing','--index','.omo/evidence/task-1-missing/index.json','--dry-run','--json' -NoNewWindow -PassThru -Wait -RedirectStandardOutput '.omo/evidence/task-1-track-a-xlsx-promotion-error.json' -RedirectStandardError '.omo/evidence/task-1-track-a-xlsx-promotion-error.err'; if ($p.ExitCode -eq 0) { throw 'expected failure' }; Select-String -Path '.omo/evidence/task-1-track-a-xlsx-promotion-error.*' -Pattern 'TRACK_A_CANDIDATES_NOT_FOUND'"
    Expected: command exits non-zero and evidence contains `TRACK_A_CANDIDATES_NOT_FOUND`.
    Evidence: .omo/evidence/task-1-track-a-xlsx-promotion-error.json
  ```

  Commit: YES | Message: `feat(data): add Track A xlsx promotion command` | Files: [`card-studio/services/legacyResultPromotionService.js`, `tools/promote-track-a-xlsx-results.js`, `backend/tests/track-a-xlsx-promotion.test.js`, `package.json`]

- [ ] 2. Lock candidate inventory and generated-shape contract

  What to do: Extend `backend/tests/track-a-xlsx-promotion.test.js` so the temp output contract asserts exact generated shape, deterministic IDs, per-year row counts, absence of private/sensitive keys, and no `.xls` promotion. Add package scripts `data:promote:track-a-xlsx` and `data:check:track-a-xlsx` only if Task 1 did not already add them.
  Must NOT do: Do not commit production `data/results/2015.json`, `2016.json`, or `2017.json` yet.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [3, 5] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `.omo/evidence/legacy-results-normalization/track-a-2015-2017/review-report.md:3` - approved years.
  - Pattern:  `.omo/evidence/legacy-results-normalization/track-a-2015-2017/review-report.md:5` - `.xlsx` inspect candidate count.
  - Pattern:  `.omo/evidence/legacy-results-normalization/track-a-2015-2017/review-report.md:6` - `.xls` deferred count.
  - Pattern:  `.omo/evidence/legacy-results-normalization/track-a-2015-2017/review-report.md:8` - 10 horizontal-podium workbooks.
  - Pattern:  `.omo/evidence/legacy-results-normalization/track-a-2015-2017/review-report.md:9` - 4,292 extracted candidate rows.
  - Pattern:  `.omo/evidence/legacy-results-normalization/track-a-2015-2017/review-report.md:14` - 2015 row count: 1,009.
  - Pattern:  `.omo/evidence/legacy-results-normalization/track-a-2015-2017/review-report.md:15` - 2016 row count: 2,390.
  - Pattern:  `.omo/evidence/legacy-results-normalization/track-a-2015-2017/review-report.md:16` - 2017 row count: 893.
  - Pattern:  `.omo/evidence/legacy-results-normalization/track-a-2015-2017/plan.json:8` - manifest files include status values used to distinguish `.xlsx` from `.xls`.
  - API/Type: `data/results/index.json:1` - existing result index is an array of per-competition summaries.
  - Test:     `backend/tests/legacy-result-normalization.test.js:27` - existing Track A plan count assertions.
  - Test:     `backend/tests/legacy-result-normalization.test.js:79` - candidate generation safety assertions.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/track-a-xlsx-promotion.test.js` passes.
  - [ ] `npm run data:check:track-a-xlsx` exits 0 and writes `.omo/evidence/task-2-track-a-xlsx-promotion.json`.
  - [ ] `node -e "const fs=require('fs'); const r=JSON.parse(fs.readFileSync('.omo/evidence/task-2-track-a-xlsx-promotion.json','utf8')); if(r.byYear['2015']!==1009||r.byYear['2016']!==2390||r.byYear['2017']!==893) throw new Error('bad byYear counts');"` exits 0.
  - [ ] `node -e "const fs=require('fs'); const t=['2015','2016','2017'].map(y=>fs.readFileSync('.omo/evidence/task-2-track-a-temp-results/'+y+'.json','utf8')).join('\n'); if(/privateStoragePath|PERSON_NO|birthDate|phone|email|address|\\.xls/i.test(t)) throw new Error('forbidden public data token');"` exits 0.

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: generated temp data has exact approved counts
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "npm run data:check:track-a-xlsx *> .omo/evidence/task-2-track-a-xlsx-promotion.tap; node -e \"const fs=require('fs'); const r=JSON.parse(fs.readFileSync('.omo/evidence/task-2-track-a-xlsx-promotion.json','utf8')); const ok=r.candidateRows===4292&&r.promotedWorkbooks===10&&r.byYear['2015']===1009&&r.byYear['2016']===2390&&r.byYear['2017']===893; if(!ok) throw new Error(JSON.stringify(r));\""
    Expected: command exits 0 and `.omo/evidence/task-2-track-a-xlsx-promotion.json` contains the exact approved counts.
    Evidence: .omo/evidence/task-2-track-a-xlsx-promotion.json

  Scenario: malformed candidate row fails before writing output
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "New-Item -ItemType Directory -Force .omo/evidence/task-2-bad | Out-Null; '{\"year\":2015,\"competitionName\":\"Bad\",\"event\":\"100m\"}' | Set-Content .omo/evidence/task-2-bad/bad.jsonl; $p=Start-Process -FilePath node -ArgumentList 'tools/promote-track-a-xlsx-results.js','--candidate-file','.omo/evidence/task-2-bad/bad.jsonl','--inspection-file','.omo/evidence/legacy-results-normalization/track-a-2015-2017/xlsx-inspection.json','--out-dir','.omo/evidence/task-2-bad/out','--index','.omo/evidence/task-2-bad/out/index.json','--dry-run','--json' -NoNewWindow -PassThru -Wait -RedirectStandardOutput '.omo/evidence/task-2-track-a-xlsx-promotion-error.json' -RedirectStandardError '.omo/evidence/task-2-track-a-xlsx-promotion-error.err'; if ($p.ExitCode -eq 0) { throw 'expected failure' }; Select-String -Path '.omo/evidence/task-2-track-a-xlsx-promotion-error.*' -Pattern 'TRACK_A_INVALID_CANDIDATE_ROW'"
    Expected: command exits non-zero, output directory is absent or empty, and evidence contains `TRACK_A_INVALID_CANDIDATE_ROW`.
    Evidence: .omo/evidence/task-2-track-a-xlsx-promotion-error.json
  ```

  Commit: YES | Message: `test(data): lock Track A xlsx promotion shape` | Files: [`backend/tests/track-a-xlsx-promotion.test.js`, `package.json`]

- [ ] 3. Generate Track A data files and manual TOP100 delta evidence

  What to do: Run the promotion command in write mode. Commit `data/results/2015.json`, `data/results/2016.json`, `data/results/2017.json`, and updated `data/results/index.json`. Update `backend/tests/manual-top-records-ingest.test.js` so exact `manualTopRecordStats` expectations match the promoted data. Capture `.omo/evidence/task-3-track-a-manual-top-delta.json` with `{ before, after, delta }`, where `delta.skippedDuplicates = after.skippedDuplicates - before.skippedDuplicates`.
  Must NOT do: Do not include any `.xls` rows, candidate-record changes, raw source files, or unrelated data years.

  Parallelization: Can parallel: NO | Wave 2 | Blocks: [4, 5, 6] | Blocked by: [1, 2]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `docs/work-orders/20260708-community-activation-track-h.md:253` - PR #33 is merged.
  - Pattern:  `docs/work-orders/20260708-community-activation-track-h.md:255` - approved 4,292 normalized candidates.
  - Pattern:  `docs/work-orders/20260708-community-activation-track-h.md:256` - next slice is the 10 horizontal `.xlsx` workbooks to `data/results/`.
  - Pattern:  `docs/work-orders/20260708-community-activation-track-h.md:257` - `.xls` 83 files remain next.
  - Pattern:  `docs/work-orders/20260708-community-activation-track-h.md:262` - do not update `candidate-records.jsonl` before service promotion.
  - Pattern:  `docs/work-orders/20260708-community-activation-track-h.md:264` - promotion PR must report `manualTopRecordStats.skippedDuplicates` increase.
  - API/Type: `card-studio/services/resultsStore.js:42` - service data root is `data/results`.
  - API/Type: `card-studio/services/resultsStore.js:110` - competition object is converted to legacy raw shape.
  - API/Type: `card-studio/services/resultsStore.js:145` - only `YYYY.json` result files are loaded.
  - API/Type: `card-studio/services/resultsStore.js:228` - exported service functions consumed by search/API.
  - API/Type: `card-studio/services/recordAnalyticsService.js:187` - `manualTopRecordStats` fields.
  - API/Type: `card-studio/services/recordAnalyticsService.js:314` - `data/results` dedupe keys are collected before manual candidates append.
  - API/Type: `card-studio/services/recordAnalyticsService.js:469` - manual candidate dedupe key construction.
  - API/Type: `card-studio/services/recordAnalyticsService.js:475` - duplicate manual TOP100 rows increment `skippedDuplicates`.
  - API/Type: `card-studio/services/recordAnalyticsService.js:898` - dedupe key format: normalized name + event key + date + normalized record.
  - Test:     `backend/tests/manual-top-records-ingest.test.js:123` - existing exact manual TOP100 stats assertion to update after promotion.
  - Test:     `backend/tests/manual-top-records-ingest.test.js:131` - existing duplicate-row assertion must still pass with `data/results` preferred.

  Acceptance criteria (agent-executable only):
  - [ ] `node tools/promote-track-a-xlsx-results.js --candidate-file .omo/evidence/legacy-results-normalization/track-a-2015-2017/normalized-candidates.jsonl --inspection-file .omo/evidence/legacy-results-normalization/track-a-2015-2017/xlsx-inspection.json --out-dir data/results --index data/results/index.json --evidence-dir .omo/evidence/task-3-track-a-xlsx-promotion --write --manual-top-delta .omo/evidence/task-3-track-a-manual-top-delta.json --json > .omo/evidence/task-3-track-a-xlsx-promotion.json` exits 0.
  - [ ] `node -e "const fs=require('fs'); let n=0; for (const y of [2015,2016,2017]) for (const c of JSON.parse(fs.readFileSync('data/results/'+y+'.json','utf8'))) for (const e of c.events) n+=e.results.length; if(n!==4292) throw new Error('expected 4292 rows, got '+n);"` exits 0.
  - [ ] `node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync('.omo/evidence/task-3-track-a-manual-top-delta.json','utf8')); if(!(d.delta.skippedDuplicates>0)) throw new Error('expected positive skippedDuplicates delta'); if(d.after.skippedDuplicates-d.before.skippedDuplicates!==d.delta.skippedDuplicates) throw new Error('bad delta math');"` exits 0.
  - [ ] `node --test backend/tests/track-a-xlsx-promotion.test.js backend/tests/manual-top-records-ingest.test.js` passes.
  - [ ] `git diff --name-only -- docs/data-candidates/batches | node -e "const fs=require('fs'); const s=fs.readFileSync(0,'utf8'); if(/candidate-records\\.jsonl/.test(s)) throw new Error('candidate-records changed');"` exits 0.

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: production data files are generated with approved counts
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "node tools/promote-track-a-xlsx-results.js --candidate-file .omo/evidence/legacy-results-normalization/track-a-2015-2017/normalized-candidates.jsonl --inspection-file .omo/evidence/legacy-results-normalization/track-a-2015-2017/xlsx-inspection.json --out-dir data/results --index data/results/index.json --evidence-dir .omo/evidence/task-3-track-a-xlsx-promotion --write --manual-top-delta .omo/evidence/task-3-track-a-manual-top-delta.json --json | Set-Content .omo/evidence/task-3-track-a-xlsx-promotion.json; node --test backend/tests/track-a-xlsx-promotion.test.js backend/tests/manual-top-records-ingest.test.js *> .omo/evidence/task-3-track-a-xlsx-promotion.tap"
    Expected: command exits 0; three year files and updated index exist; tests pass; evidence records 4,292 rows and positive skippedDuplicates delta.
    Evidence: .omo/evidence/task-3-track-a-xlsx-promotion.json

  Scenario: candidate-record files remain frozen
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "git diff --name-only -- docs/data-candidates/batches | Set-Content .omo/evidence/task-3-track-a-candidate-freeze.txt; node -e \"const fs=require('fs'); const s=fs.readFileSync('.omo/evidence/task-3-track-a-candidate-freeze.txt','utf8'); if(/candidate-records\\.jsonl/.test(s)) throw new Error('candidate-records changed');\""
    Expected: command exits 0 and freeze evidence contains no `candidate-records.jsonl` path.
    Evidence: .omo/evidence/task-3-track-a-candidate-freeze.txt
  ```

  Commit: YES | Message: `feat(data): promote Track A xlsx results` | Files: [`data/results/2015.json`, `data/results/2016.json`, `data/results/2017.json`, `data/results/index.json`, `backend/tests/manual-top-records-ingest.test.js`, `.omo/evidence/task-3-track-a-xlsx-promotion.json`, `.omo/evidence/task-3-track-a-manual-top-delta.json`]

- [ ] 4. Add results service and API regression coverage for promoted years

  What to do: Extend service/API tests so `resultsStore`, `searchService`, `recordAnalyticsService`, and public result endpoints read the new 2015-2017 files without code changes. Include exact checks for year filters, one promoted event endpoint, and analytics search for promoted historical rows.
  Must NOT do: Do not change API route contracts or frontend types unless tests prove the existing contract is broken.

  Parallelization: Can parallel: YES | Wave 3 | Blocks: [6] | Blocked by: [3]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `card-studio/services/searchService.js:34` - `getCompetitions()` prefers `resultsStore`.
  - Pattern:  `card-studio/services/searchService.js:296` - search target loading prefers `resultsStore`.
  - API/Type: `card-studio/routes/publicRoutes.js:558` - public `GET /results/competitions` route.
  - API/Type: `card-studio/routes/publicRoutes.js:585` - public `GET /results/:filename/events` route.
  - API/Type: `card-studio/routes/resultEventsRoute.js:18` - result event handler reads from `resultsStore`.
  - API/Type: `card-studio/routes/resultEventsRoute.js:166` - event endpoint response envelope.
  - API/Type: `card-studio/routes/publicRoutes.js:215` - analytics search endpoint.
  - API/Type: `card-studio/routes/publicRoutes.js:252` - athlete analytics profile endpoint.
  - API/Type: `frontend/src/api/competitions.ts:401` - frontend result competition API shape.
  - API/Type: `frontend/src/api/competitions.ts:417` - frontend result event API shape.
  - Test:     `backend/tests/competition-results-order.test.js:35` - existing result competition ordering test.
  - Test:     `backend/tests/competition-results-order.test.js:54` - existing public filename exclusion regression pattern.
  - Test:     `backend/tests/manual-top-records-ingest.test.js:91` - analytics search test pattern.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/competition-results-order.test.js backend/tests/track-a-xlsx-promotion.test.js backend/tests/manual-top-records-ingest.test.js` passes.
  - [ ] New assertions prove `searchService.getCompetitions().filter(c => c.year === '2015').length === 4`, `2016 === 4`, and `2017 === 2`.
  - [ ] New assertions prove `resultsStore.getRawByFilename('2015__2015-track_field-0288.json')` returns non-null and has visible event rows.
  - [ ] New analytics assertion proves search for `\uAE40\uAD6D\uC601` returns a profile containing a 2015 `10.45` `source.sourceType === 'public_result'` row, and search for `\uCD5C\uC120\uBBFC` returns a 2016 `11.25` public result row.

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: promoted years are visible through service tests
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "node --test backend/tests/competition-results-order.test.js backend/tests/track-a-xlsx-promotion.test.js backend/tests/manual-top-records-ingest.test.js *> .omo/evidence/task-4-track-a-xlsx-promotion.tap"
    Expected: command exits 0 and TAP contains passing assertions for 2015=4, 2016=4, 2017=2 promoted competitions.
    Evidence: .omo/evidence/task-4-track-a-xlsx-promotion.tap

  Scenario: malformed promoted filename still returns 400/404 without leaking paths
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "$env:PORT='4311'; $p=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -WindowStyle Hidden -RedirectStandardOutput '.omo/evidence/task-4-server.log' -RedirectStandardError '.omo/evidence/task-4-server.err'; Start-Sleep -Seconds 4; try { curl.exe -s -i 'http://127.0.0.1:4311/api/card-studio/results/..%2Fsecret/events' | Set-Content .omo/evidence/task-4-track-a-xlsx-promotion-error.http; node -e \"const fs=require('fs'); const s=fs.readFileSync('.omo/evidence/task-4-track-a-xlsx-promotion-error.http','utf8'); if(!/^HTTP\\/1\\.1 400/m.test(s)) throw new Error('expected 400'); if(/data\\/sources\\/import\\/originals|privateStoragePath/i.test(s)) throw new Error('leaked private path');\" } finally { Stop-Process -Id $p.Id -Force }"
    Expected: HTTP response is 400 and contains no private source path.
    Evidence: .omo/evidence/task-4-track-a-xlsx-promotion-error.http
  ```

  Commit: YES | Message: `test(data): verify Track A result services` | Files: [`backend/tests/competition-results-order.test.js`, `backend/tests/track-a-xlsx-promotion.test.js`, `.omo/evidence/task-4-track-a-xlsx-promotion.tap`, `.omo/evidence/task-4-track-a-xlsx-promotion-error.http`]

- [ ] 5. Add promotion guardrail coverage

  What to do: Add or extend tests that fail if the promotion includes `.xls`, non-elite workbooks, private source paths, sensitive keys, raw originals, or candidate-record changes. Add a small evidence summary proving `git ls-files data/sources/import/originals` is still empty and the only `data/results` year files added are 2015-2017 plus index update.
  Must NOT do: Do not broaden this into full data-quality cleanup or unrelated candidate review work.

  Parallelization: Can parallel: YES | Wave 3 | Blocks: [6] | Blocked by: [2, 3]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `backend/tests/kaaf-backfill-originals-import.test.js:23` - private originals / manifest safety pattern.
  - Pattern:  `backend/tests/kaaf-backfill-originals-import.test.js:49` - manifests should not expose local `filePath`.
  - Pattern:  `backend/tests/legacy-result-normalization.test.js:68` - original vault must not be committed.
  - Pattern:  `backend/tests/legacy-result-normalization.test.js:99` - normalized candidates include approved Track A spot-check names.
  - Pattern:  `backend/tests/legacy-result-normalization.test.js:101` - header text pollution must not be emitted.
  - Pattern:  `backend/tests/legacy-result-normalization.test.js:104` - `PERSON_NO` must not be emitted.
  - Pattern:  `docs/work-orders/20260708-top100-promotion-and-legacy-normalization.md:135` - data protection rules for normalized output.
  - Pattern:  `docs/work-orders/20260708-top100-promotion-and-legacy-normalization.md:137` - raw source files must not be committed.
  - Pattern:  `docs/work-orders/20260708-top100-promotion-and-legacy-normalization.md:138` - sensitive source fields must not appear in normalized output.
  - Test:     `backend/tests/data-candidate-batch.test.js` - existing candidate batch test location if freeze checks fit better there.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/track-a-xlsx-promotion.test.js backend/tests/legacy-result-normalization.test.js backend/tests/kaaf-backfill-originals-import.test.js` passes.
  - [ ] `git ls-files data/sources/import/originals | node -e "const fs=require('fs'); const s=fs.readFileSync(0,'utf8').trim(); if(s) throw new Error('raw originals committed: '+s);"` exits 0.
  - [ ] `node -e "const fs=require('fs'); const text=['2015','2016','2017'].map(y=>fs.readFileSync('data/results/'+y+'.json','utf8')).join('\n'); if(/privateStoragePath|PERSON_NO|birthDate|birthdate|resident|phone|email|contact|address|\\.xls/i.test(text)) throw new Error('forbidden token in promoted data');"` exits 0.
  - [ ] `git diff --name-only origin/main...HEAD | node -e "const fs=require('fs'); const changed=fs.readFileSync(0,'utf8').trim().split(/\\r?\\n/).filter(Boolean); const bad=changed.filter(p=>/candidate-records\\.jsonl$/.test(p)||/^data\\/sources\\/import\\/originals\\//.test(p)); if(bad.length) throw new Error('forbidden changed files: '+bad.join(','));"` exits 0.

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: forbidden file changes are absent
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "git diff --name-only origin/main...HEAD | Set-Content .omo/evidence/task-5-track-a-xlsx-promotion-files.txt; node -e \"const fs=require('fs'); const changed=fs.readFileSync('.omo/evidence/task-5-track-a-xlsx-promotion-files.txt','utf8').trim().split(/\\r?\\n/).filter(Boolean); const bad=changed.filter(p=>/candidate-records\\.jsonl$/.test(p)||/^data\\/sources\\/import\\/originals\\//.test(p)); if(bad.length) throw new Error('forbidden changed files: '+bad.join(','));\""
    Expected: command exits 0 and evidence lists no candidate-record/raw-original changes.
    Evidence: .omo/evidence/task-5-track-a-xlsx-promotion-files.txt

  Scenario: promoted public JSON contains no private or sensitive tokens
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "node -e \"const fs=require('fs'); const text=['2015','2016','2017'].map(y=>fs.readFileSync('data/results/'+y+'.json','utf8')).join('\\n'); const bad=text.match(/privateStoragePath|PERSON_NO|birthDate|birthdate|resident|phone|email|contact|address|\\.xls/i); if(bad) throw new Error('forbidden token: '+bad[0]);\" *> .omo/evidence/task-5-track-a-xlsx-promotion.txt"
    Expected: command exits 0 and evidence contains no forbidden token.
    Evidence: .omo/evidence/task-5-track-a-xlsx-promotion.txt
  ```

  Commit: YES | Message: `test(data): enforce Track A promotion guardrails` | Files: [`backend/tests/track-a-xlsx-promotion.test.js`, `backend/tests/legacy-result-normalization.test.js`, `.omo/evidence/task-5-track-a-xlsx-promotion-files.txt`, `.omo/evidence/task-5-track-a-xlsx-promotion.txt`]

- [ ] 6. Capture HTTP/CLI QA evidence and prepare PR boundary

  What to do: Run final targeted tests, run full `npm test`, start the local server on a non-default QA port, capture HTTP responses for result competitions, event details, analytics search/profile, and write a PR-ready evidence summary to `.omo/evidence/task-6-track-a-xlsx-promotion.md`. Create the branch/commits/PR as specified below.
  Must NOT do: Do not merge the PR, do not mark complete before F1-F4 all approve and the caller gives explicit okay.

  Parallelization: Can parallel: NO | Wave 4 | Blocks: [] | Blocked by: [4, 5]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `package.json:16` - full repository test command.
  - Pattern:  `package.json:21` - existing Track A normalization script for context.
  - API/Type: `src/server.js:198` - card-studio public routes mounted under `/api/card-studio`.
  - API/Type: `src/server.js:207` - analytics warmup logs stats on server start.
  - API/Type: `src/server.js:459` - server logs active port.
  - API/Type: `card-studio/routes/publicRoutes.js:558` - result competition HTTP QA target.
  - API/Type: `card-studio/routes/publicRoutes.js:585` - result events HTTP QA target.
  - API/Type: `card-studio/routes/publicRoutes.js:215` - analytics search HTTP QA target.
  - API/Type: `card-studio/routes/publicRoutes.js:252` - athlete profile HTTP QA target.
  - External: `https://nodejs.org/api/test.html` - official `node --test` CLI docs.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/track-a-xlsx-promotion.test.js backend/tests/competition-results-order.test.js backend/tests/manual-top-records-ingest.test.js backend/tests/legacy-result-normalization.test.js backend/tests/kaaf-backfill-originals-import.test.js` passes.
  - [ ] `npm test` passes.
  - [ ] HTTP QA evidence files exist: `.omo/evidence/task-6-http-competitions-2015.json`, `.omo/evidence/task-6-http-events-2015.json`, `.omo/evidence/task-6-http-search-kim.json`, `.omo/evidence/task-6-http-profile-kim.json`.
  - [ ] `.omo/evidence/task-6-track-a-xlsx-promotion.md` includes the exact `manualTopRecordStats.skippedDuplicates` before, after, and delta values from `.omo/evidence/task-3-track-a-manual-top-delta.json`.
  - [ ] `git log --oneline origin/main..HEAD` shows only Track A xlsx promotion commits and no Track H/Track F/unrelated work.

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: HTTP result and analytics QA on local server
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "$env:PORT='4311'; $p=Start-Process -FilePath node -ArgumentList 'src/server.js' -PassThru -WindowStyle Hidden -RedirectStandardOutput '.omo/evidence/task-6-server.log' -RedirectStandardError '.omo/evidence/task-6-server.err'; Start-Sleep -Seconds 5; try { curl.exe -s 'http://127.0.0.1:4311/api/card-studio/results/competitions?year=2015' | Set-Content .omo/evidence/task-6-http-competitions-2015.json; curl.exe -s 'http://127.0.0.1:4311/api/card-studio/results/2015__2015-track_field-0288.json/events' | Set-Content .omo/evidence/task-6-http-events-2015.json; curl.exe -s 'http://127.0.0.1:4311/api/card-studio/analytics/records/search?q=%EA%B9%80%EA%B5%AD%EC%98%81&limit=5' | Set-Content .omo/evidence/task-6-http-search-kim.json; node -e \"const fs=require('fs'); const s=JSON.parse(fs.readFileSync('.omo/evidence/task-6-http-search-kim.json','utf8')); if(!s.success||!s.data.length) throw new Error('no search results'); console.log(s.data[0].athleteKey)\" | Set-Content .omo/evidence/task-6-kim-athlete-key.txt; $key=Get-Content .omo/evidence/task-6-kim-athlete-key.txt; curl.exe -s ""http://127.0.0.1:4311/api/card-studio/analytics/athletes/$key"" | Set-Content .omo/evidence/task-6-http-profile-kim.json; node -e \"const fs=require('fs'); const comps=JSON.parse(fs.readFileSync('.omo/evidence/task-6-http-competitions-2015.json','utf8')); if(!comps.success||comps.total!==4) throw new Error('bad 2015 competitions'); const events=JSON.parse(fs.readFileSync('.omo/evidence/task-6-http-events-2015.json','utf8')); if(!events.success||events.data.totalAthletes<=0) throw new Error('bad event payload'); const profile=JSON.parse(fs.readFileSync('.omo/evidence/task-6-http-profile-kim.json','utf8')); const hit=profile.data.records.some(r=>r.season===2015&&r.record==='10.45'&&r.source.sourceType==='public_result'); if(!hit) throw new Error('missing promoted Kim 10.45 public_result');\" } finally { Stop-Process -Id $p.Id -Force }"
    Expected: all HTTP responses are successful; 2015 competition total is 4; event payload has athletes; analytics profile includes 2015 Kim Kukyoung 10.45 as `public_result`.
    Evidence: .omo/evidence/task-6-http-profile-kim.json

  Scenario: full CLI verification and PR boundary audit
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "npm test *> .omo/evidence/task-6-npm-test.tap; git log --oneline origin/main..HEAD | Set-Content .omo/evidence/task-6-commits.txt; git diff --name-only origin/main...HEAD | Set-Content .omo/evidence/task-6-files.txt; node -e \"const fs=require('fs'); const files=fs.readFileSync('.omo/evidence/task-6-files.txt','utf8'); if(/candidate-records\\.jsonl|data\\/sources\\/import\\/originals|Track H|community/i.test(files)) throw new Error('scope leak'); const d=JSON.parse(fs.readFileSync('.omo/evidence/task-3-track-a-manual-top-delta.json','utf8')); fs.writeFileSync('.omo/evidence/task-6-track-a-xlsx-promotion.md', ['# Track A XLSX Promotion QA', '', '- npm test: pass', '- skippedDuplicates before: '+d.before.skippedDuplicates, '- skippedDuplicates after: '+d.after.skippedDuplicates, '- skippedDuplicates delta: '+d.delta.skippedDuplicates, '- PR scope: Track A xlsx data/results only', ''].join('\\n'));\""
    Expected: `npm test` exits 0, scope audit exits 0, and summary markdown includes skippedDuplicates before/after/delta.
    Evidence: .omo/evidence/task-6-track-a-xlsx-promotion.md
  ```

  Commit: YES | Message: `docs(data): attach Track A xlsx promotion evidence` | Files: [`.omo/evidence/task-6-track-a-xlsx-promotion.md`, `.omo/evidence/task-6-npm-test.tap`, `.omo/evidence/task-6-commits.txt`, `.omo/evidence/task-6-files.txt`, `.omo/evidence/task-6-http-competitions-2015.json`, `.omo/evidence/task-6-http-events-2015.json`, `.omo/evidence/task-6-http-search-kim.json`, `.omo/evidence/task-6-http-profile-kim.json`]

## Final verification wave (MANDATORY - after all implementation tasks)
> Runs in PARALLEL. ALL must APPROVE. Surface results to the caller and wait for an explicit "okay" before declaring complete.
- [ ] F1. Plan compliance audit - every task done, every acceptance criterion met
- [ ] F2. Code quality review - diagnostics clean, idioms match, no dead code
- [ ] F3. Real manual QA - every QA scenario executed with evidence captured
- [ ] F4. Scope fidelity - nothing extra shipped beyond Must-Have, nothing Must-NOT-Have introduced

## Commit strategy
- One PR only: `codex/track-a-xlsx-results-promotion` -> `main`.
- PR title: `feat(data): promote Track A xlsx legacy results`.
- PR body must include:
  - exact promoted counts: 10 `.xlsx` workbooks, 4,292 rows, 2015=1,009, 2016=2,390, 2017=893
  - `.xls` deferred count: 83
  - `manualTopRecordStats.skippedDuplicates` before/after/delta
  - test commands and evidence paths
  - explicit statement: `docs/data-candidates/**/candidate-records.jsonl was not changed`
- One logical change per commit. Conventional Commits (`<type>(<scope>): <subject>` body + footer).
- Atomic: every commit builds and passes tests on its own.
- No "WIP" / "fix typo squash later" commits on the final branch - clean up before merge.
- Reference the plan file path in the final commit footer: `Plan: .omo/plans/athletetime-track-a-xlsx-promotion.md`.

## Success criteria
- All Must-Have shipped; all QA scenarios pass with captured evidence; F1-F4 approved; commit history clean.
