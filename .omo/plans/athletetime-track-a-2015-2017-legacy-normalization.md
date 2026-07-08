# AthleteTime Track A 2015-2017 Legacy Spreadsheet Normalization

## TL;DR
> Summary:      Ship the first Track A slice after PR #31/#32 by normalizing only the 2015-2017 KAAF legacy `.xls/.xlsx` originals into `data/results/2015.json`, `data/results/2016.json`, and `data/results/2017.json`, with tests, evidence, and coverage copy updated in the same PR.
> Deliverables:
> - Test-first legacy spreadsheet normalizer with `--year`, `--file`, `--dry-run`, and JSON report modes.
> - 2015-2017 spreadsheet-only result JSON files, failure/skip reports, spot-check evidence, checklist updates, and coverage copy updates.
> - Manual QA evidence for resultsStore, records API, Records page copy, and TOP100 dedup delta.
> Effort:       Large
> Risk:         High - legacy workbook formats vary and the committed manifest/checklist paths and 2015 counts disagree, so source-set reconciliation must happen before parsing.

## Scope
### Must have
- Use the approved Track A first slice: 2015-2017 before 2012-2014, from `docs/work-orders/20260708-remaining-tracks-full-order.md:10-20` and `docs/work-orders/20260708-top100-promotion-and-legacy-normalization.md:127-133`.
- Normalize only `.xls` and `.xlsx` files for 2015-2017. Based on the committed manifest, this is 103 spreadsheet files: 2015 has 37, 2016 has 35, and 2017 has 31.
- Treat `data/sources/manifests/20260708-kaaf-backfill-2005-2017-manifest.json` as the executable source-set contract; it records 428 total files and marks originals as non-public evidence in `data/sources/manifests/20260708-kaaf-backfill-2005-2017-report.md:3-7` and `data/sources/manifests/20260708-kaaf-backfill-2005-2017-report.md:31-33`.
- Reconcile and document the known source discrepancy before parsing: the aggregate manifest reports 2015 as 53 total files, while the review report/checklist say 52 downloaded attachments in `docs/data-candidates/batches/2005-current-backfill/review-report.md:80-90` and `docs/data-candidates/batches/2005-current-backfill/year-checklist.csv:12`.
- Restore private originals from `C:/Users/SAMSUNG/Downloads/kaaf_backfill_originals_2005-2017_2026-07-08.tar.gz` if `data/sources/import/originals/20260708-kaaf-backfill-2005-2017/` is absent, using the existing import script pattern in `tools/import-kaaf-backfill-originals.js:303-343`.
- Output existing `data/results/<year>.json` competition-array schema without changing adapters, per `docs/work-orders/20260708-top100-promotion-and-legacy-normalization.md:91-112` and `card-studio/services/resultsStore.js:9-25`.
- Keep failures and ambiguous rows in `.omo/evidence/legacy-results-normalization/` reports, per `docs/work-orders/20260708-top100-promotion-and-legacy-normalization.md:118-121`.
- Update `docs/data-candidates/batches/2005-current-backfill/year-checklist.csv` statuses for 2015-2017 to `candidate_review_needed` before spot checks and `complete` after spot checks, using allowed statuses in `card-studio/services/dataCandidateBatchService.js:50-59`.
- Update RecordsPage/about-data/coverage copy only to the true new coverage; existing stale copy is at `frontend/src/pages/RecordsPage.tsx:469-475`, and copy must preserve the anti-official wording rules in `docs/work-orders/20260708-remaining-tracks-full-order.md:70-74`.
- Report the `manualTopRecordStats.skippedDuplicates` delta after loading 2015-2017, because PR #31's dedup rail already tracks it in `card-studio/services/recordAnalyticsService.js:186-194` and `card-studio/services/recordAnalyticsService.js:469-479`.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- Do not parse or classify PDF/HWP files in this slice; Track B is explicitly later in `docs/work-orders/20260708-remaining-tracks-full-order.md:22-27`.
- Do not normalize 2012-2014, 2009-2011, or 2005-2008 in this PR.
- Do not redesign TOP100 promotion, manual TOP100 ingest, or dedup logic; PR #31 already merged that rail, and current tests pin counts in `backend/tests/manual-top-records-ingest.test.js:123-131`.
- Do not change the public result schema, `resultsStore` adapter shape, athlete identity resolution, or dataRequestService suppression behavior.
- Do not commit raw originals, raw workbook extracts, birth data, source-side identifiers, cookies, session IDs, or raw HTML; `.gitignore` excludes originals in `.gitignore:56-57`, and the batch README forbids those artifacts in `docs/data-candidates/batches/2005-current-backfill/README.md:30-40`.
- Do not scrape `result.kaaf.or.kr`, bypass blocked paths, or crawl beyond the already stored originals; blocked/source rules are documented in `docs/athletetime-coverage-matrix.md:35-50`.
- Do not claim "official", "verified", "complete", "ranking", or full national coverage in service copy; coverage language must stay in the "public records collected and organized" lane from `docs/athletetime-coverage-matrix.md:52-64`.
- Do not expose team relay/road-relay member rows as individual athlete records; team schema is Track C in `docs/work-orders/20260708-remaining-tracks-full-order.md:29-40`.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: TDD + Node `node:test` for tools/services, then tests-after for generated data and frontend copy. Spreadsheet parser tasks must capture red evidence before implementation and green evidence after implementation.
- QA policy: every task has agent-executed scenarios
- Evidence: `.omo/evidence/task-<N>-<slug>.<ext>`

## Execution strategy
### Parallel execution waves
> Target 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks to maximize parallelism.

Wave 1 (no dependencies):
- Task 1: Source-set gate and private-original restore contract
- Task 2: Spreadsheet reader dependency and fixture harness
- Task 3: Result schema validator and privacy scan
- Task 4: Evidence/report contract for parser failures and spot checks
- Task 5: Baseline analytics, dedup, and coverage snapshot tests

Wave 2 (after Wave 1):
- Task 6: Workbook row extraction and event/result classifier, depends [2, 3, 4]
- Task 7: Normalizer CLI orchestration and idempotence, depends [1, 2, 3, 4, 6]
- Task 8: Year checklist updater and candidate-batch validator integration, depends [1, 4, 7]

Wave 3 (after Wave 2):
- Task 9: Normalize and verify 2015 spreadsheet files, depends [7, 8]
- Task 10: Normalize and verify 2016 spreadsheet files, depends [7, 8]
- Task 11: Normalize and verify 2017 spreadsheet files, depends [7, 8]

Wave 4 (after Wave 3):
- Task 12: ResultsStore, analytics, and API dedup verification, depends [9, 10, 11]
- Task 13: Coverage copy, about-data, and coverage matrix updates, depends [9, 10, 11]
- Task 14: PR evidence bundle and operator report, depends [12, 13]

Critical path: Task 1 -> Task 7 -> Task 9 -> Task 12 -> Task 14

### Dependency matrix
| Task | Depends on | Blocks | Can parallelize with |
|------|------------|--------|----------------------|
| 1    | none       | 7, 8, 9, 10, 11 | 2, 3, 4, 5 |
| 2    | none       | 6, 7 | 1, 3, 4, 5 |
| 3    | none       | 6, 7 | 1, 2, 4, 5 |
| 4    | none       | 6, 7, 8 | 1, 2, 3, 5 |
| 5    | none       | 12, 13, 14 | 1, 2, 3, 4 |
| 6    | 2, 3, 4   | 7 | 8 after 7 begins is not allowed |
| 7    | 1, 2, 3, 4, 6 | 8, 9, 10, 11 | none |
| 8    | 1, 4, 7   | 9, 10, 11 | none |
| 9    | 7, 8      | 12, 13, 14 | 10, 11 |
| 10   | 7, 8      | 12, 13, 14 | 9, 11 |
| 11   | 7, 8      | 12, 13, 14 | 9, 10 |
| 12   | 9, 10, 11 | 14 | 13 |
| 13   | 9, 10, 11 | 14 | 12 |
| 14   | 12, 13    | final verification | none |

## Todos
> Implementation + Test = ONE task. Never separate.
> Every task MUST have: References + Acceptance Criteria + QA Scenarios + Commit.

- [ ] 1. Source-set gate and private-original restore contract

  What to do: Add a source-set helper and tests that select only 2015-2017 `.xls/.xlsx` rows from `data/sources/manifests/20260708-kaaf-backfill-2005-2017-manifest.json`, verify the expected 103 spreadsheet files, document the 2015 52-vs-53 discrepancy, and provide a deterministic restore path for private originals using the owner archive if local originals are absent. The helper must read from manifest `privateStoragePath`, not from the stale checklist private path.
  Must NOT do: Do not parse workbook contents, do not edit `data/results`, and do not commit restored originals.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [7, 8, 9, 10, 11] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `tools/import-kaaf-backfill-originals.js:303-343` - existing archive import CLI, JSON output, and storage safety pattern.
  - Pattern:  `tools/import-kaaf-backfill-originals.js:215-259` - manifest fields to preserve when selecting files.
  - Pattern:  `.gitignore:56-57` - raw originals must remain ignored.
  - Pattern:  `data/sources/manifests/20260708-kaaf-backfill-2005-2017-report.md:3-7` - committed manifest says 428 files, originals not tracked.
  - Pattern:  `docs/data-candidates/batches/2005-current-backfill/review-report.md:68-78` - harvest report says 428 private originals and source ledger rows.
  - Pattern:  `docs/data-candidates/batches/2005-current-backfill/year-checklist.csv:12-14` - checklist rows for 2015-2017.
  - Test:     `backend/tests/kaaf-backfill-originals-import.test.js:23-55` - private-original import test style.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/legacy-results-source-set.test.js --test-name-pattern "SOURCE-SET"` exits 0 and asserts 2015=37, 2016=35, 2017=31 spreadsheet files.
  - [ ] `node tools/normalize-legacy-results.js --source-set --years 2015,2016,2017 --json` exits 0 after Task 7 and writes JSON with `spreadsheetFileCount:103`, `excludedExtensions:[".pdf"]`, and no `.hwp`.
  - [ ] `git check-ignore -q data/sources/import/originals/20260708-kaaf-backfill-2005-2017/2015/example.xls` exits 0.

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: source-set selects the approved first slice
    Tool:     bash
    Steps:    mkdir -p .omo/evidence && node --test backend/tests/legacy-results-source-set.test.js --test-name-pattern "SOURCE-SET" | tee .omo/evidence/task-1-source-set.tap
    Expected: TAP output shows ok; evidence includes assertions for 2015=37, 2016=35, 2017=31, total=103.
    Evidence: .omo/evidence/task-1-source-set.tap

  Scenario: missing archive fails with typed operator guidance
    Tool:     bash
    Steps:    node tools/import-kaaf-backfill-originals.js --archive C:/Users/SAMSUNG/Downloads/missing-kaaf-backfill.tar.gz --batch 20260708-kaaf-backfill-2005-2017 --json > .omo/evidence/task-1-source-set-error.json; test $? -ne 0
    Expected: JSON contains "BACKFILL_ARCHIVE_NOT_FOUND" and does not print stack traces or raw identifiers.
    Evidence: .omo/evidence/task-1-source-set-error.json
  ```

  Commit: YES | Message: `test(data): gate legacy spreadsheet source set` | Files: [`backend/tests/legacy-results-source-set.test.js`, `tools/lib/legacyResultsSourceSet.js`, `.omo/evidence/task-1-source-set.*`]

- [ ] 2. Spreadsheet reader dependency and fixture harness

  What to do: Add the SheetJS `xlsx` dependency and a small CommonJS workbook reader that accepts file paths/Buffers and returns all worksheets as arrays of arrays. Add tests that generate minimal `.xlsx` and `.xls` fixtures at runtime, read both, and prove no private originals are needed for unit tests.
  Must NOT do: Do not put private KAAF files under `data/fixtures`; use synthetic fixtures only.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [6, 7] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `package.json:31-44` - root runtime dependencies location.
  - Pattern:  `package-lock.json` - must update with `npm install xlsx --save`.
  - Pattern:  `backend/tests/kaaf-result-catalog.test.js:63-90` - test style for generated fixture metadata.
  - External: `https://docs.sheetjs.com/docs/demos/local/file` - SheetJS Node pattern reads a file into a Buffer and parses it.
  - External: `https://docs.sheetjs.com/docs/solutions/output` - SheetJS `sheet_to_json(..., { header: 1 })` converts worksheets to arrays of arrays.

  Acceptance criteria (agent-executable only):
  - [ ] `node -e "const XLSX=require('xlsx'); console.log(typeof XLSX.read, typeof XLSX.utils.sheet_to_json)"` prints `function function`.
  - [ ] `node --test backend/tests/legacy-spreadsheet-reader.test.js` exits 0 and proves both `.xls` and `.xlsx` synthetic fixtures round-trip to row arrays.
  - [ ] `find data/fixtures -type f \( -iname '*.xls' -o -iname '*.xlsx' \) | wc -l` prints `0`.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: reader handles synthetic XLS and XLSX
    Tool:     bash
    Steps:    mkdir -p .omo/evidence && node --test backend/tests/legacy-spreadsheet-reader.test.js | tee .omo/evidence/task-2-spreadsheet-reader.tap
    Expected: TAP output shows ok for XLS and XLSX runtime-generated fixtures.
    Evidence: .omo/evidence/task-2-spreadsheet-reader.tap

  Scenario: corrupt workbook returns typed parse error
    Tool:     bash
    Steps:    node --test backend/tests/legacy-spreadsheet-reader.test.js --test-name-pattern "corrupt workbook" | tee .omo/evidence/task-2-spreadsheet-reader-error.tap
    Expected: Test asserts error code `LEGACY_WORKBOOK_PARSE_FAILED` and no raw binary bytes are printed.
    Evidence: .omo/evidence/task-2-spreadsheet-reader-error.tap
  ```

  Commit: YES | Message: `test(data): add legacy spreadsheet reader fixtures` | Files: [`package.json`, `package-lock.json`, `backend/tests/legacy-spreadsheet-reader.test.js`, `tools/lib/legacySpreadsheetReader.js`, `.omo/evidence/task-2-spreadsheet-reader*.tap`]

- [ ] 3. Result schema validator and privacy scan

  What to do: Add a reusable validator for normalized legacy competition bundles. It must enforce the existing `data/results/<year>.json` array shape, required event/result fields, `competitionId` format `<year>-<track|road>-<seq>`, no restricted keys, and no official/verified/ranking wording in generated notes.
  Must NOT do: Do not modify `resultsStore` or public routes in this task.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [6, 7] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - API/Type: `docs/work-orders/20260708-top100-promotion-and-legacy-normalization.md:91-112` - required output schema and `competitionId` rule.
  - API/Type: `card-studio/services/resultsStore.js:110-128` - adapter fields consumed from each competition.
  - Pattern:  `card-studio/services/dataCandidateBatchService.js:61-89` - restricted key vocabulary to reuse or mirror.
  - Pattern:  `docs/data-candidates/batches/2005-current-backfill/README.md:30-40` - restricted artifacts that must not be committed.
  - Test:     `backend/tests/data-candidate-batch.test.js:125-195` - privacy and stale-count test style.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/legacy-results-schema.test.js` exits 0.
  - [ ] `tools/lib/legacyResultsSchema.js` exports a documented `validateLegacyYearResults(results, { year })` CommonJS function, and `backend/tests/legacy-results-schema.test.js` asserts the export contract.
  - [ ] `node --test backend/tests/legacy-results-schema.test.js --test-name-pattern "restricted"` proves `person_no`, `birthDate`, `phone`, `email`, `rawHtml`, and `JSESSIONID` are rejected.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: valid normalized bundle passes schema
    Tool:     bash
    Steps:    mkdir -p .omo/evidence && node --test backend/tests/legacy-results-schema.test.js --test-name-pattern "valid bundle" | tee .omo/evidence/task-3-schema.tap
    Expected: TAP output shows ok and validates competition, event, and result required fields.
    Evidence: .omo/evidence/task-3-schema.tap

  Scenario: restricted keys are rejected
    Tool:     bash
    Steps:    node --test backend/tests/legacy-results-schema.test.js --test-name-pattern "restricted" | tee .omo/evidence/task-3-schema-error.tap
    Expected: TAP output shows ok because the validator rejects unsafe input with `LEGACY_RESULT_RESTRICTED_FIELD`.
    Evidence: .omo/evidence/task-3-schema-error.tap
  ```

  Commit: YES | Message: `test(data): validate legacy result schema` | Files: [`backend/tests/legacy-results-schema.test.js`, `tools/lib/legacyResultsSchema.js`, `.omo/evidence/task-3-schema*.tap`]

- [ ] 4. Evidence/report contract for parser failures and spot checks

  What to do: Define machine-readable evidence schemas and helpers for normalization reports, failure/skip rows, and spot-check reports under `.omo/evidence/legacy-results-normalization/`. The report must include year, input file count, parsed competition count, event count, result row count, skipped file count, failed file count, file-level failure reasons, and spot-check source references.
  Must NOT do: Do not mark any real year complete in this task.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [6, 7, 8] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `docs/work-orders/20260708-top100-promotion-and-legacy-normalization.md:120-126` - required failure/skip report and checklist progression.
  - Pattern:  `docs/work-orders/20260708-remaining-tracks-full-order.md:15-20` - PR must report spot checks, failure report, checklist update, and dedup delta.
  - Pattern:  `backend/tests/relay-results-standard.test.js:101-118` - existing machine-readable blocker report test style.
  - Pattern:  `scripts/report-relay-reverify-holds.js` - existing report CLI naming pattern.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/legacy-normalization-report.test.js` exits 0.
  - [ ] Report helper writes JSON to `.omo/evidence/legacy-results-normalization/<year>-report.json` and Markdown to `.omo/evidence/legacy-results-normalization/<year>-report.md`.
  - [ ] Failure report test asserts ambiguous rows are retained with row coordinates and reason codes, not dropped silently.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: report helper writes complete machine-readable evidence
    Tool:     bash
    Steps:    mkdir -p .omo/evidence && node --test backend/tests/legacy-normalization-report.test.js --test-name-pattern "report helper" | tee .omo/evidence/task-4-report.tap
    Expected: TAP output shows ok and fixture report includes year, file counts, event counts, result counts, and spotCheck array.
    Evidence: .omo/evidence/task-4-report.tap

  Scenario: ambiguous rows are recorded, not discarded
    Tool:     bash
    Steps:    node --test backend/tests/legacy-normalization-report.test.js --test-name-pattern "ambiguous" | tee .omo/evidence/task-4-report-error.tap
    Expected: TAP output shows ok and generated report includes reason `LEGACY_ROW_AMBIGUOUS`.
    Evidence: .omo/evidence/task-4-report-error.tap
  ```

  Commit: YES | Message: `test(data): define legacy normalization reports` | Files: [`backend/tests/legacy-normalization-report.test.js`, `tools/lib/legacyNormalizationReport.js`, `.omo/evidence/task-4-report*.tap`]

- [ ] 5. Baseline analytics, dedup, and coverage snapshot tests

  What to do: Capture executable baselines before adding 2015-2017 result JSON: existing seasons start at 2018, RecordsPage says 2018+, and manual TOP100 `skippedDuplicates` is currently 7321. Add tests that will be updated in Task 12/13 after the slice lands.
  Must NOT do: Do not hard-code final post-import counts in this task.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [12, 13, 14] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `backend/tests/manual-top-records-ingest.test.js:110-133` - current dedup stats assertion.
  - Pattern:  `card-studio/services/recordAnalyticsService.js:166-176` - `warmup()` returns manualTopRecords stats.
  - Pattern:  `frontend/src/pages/RecordsPage.tsx:469-475` - current coverage copy.
  - Test:     `backend/tests/progressive-ux.test.js:114-120` - existing coverage transparency test.
  - Test:     `backend/tests/coverage-matrix.test.js:24-57` - coverage matrix baseline style.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/legacy-results-baseline.test.js` exits 0 before data changes.
  - [ ] `.omo/evidence/task-5-baseline.json` records `manualTopRecordStats.skippedDuplicates:7321`, `earliestResultYear:2018`, and current RecordsPage coverage text.
  - [ ] Test names clearly say baseline values must be revised after 2015-2017 data import.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: current baseline is captured before import
    Tool:     bash
    Steps:    mkdir -p .omo/evidence && node --test backend/tests/legacy-results-baseline.test.js | tee .omo/evidence/task-5-baseline.tap
    Expected: TAP output shows ok and baseline evidence JSON exists.
    Evidence: .omo/evidence/task-5-baseline.tap

  Scenario: baseline fails if unsafe full-coverage wording appears
    Tool:     bash
    Steps:    node --test backend/tests/legacy-results-baseline.test.js --test-name-pattern "coverage wording" | tee .omo/evidence/task-5-baseline-error.tap
    Expected: TAP output shows ok because the test rejects official/full-coverage wording patterns.
    Evidence: .omo/evidence/task-5-baseline-error.tap
  ```

  Commit: YES | Message: `test(data): snapshot legacy coverage baseline` | Files: [`backend/tests/legacy-results-baseline.test.js`, `.omo/evidence/task-5-baseline.*`]

- [ ] 6. Workbook row extraction and event/result classifier

  What to do: Implement workbook-to-intermediate extraction that reads all sheets, detects event headers, divisions, wind/date/venue cells, result table rows, rank/name/affiliation/record columns, and produces an intermediate structure consumed by the schema validator. Use synthetic Korean workbook fixtures for common 2015-2017 patterns and classify unrecognized tables as skipped/ambiguous with reason codes.
  Must NOT do: Do not write `data/results` directly from this helper; it only returns parsed/intermediate data and report entries.

  Parallelization: Can parallel: NO | Wave 2 | Blocks: [7] | Blocked by: [2, 3, 4]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `src/normalizer.js:40-110` - existing normalizer style for record cleanup and sorting, but do not use its older output shape directly.
  - Pattern:  `card-studio/services/recordAnalyticsService.js:629-640` - existing event normalization expects usable event labels.
  - Pattern:  `card-studio/services/resultsStore.js:110-128` - final events/results shape that downstream reads.
  - Test:     `backend/tests/competition-results-order.test.js` - existing result ordering contract.
  - External: `https://docs.sheetjs.com/docs/solutions/output` - row-array extraction with `header: 1`.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/legacy-workbook-parser.test.js` exits 0.
  - [ ] Parser tests cover at least: standard track event, field event, wind-bearing sprint, multi-sheet workbook, blank rows, Korean division labels, and ambiguous table skip.
  - [ ] Parser emits `LEGACY_TABLE_UNRECOGNIZED` for unsupported layouts without throwing.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: parser extracts events and result rows from synthetic workbook fixtures
    Tool:     bash
    Steps:    mkdir -p .omo/evidence && node --test backend/tests/legacy-workbook-parser.test.js --test-name-pattern "extracts" | tee .omo/evidence/task-6-workbook-parser.tap
    Expected: TAP output shows ok and parsed fixture has competitionName, events, ranks, names, affiliations, records, and wind where present.
    Evidence: .omo/evidence/task-6-workbook-parser.tap

  Scenario: unsupported worksheet is skipped with reason code
    Tool:     bash
    Steps:    node --test backend/tests/legacy-workbook-parser.test.js --test-name-pattern "unrecognized" | tee .omo/evidence/task-6-workbook-parser-error.tap
    Expected: TAP output shows ok and asserts skip reason `LEGACY_TABLE_UNRECOGNIZED`.
    Evidence: .omo/evidence/task-6-workbook-parser-error.tap
  ```

  Commit: YES | Message: `feat(data): parse legacy spreadsheet workbooks` | Files: [`backend/tests/legacy-workbook-parser.test.js`, `tools/lib/legacyWorkbookParser.js`, `.omo/evidence/task-6-workbook-parser*.tap`]

- [ ] 7. Normalizer CLI orchestration and idempotence

  What to do: Implement `tools/normalize-legacy-results.js` with `--year <YYYY>`, `--file <privateStoragePath|sha256|originalFilename>`, `--years 2015,2016,2017`, `--dry-run`, `--json`, `--source-set`, `--manifest`, `--out-dir`, and `--evidence-dir`. The CLI must combine source-set selection, workbook parsing, schema validation, report writing, stable `competitionId` assignment, and deterministic output order.
  Must NOT do: Do not include PDF/HWP, do not mutate files on `--dry-run`, and do not require network access.

  Parallelization: Can parallel: NO | Wave 2 | Blocks: [8, 9, 10, 11] | Blocked by: [1, 2, 3, 4, 6]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `tools/validate-data-candidates.js:27-50` - CLI arg parsing, JSON output, and exit-code pattern.
  - Pattern:  `tools/build-coverage-matrix.js:32-57` - CLI writes optional output files and short stdout.
  - Pattern:  `docs/work-orders/20260708-top100-promotion-and-legacy-normalization.md:118-121` - required `--year`/`--file`, idempotence, and failure report behavior.
  - API/Type: `tools/import-kaaf-backfill-originals.js:331-343` - JSON output style for operator commands.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/legacy-normalizer-cli.test.js` exits 0.
  - [ ] `node tools/normalize-legacy-results.js --source-set --years 2015,2016,2017 --json` exits 0 and prints `spreadsheetFileCount:103`.
  - [ ] Running the same `--year 2016 --dry-run --json` command twice produces byte-identical JSON after removing runtime duration fields.
  - [ ] `node tools/normalize-legacy-results.js --year 2015 --include-extension .pdf --json` exits nonzero with `LEGACY_EXTENSION_OUT_OF_SCOPE`.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: CLI dry-run is deterministic for a year
    Tool:     bash
    Steps:    mkdir -p .omo/evidence && node tools/normalize-legacy-results.js --year 2016 --dry-run --json > .omo/evidence/task-7-cli-a.json && node tools/normalize-legacy-results.js --year 2016 --dry-run --json > .omo/evidence/task-7-cli-b.json && node --test backend/tests/legacy-normalizer-cli.test.js --test-name-pattern "deterministic"
    Expected: Test exits 0 and normalized dry-run payloads match after expected runtime fields are removed.
    Evidence: .omo/evidence/task-7-cli-a.json

  Scenario: PDF inclusion is rejected
    Tool:     bash
    Steps:    node tools/normalize-legacy-results.js --year 2015 --include-extension .pdf --json > .omo/evidence/task-7-cli-error.json; test $? -ne 0
    Expected: JSON contains `LEGACY_EXTENSION_OUT_OF_SCOPE` and lists `.pdf` as excluded.
    Evidence: .omo/evidence/task-7-cli-error.json
  ```

  Commit: YES | Message: `feat(data): add legacy normalization CLI` | Files: [`tools/normalize-legacy-results.js`, `backend/tests/legacy-normalizer-cli.test.js`, `tools/lib/legacyResultsSourceSet.js`, `tools/lib/legacyNormalizationReport.js`, `.omo/evidence/task-7-cli*.json`]

- [ ] 8. Year checklist updater and candidate-batch validator integration

  What to do: Add a helper or CLI mode that updates only 2015-2017 rows in `docs/data-candidates/batches/2005-current-backfill/year-checklist.csv` after successful normalization and spot-check completion. It must preserve CSV columns, use allowed statuses, and run the existing validator.
  Must NOT do: Do not update years outside 2015-2017 and do not alter seed 2025 candidate rows.

  Parallelization: Can parallel: NO | Wave 2 | Blocks: [9, 10, 11] | Blocked by: [1, 4, 7]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `card-studio/services/dataCandidateBatchService.js:38-59` - required checklist columns and allowed statuses.
  - Pattern:  `card-studio/services/dataCandidateBatchService.js:197-217` - CSV parsing behavior to preserve.
  - Pattern:  `tools/validate-data-candidates.js:38-50` - validator invocation and exit code.
  - Test:     `backend/tests/data-candidate-batch.test.js:201-219` - real batch validation command and expected safe output.
  - Docs:     `docs/data-candidates/batches/2005-current-backfill/README.md:136-148` - validation command and privacy scope.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/legacy-checklist-updater.test.js` exits 0.
  - [ ] `node tools/validate-data-candidates.js --batch docs/data-candidates/batches/2005-current-backfill --start-year 2005 --current-year 2026 --json` exits 0 after updates.
  - [ ] A test proves the updater refuses `--year 2014` with `LEGACY_YEAR_OUT_OF_SLICE`.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: updater advances only requested slice rows
    Tool:     bash
    Steps:    mkdir -p .omo/evidence && node --test backend/tests/legacy-checklist-updater.test.js --test-name-pattern "2015-2017" | tee .omo/evidence/task-8-checklist.tap
    Expected: TAP output shows ok and fixture CSV changes only 2015, 2016, and 2017 rows.
    Evidence: .omo/evidence/task-8-checklist.tap

  Scenario: out-of-slice year is rejected
    Tool:     bash
    Steps:    node --test backend/tests/legacy-checklist-updater.test.js --test-name-pattern "out of slice" | tee .omo/evidence/task-8-checklist-error.tap
    Expected: TAP output shows ok because updater rejects 2014 with `LEGACY_YEAR_OUT_OF_SLICE`.
    Evidence: .omo/evidence/task-8-checklist-error.tap
  ```

  Commit: YES | Message: `test(data): constrain legacy checklist updates` | Files: [`backend/tests/legacy-checklist-updater.test.js`, `tools/lib/legacyChecklistUpdater.js`, `.omo/evidence/task-8-checklist*.tap`]

- [ ] 9. Normalize and verify 2015 spreadsheet files

  What to do: Run the normalizer on the 37 in-scope 2015 spreadsheet files, commit `data/results/2015.json`, write 2015 JSON/Markdown reports, perform 2-3 source spot checks against private originals, record skipped/failed spreadsheet files with reasons, and update the 2015 checklist row only after evidence is complete.
  Must NOT do: Do not parse 2015 PDFs and do not mark 2016/2017 rows complete in this task.

  Parallelization: Can parallel: YES | Wave 3 | Blocks: [12, 13, 14] | Blocked by: [7, 8]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `.ultra/docs/research/kaaf-backfill-2005-20260708/2015-report.md:3-14` - 2015 domestic source had 40 files: 29 `.xls`, 8 `.xlsx`, 3 `.pdf`.
  - Pattern:  `.ultra/docs/research/kaaf-backfill-2005-20260708/2015-intl-report.md:3-13` - 2015 international source has PDFs only and is out of this slice.
  - Pattern:  `data/sources/manifests/20260708-kaaf-backfill-2005-2017-report.md:20-29` - aggregate counts include 2015 and file extension totals.
  - API/Type: `card-studio/services/resultsStore.js:98-128` - `competitionId` drives synthetic filenames and raw shape.
  - Test:     `backend/tests/relay-results-standard.test.js:54-67` - resultsStore `getRawByFilename` test pattern.

  Acceptance criteria (agent-executable only):
  - [ ] `node tools/normalize-legacy-results.js --year 2015 --json --evidence-dir .omo/evidence/legacy-results-normalization` exits 0.
  - [ ] `node --test backend/tests/legacy-results-2015.test.js` exits 0 and validates `data/results/2015.json`.
  - [ ] `.omo/evidence/legacy-results-normalization/2015-report.json` has `inputSpreadsheetFiles:37`, no `.pdf` parsed, and `spotChecks.length >= 2`.
  - [ ] `node tools/validate-data-candidates.js --batch docs/data-candidates/batches/2005-current-backfill --start-year 2005 --current-year 2026 --json` exits 0.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: 2015 normalized output loads through tests
    Tool:     bash
    Steps:    mkdir -p .omo/evidence && node --test backend/tests/legacy-results-2015.test.js | tee .omo/evidence/task-9-2015.tap
    Expected: TAP output shows ok, `data/results/2015.json` is an array, and report confirms 37 spreadsheet inputs.
    Evidence: .omo/evidence/task-9-2015.tap

  Scenario: 2015 parser failures are reported rather than hidden
    Tool:     bash
    Steps:    node -e "const r=require('./.omo/evidence/legacy-results-normalization/2015-report.json'); if (!Array.isArray(r.failedFiles)||!Array.isArray(r.skippedFiles)) process.exit(1); console.log(JSON.stringify({failed:r.failedFiles.length,skipped:r.skippedFiles.length,reasons:[...new Set([...r.failedFiles,...r.skippedFiles].map(x=>x.reason))]}))" > .omo/evidence/task-9-2015-error.json
    Expected: Command exits 0 and evidence contains arrays for failed/skipped files, even if both counts are 0.
    Evidence: .omo/evidence/task-9-2015-error.json
  ```

  Commit: YES | Message: `feat(data): normalize 2015 legacy spreadsheet results` | Files: [`data/results/2015.json`, `backend/tests/legacy-results-2015.test.js`, `docs/data-candidates/batches/2005-current-backfill/year-checklist.csv`, `.omo/evidence/legacy-results-normalization/2015-*`, `.omo/evidence/task-9-2015*`]

- [ ] 10. Normalize and verify 2016 spreadsheet files

  What to do: Run the normalizer on the 35 in-scope 2016 spreadsheet files, commit `data/results/2016.json`, write 2016 JSON/Markdown reports, perform 2-3 source spot checks, record skipped/failed spreadsheet files with reasons, and update the 2016 checklist row only after evidence is complete.
  Must NOT do: Do not parse 2016 PDFs and do not alter 2015/2017 results except through shared parser fixes covered by tests.

  Parallelization: Can parallel: YES | Wave 3 | Blocks: [12, 13, 14] | Blocked by: [7, 8]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `.ultra/docs/research/kaaf-backfill-2005-20260708/2016-report.md:3-14` - 2016 domestic source has 28 `.xls` and 7 `.xlsx`.
  - Pattern:  `.ultra/docs/research/kaaf-backfill-2005-20260708/2016-intl-report.md:3-12` - 2016 international source has PDFs only and is out of this slice.
  - Pattern:  `docs/data-candidates/batches/2005-current-backfill/year-checklist.csv:13` - 2016 checklist row.
  - API/Type: `docs/work-orders/20260708-top100-promotion-and-legacy-normalization.md:141-147` - per-year DoD.

  Acceptance criteria (agent-executable only):
  - [ ] `node tools/normalize-legacy-results.js --year 2016 --json --evidence-dir .omo/evidence/legacy-results-normalization` exits 0.
  - [ ] `node --test backend/tests/legacy-results-2016.test.js` exits 0 and validates `data/results/2016.json`.
  - [ ] `.omo/evidence/legacy-results-normalization/2016-report.json` has `inputSpreadsheetFiles:35`, no `.pdf` parsed, and `spotChecks.length >= 2`.
  - [ ] `node tools/validate-data-candidates.js --batch docs/data-candidates/batches/2005-current-backfill --start-year 2005 --current-year 2026 --json` exits 0.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: 2016 normalized output loads through tests
    Tool:     bash
    Steps:    mkdir -p .omo/evidence && node --test backend/tests/legacy-results-2016.test.js | tee .omo/evidence/task-10-2016.tap
    Expected: TAP output shows ok, `data/results/2016.json` is an array, and report confirms 35 spreadsheet inputs.
    Evidence: .omo/evidence/task-10-2016.tap

  Scenario: 2016 parser failures are reported rather than hidden
    Tool:     bash
    Steps:    node -e "const r=require('./.omo/evidence/legacy-results-normalization/2016-report.json'); if (!Array.isArray(r.failedFiles)||!Array.isArray(r.skippedFiles)) process.exit(1); console.log(JSON.stringify({failed:r.failedFiles.length,skipped:r.skippedFiles.length,reasons:[...new Set([...r.failedFiles,...r.skippedFiles].map(x=>x.reason))]}))" > .omo/evidence/task-10-2016-error.json
    Expected: Command exits 0 and evidence contains arrays for failed/skipped files, even if both counts are 0.
    Evidence: .omo/evidence/task-10-2016-error.json
  ```

  Commit: YES | Message: `feat(data): normalize 2016 legacy spreadsheet results` | Files: [`data/results/2016.json`, `backend/tests/legacy-results-2016.test.js`, `docs/data-candidates/batches/2005-current-backfill/year-checklist.csv`, `.omo/evidence/legacy-results-normalization/2016-*`, `.omo/evidence/task-10-2016*`]

- [ ] 11. Normalize and verify 2017 spreadsheet files

  What to do: Run the normalizer on the 31 in-scope 2017 spreadsheet files, commit `data/results/2017.json`, write 2017 JSON/Markdown reports, perform 2-3 source spot checks, record skipped/failed spreadsheet files with reasons, and update the 2017 checklist row only after evidence is complete.
  Must NOT do: Do not parse 2017 PDFs and do not expose relay/team rows as individual athlete rows.

  Parallelization: Can parallel: YES | Wave 3 | Blocks: [12, 13, 14] | Blocked by: [7, 8]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `.ultra/docs/research/kaaf-backfill-2005-20260708/2017-report.md:3-14` - 2017 domestic source has 5 `.xlsx`, 26 `.xls`, and 4 `.pdf`.
  - Pattern:  `.ultra/docs/research/kaaf-backfill-2005-20260708/2017-intl-report.md:3-12` - 2017 international source has PDFs only and is out of this slice.
  - Pattern:  `docs/data-candidates/batches/2005-current-backfill/year-checklist.csv:14` - 2017 checklist row.
  - Pattern:  `backend/tests/manual-top-records-ingest.test.js:56-71` - domestic 2017 Korea Open example remains source_verified in TOP100.
  - Guardrail: `docs/work-orders/20260708-remaining-tracks-full-order.md:29-40` - team records are a later Track C.

  Acceptance criteria (agent-executable only):
  - [ ] `node tools/normalize-legacy-results.js --year 2017 --json --evidence-dir .omo/evidence/legacy-results-normalization` exits 0.
  - [ ] `node --test backend/tests/legacy-results-2017.test.js` exits 0 and validates `data/results/2017.json`.
  - [ ] `.omo/evidence/legacy-results-normalization/2017-report.json` has `inputSpreadsheetFiles:31`, no `.pdf` parsed, and `spotChecks.length >= 2`.
  - [ ] `node tools/validate-data-candidates.js --batch docs/data-candidates/batches/2005-current-backfill --start-year 2005 --current-year 2026 --json` exits 0.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: 2017 normalized output loads through tests
    Tool:     bash
    Steps:    mkdir -p .omo/evidence && node --test backend/tests/legacy-results-2017.test.js | tee .omo/evidence/task-11-2017.tap
    Expected: TAP output shows ok, `data/results/2017.json` is an array, and report confirms 31 spreadsheet inputs.
    Evidence: .omo/evidence/task-11-2017.tap

  Scenario: team/relay rows are not indexed as individual athlete rows
    Tool:     bash
    Steps:    node --test backend/tests/legacy-results-2017.test.js --test-name-pattern "team rows" | tee .omo/evidence/task-11-2017-error.tap
    Expected: TAP output shows ok because relay/team rows are held/skipped with reason `LEGACY_TEAM_ROW_OUT_OF_SCOPE` or equivalent.
    Evidence: .omo/evidence/task-11-2017-error.tap
  ```

  Commit: YES | Message: `feat(data): normalize 2017 legacy spreadsheet results` | Files: [`data/results/2017.json`, `backend/tests/legacy-results-2017.test.js`, `docs/data-candidates/batches/2005-current-backfill/year-checklist.csv`, `.omo/evidence/legacy-results-normalization/2017-*`, `.omo/evidence/task-11-2017*`]

- [ ] 12. ResultsStore, analytics, and API dedup verification

  What to do: Add/update tests proving 2015-2017 result files load through `resultsStore`, are searchable through `recordAnalyticsService`, preserve privacy/data-rights rules, and increase `manualTopRecordStats.skippedDuplicates` above the pre-import baseline of 7321. Capture API smoke evidence through the mounted `/api/card-studio` routes.
  Must NOT do: Do not change dedup key semantics unless tests prove a bug in the existing PR #31 rail; this task should measure and assert the post-import delta.

  Parallelization: Can parallel: YES | Wave 4 | Blocks: [14] | Blocked by: [9, 10, 11]

  References (executor has NO interview context - be exhaustive):
  - API/Type: `card-studio/services/resultsStore.js:142-218` - list/load all `data/results/YYYY.json` files.
  - API/Type: `card-studio/services/recordAnalyticsService.js:179-195` - index and manual TOP100 stats shape.
  - API/Type: `card-studio/services/recordAnalyticsService.js:898-905` - dedup key uses normalized name, eventKey, date, record mark.
  - API/Type: `card-studio/routes/publicRoutes.js:215-259` - record search/profile API response and dataRights.
  - API/Type: `src/server.js:198-216` - `/api/card-studio` mount and warmup.
  - Test:     `backend/tests/data-rights-policy.test.js:133-153` - record API privacy/provenance smoke.
  - Test:     `backend/tests/manual-top-records-ingest.test.js:110-133` - dedup stats contract to revise from exact baseline to post-import delta assertion.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/legacy-results-integration.test.js backend/tests/manual-top-records-ingest.test.js backend/tests/data-rights-policy.test.js` exits 0.
  - [ ] `node -e "const s=require('./card-studio/services/recordAnalyticsService').warmup(); if (s.manualTopRecords.skippedDuplicates <= 7321) process.exit(1); console.log(JSON.stringify(s.manualTopRecords))"` exits 0 and writes evidence.
  - [ ] API smoke with local server returns 200 for `/api/card-studio/analytics/records/search?q=김국영` and serialized body contains no `person_no`, `birthDate`, `phone`, or `email`.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: analytics sees 2015-2017 and dedup delta
    Tool:     bash
    Steps:    mkdir -p .omo/evidence && node --test backend/tests/legacy-results-integration.test.js backend/tests/manual-top-records-ingest.test.js | tee .omo/evidence/task-12-integration.tap && node -e "const s=require('./card-studio/services/recordAnalyticsService').warmup(); console.log(JSON.stringify(s.manualTopRecords,null,2)); if (s.manualTopRecords.skippedDuplicates <= 7321) process.exit(1)" > .omo/evidence/task-12-dedup.json
    Expected: Tests exit 0 and dedup evidence shows `skippedDuplicates` greater than 7321.
    Evidence: .omo/evidence/task-12-dedup.json

  Scenario: local API search has provenance and no restricted identifiers
    Tool:     curl
    Steps:    mkdir -p .omo/evidence; nohup env PORT=3005 node src/server.js > .omo/evidence/task-12-server.log 2>&1 </dev/null & echo $! > .omo/evidence/task-12-server.pid; sleep 5; curl -sS "http://127.0.0.1:3005/api/card-studio/analytics/records/search?q=%EA%B9%80%EA%B5%AD%EC%98%81" > .omo/evidence/task-12-api.json; STATUS=$?; kill $(cat .omo/evidence/task-12-server.pid) || true; test $STATUS -eq 0; node -e "const fs=require('fs'); const body=fs.readFileSync('.omo/evidence/task-12-api.json','utf8'); const j=JSON.parse(body); if(!j.success||!Array.isArray(j.data)) process.exit(1); if(/person_no|birthDate|birthdate|phone|email/i.test(body)) process.exit(1);"
    Expected: API JSON parses, `success` is true, data is an array, and restricted identifiers are absent.
    Evidence: .omo/evidence/task-12-api.json
  ```

  Commit: YES | Message: `test(data): verify legacy results analytics integration` | Files: [`backend/tests/legacy-results-integration.test.js`, `backend/tests/manual-top-records-ingest.test.js`, `backend/tests/data-rights-policy.test.js`, `.omo/evidence/task-12-*`]

- [ ] 13. Coverage copy, about-data, and coverage matrix updates

  What to do: Update RecordsPage coverage copy, related contract tests, About Data content if needed, and coverage matrix artifacts/tests so the service truthfully says 2015-2017 spreadsheet-normalized records are included while 2005-2014 and PDF/HWP legacy sources remain in progress/out of scope. Run frontend build.
  Must NOT do: Do not claim 2005-2017 is fully complete if PDF/HWP and older spreadsheet bands remain undone.

  Parallelization: Can parallel: YES | Wave 4 | Blocks: [14] | Blocked by: [9, 10, 11]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `frontend/src/pages/RecordsPage.tsx:469-475` - current coverage copy location.
  - Pattern:  `backend/tests/progressive-ux.test.js:114-120` - coverage transparency contract to update.
  - Pattern:  `frontend/src/pages/aboutDataContent.ts:56-63` - processing copy that may need refreshed coverage examples.
  - Pattern:  `docs/athletetime-coverage-matrix.md:52-64` - allowed and forbidden coverage wording.
  - Pattern:  `tools/build-coverage-matrix.js:32-57` - coverage artifact CLI.
  - Test:     `backend/tests/coverage-matrix.test.js:59-98` - incomplete coverage wording test.
  - Build:    `frontend/package.json:6-18` - frontend build and type-check commands.

  Acceptance criteria (agent-executable only):
  - [ ] `node --test backend/tests/progressive-ux.test.js backend/tests/about-data-content.test.js backend/tests/coverage-matrix.test.js` exits 0.
  - [ ] `npm --prefix frontend run build` exits 0.
  - [ ] `node tools/build-coverage-matrix.js --from-year 2010 --to-year 2026 --generated-at 2026-07-08T00:00:00.000Z --out-json .omo/evidence/task-13-coverage.json --out-md .omo/evidence/task-13-coverage.md` exits 0.
  - [ ] Grep rejects forbidden copy: `! rg -n "공식 전체|공식 인증|전국 모든|완전한 기록|랭킹" frontend/src/pages/RecordsPage.tsx frontend/src/pages/aboutDataContent.ts docs/athletetime-coverage-matrix.md`.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: contract tests and build pass after coverage copy update
    Tool:     bash
    Steps:    mkdir -p .omo/evidence && node --test backend/tests/progressive-ux.test.js backend/tests/about-data-content.test.js backend/tests/coverage-matrix.test.js | tee .omo/evidence/task-13-copy-tests.tap && npm --prefix frontend run build > .omo/evidence/task-13-frontend-build.log 2>&1
    Expected: Node tests exit 0 and frontend build log contains a successful Vite build.
    Evidence: .omo/evidence/task-13-frontend-build.log

  Scenario: Records page renders updated copy in real Chrome
    Tool:     playwright(real Chrome)
    Steps:    mkdir -p .omo/evidence; nohup env PORT=3005 node src/server.js > .omo/evidence/task-13-server.log 2>&1 </dev/null & echo $! > .omo/evidence/task-13-server.pid; nohup npm --prefix frontend run dev -- --host 127.0.0.1 --port 5179 > .omo/evidence/task-13-vite.log 2>&1 </dev/null & echo $! > .omo/evidence/task-13-vite.pid; sleep 8; node - <<'NODE'
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('http://127.0.0.1:5179/records?q=%EA%B9%80%EA%B5%AD%EC%98%81', { waitUntil: 'networkidle' });
  const text = await page.locator('body').innerText();
  if (!/2015-2017/.test(text) || /공식 전체|전국 모든|랭킹/.test(text)) throw new Error('coverage copy failed');
  await page.screenshot({ path: '.omo/evidence/task-13-records-page.png', fullPage: true });
  await browser.close();
})();
NODE
STATUS=$?; kill $(cat .omo/evidence/task-13-vite.pid) || true; kill $(cat .omo/evidence/task-13-server.pid) || true; test $STATUS -eq 0
    Expected: Script exits 0 and screenshot shows Records page with updated coverage copy and no forbidden wording.
    Evidence: .omo/evidence/task-13-records-page.png
  ```

  Commit: YES | Message: `fix(records): update legacy coverage copy for 2015-2017` | Files: [`frontend/src/pages/RecordsPage.tsx`, `frontend/src/pages/aboutDataContent.ts`, `docs/athletetime-coverage-matrix.md`, `backend/tests/progressive-ux.test.js`, `backend/tests/about-data-content.test.js`, `backend/tests/coverage-matrix.test.js`, `.omo/evidence/task-13-*`]

- [ ] 14. PR evidence bundle and operator report

  What to do: Produce a concise PR-ready evidence bundle summarizing source set, normalized file counts, failed/skipped files, spot checks, checklist status, dedup delta, tests/build, and remaining out-of-scope work. Add an operator report under `.omo/evidence/legacy-results-normalization/2015-2017-pr-report.md`.
  Must NOT do: Do not declare the work complete until final verification F1-F4 approves and the caller explicitly says okay.

  Parallelization: Can parallel: NO | Wave 4 | Blocks: [final verification] | Blocked by: [12, 13]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `docs/work-orders/20260708-remaining-tracks-full-order.md:93-99` - common PR reporting rules.
  - Pattern:  `docs/work-orders/20260708-top100-promotion-and-legacy-normalization.md:160-164` - PR body must include row counts, test results, evidence paths, and spot-check evidence.
  - Pattern:  `.omo/evidence/legacy-results-normalization/2015-report.json` - generated in Task 9.
  - Pattern:  `.omo/evidence/legacy-results-normalization/2016-report.json` - generated in Task 10.
  - Pattern:  `.omo/evidence/legacy-results-normalization/2017-report.json` - generated in Task 11.

  Acceptance criteria (agent-executable only):
  - [ ] `test -f .omo/evidence/legacy-results-normalization/2015-2017-pr-report.md` exits 0.
  - [ ] `rg -n "2015|2016|2017|skippedDuplicates|npm test|frontend build|spot" .omo/evidence/legacy-results-normalization/2015-2017-pr-report.md` exits 0.
  - [ ] `npm test` exits 0.
  - [ ] `npm --prefix frontend run build` exits 0.
  - [ ] `git diff --check` exits 0.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: PR report names all required evidence
    Tool:     bash
    Steps:    mkdir -p .omo/evidence && rg -n "2015-report|2016-report|2017-report|task-12-dedup|task-13-frontend-build|spot" .omo/evidence/legacy-results-normalization/2015-2017-pr-report.md | tee .omo/evidence/task-14-pr-report.txt
    Expected: Grep exits 0 and every required evidence artifact is named.
    Evidence: .omo/evidence/task-14-pr-report.txt

  Scenario: full repo gates are green
    Tool:     bash
    Steps:    npm test > .omo/evidence/task-14-npm-test.log 2>&1 && npm --prefix frontend run build > .omo/evidence/task-14-frontend-build.log 2>&1 && git diff --check > .omo/evidence/task-14-diff-check.log 2>&1
    Expected: All commands exit 0.
    Evidence: .omo/evidence/task-14-npm-test.log
  ```

  Commit: YES | Message: `docs(data): summarize 2015-2017 legacy normalization evidence` | Files: [`.omo/evidence/legacy-results-normalization/2015-2017-pr-report.md`, `.omo/evidence/task-14-*`]

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
- Reference the plan file path in the final commit footer: `Plan: .omo/plans/athletetime-track-a-2015-2017-legacy-normalization.md`.

## Success criteria
- All Must-Have shipped; all QA scenarios pass with captured evidence; F1-F4 approved; commit history clean.
