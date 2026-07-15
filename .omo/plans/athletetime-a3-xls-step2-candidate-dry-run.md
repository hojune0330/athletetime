# AthleteTime A-3 Step 2 XLS Normalized-Candidates Dry-Run

## TL;DR
> Summary:      Build the A-3 Step 2 dry-run that converts only the 45 PR #43 promotable legacy `.xls` workbooks into `normalized-candidates.jsonl` evidence, keeps the 38 blocked workbooks out of parsing, and reports TOP100 dedup delta as `7,321 -> 7,321`, delta `0`.
> Deliverables:
> - `legacyXlsCandidateDryRunService` selection/extraction/reporting service
> - `tools/normalize-legacy-xls-candidates-dry-run.js` CLI and package script
> - `normalized-candidates.jsonl`, `candidate-dry-run-report.json`, `candidate-dry-run-report.md`, `blocked-workbooks.json`, `partial-sheet-opportunities.json`, `manual-top-delta.json`
> - Node `--test` coverage, real CLI/tmux QA evidence under `.omo/evidence/a3-xls-step2-candidate-dry-run/`
> Effort:       Medium
> Risk:         Medium - original workbook availability is private-fixture dependent, and the workbook-only guard conflicts with future sheet-level partial promotion opportunities.

## Scope
### Must have
- Parse only workbooks classified as `promotable: true` by the merged A-3 layout classifier; current baseline is 83 converted, 45 promotable, 38 blocked.
- Keep all 38 blocked workbooks excluded from candidate parsing and write them only to sanitized `blocked-workbooks.json`.
- Do not write held-candidate stubs, `held-candidates.jsonl`, or candidate rows for blocked workbooks.
- Consider the sheet-level partial suggestion by writing `partial-sheet-opportunities.json` for blocked mixed workbooks that contain horizontal sheets, but do not parse those sheets in this Step 2. Record `suggestedWorkbookStatus: "partially_promoted"` for future review only.
- Reuse the existing horizontal podium extraction shape from Track A XLSX candidates and add division metadata from `divisionHierarchyService.normalizeDivision`.
- Stop before writing `normalized-candidates.jsonl` if `divisionLevel === "unspecified"` exceeds 20%; write up to 10 sanitized raw-division samples to error evidence.
- Preserve `manualTopRecordStats.skippedDuplicates === 7321` and report before/after/delta; expected delta is `0` because this is dry-run evidence, not service promotion.
- Prove `data/results` and raw original files are not mutated or committed.
- If any executor delegates sub-work, use `fork_turns: "none"` and include this plan path plus the relevant file references in the delegated prompt.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- No service promotion, no `--write`, and no edits to `data/results/*.json` or `data/results/index.json`.
- No parsing of vertical, unknown, mixed-result, or otherwise blocked residual sheets.
- No OCR, manual data entry, AI row guessing, or parser expansion for vertical layouts.
- No production UI/frontend changes.
- No raw original workbook commits under `data/sources/import/originals`.
- No private paths, raw rows, `PERSON_NO`, phone, birthdate, email, address, or secret-like tokens in Markdown reports, blocked evidence, or partial opportunity evidence.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: TDD + Node built-in `node:test`
- QA policy: every task has agent-executed scenarios
- Evidence: `.omo/evidence/task-<N>-a3-xls-step2-<slug>.<ext>`

## Execution strategy
### Parallel execution waves
> Target 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks to maximize parallelism.

Wave 1 (no dependencies):
- Task 1: strict workbook selector and contract tests
- Task 3: division metadata and unspecified threshold guard
- Task 4: blocked-workbook and partial-sheet evidence model
- Task 5: CLI/package-script shell and argument validation

Wave 2 (after Wave 1):
- Task 2: depends [1, 3] - XLS candidate extraction and JSONL writer
- Task 6: depends [2, 5] - TOP100 invariant and dry-run delta report
- Task 7: depends [1, 2, 3, 4, 5, 6] - full fixture integration and safety scans

Wave 3 (after Wave 2):
- Task 8: depends [7] - operator report polish and real CLI/tmux QA evidence

Critical path: Task 1 -> Task 2 -> Task 7 -> Task 8

### Dependency matrix
| Task | Depends on | Blocks | Can parallelize with |
|------|------------|--------|----------------------|
| 1    | none       | 2, 7   | 3, 4, 5              |
| 2    | 1, 3       | 6, 7   | none                 |
| 3    | none       | 2, 7   | 1, 4, 5              |
| 4    | none       | 7      | 1, 3, 5              |
| 5    | none       | 6, 7   | 1, 3, 4              |
| 6    | 2, 5       | 7      | none                 |
| 7    | 1, 2, 3, 4, 5, 6 | 8 | none          |
| 8    | 7          | final  | none                 |

## Todos
> Implementation + Test = ONE task. Never separate.
> Every task MUST have: References + Acceptance Criteria + QA Scenarios + Commit.

- [ ] 1. Strict workbook selector and contract tests

  What to do: Create `card-studio/services/legacyXlsCandidateDryRunService.js` with a selector that accepts classified workbook summaries and returns `candidateWorkbooks`, `blockedWorkbooks`, and `partialSheetOpportunities`. The selector must include only `workbook.promotable === true` in `candidateWorkbooks`. Add `backend/tests/legacy-xls-candidate-dry-run.test.js` with RED tests `LEGACY-XLS-CANDIDATE-001` and `LEGACY-XLS-CANDIDATE-002` using synthetic horizontal, vertical, and mixed-result workbooks.
  Must NOT do: Do not parse rows yet; do not enable partial sheet parsing; do not create held-candidate rows.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [2, 7] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `card-studio/services/legacyXlsLayoutClassifierService.js:340` - workbook classification returns `promotable`, `blockReason`, and `reusableByExistingHorizontalPipeline`.
  - Pattern:  `card-studio/services/legacyXlsConverterDryRunService.js:97` - existing dry-run report builds the 83-workbook layout evidence.
  - Pattern:  `backend/tests/legacy-xls-layout-classification.test.js:105` - synthetic workbook fixture pattern for mixed horizontal/summary and blocked vertical workbooks.
  - Evidence: `.omo/evidence/a3-xls-layout/final/xls-dry-run-report.json:79` - merged PR #43 baseline has 45 promotable and 38 blocked workbooks.
  - Scope:    `docs/work-orders/20260709-a3-xls-layout-classification.md:35` - Step 2 is normalized candidates only for promotable workbooks.

  Acceptance criteria (agent-executable only):
  - [ ] RED captured first: `node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-00[12]" > .omo/evidence/task-1-a3-xls-step2-selector-red.tap 2>&1; test $? -ne 0`
  - [ ] GREEN after implementation: `node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-00[12]" > .omo/evidence/task-1-a3-xls-step2-selector-green.tap 2>&1`
  - [ ] Synthetic selector assertion passes: candidate workbooks `1`, blocked workbooks `2`, partial opportunities `1`, candidate workbook IDs do not include blocked workbook IDs.

  QA scenarios (MANDATORY - task incomplete without these):
  > Name the exact tool AND its exact invocation - not "verify it works". Browser use: use Chrome to drive the page; if Chrome is not available, download and use agent-browser (https://github.com/vercel-labs/agent-browser). Computer use: OS-level GUI automation for a non-browser desktop app.
  ```
  Scenario: strict selector happy path
    Tool:     bash
    Steps:    mkdir -p .omo/evidence && node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-001" > .omo/evidence/task-1-a3-xls-step2-selector.tap 2>&1
    Expected: Exit code 0 and TAP contains ok for LEGACY-XLS-CANDIDATE-001.
    Evidence: .omo/evidence/task-1-a3-xls-step2-selector.tap

  Scenario: blocked mixed workbook remains unparsed
    Tool:     bash
    Steps:    node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-002" > .omo/evidence/task-1-a3-xls-step2-selector-error.tap 2>&1
    Expected: Exit code 0 and assertion proves mixed-result workbook is only listed in partial-sheet opportunities, not candidates.
    Evidence: .omo/evidence/task-1-a3-xls-step2-selector-error.tap
  ```

  Commit: YES | Message: `test(data): lock a3 xls candidate selector` | Files: [`backend/tests/legacy-xls-candidate-dry-run.test.js`, `card-studio/services/legacyXlsCandidateDryRunService.js`]

- [ ] 2. XLS horizontal candidate extraction and JSONL writer

  What to do: Extend `legacyXlsCandidateDryRunService` to read selected `.xls` workbooks, convert SheetJS rows into the existing horizontal podium extraction shape, generate candidate rows, and write `normalized-candidates.jsonl`. Keep the base candidate fields compatible with Track A XLSX rows: `year`, `competitionName`, `division`, `event`, `rank`, `name`, `affiliation`, `record`, `note`, `newRecord`, `source`. Add RED/GREEN tests `LEGACY-XLS-CANDIDATE-003` and `LEGACY-XLS-CANDIDATE-004`.
  Must NOT do: Do not create a second schema for XLS; do not include header rows as candidate rows; do not parse blocked workbooks or blocked sheets.

  Parallelization: Can parallel: NO | Wave 2 | Blocks: [6, 7] | Blocked by: [1, 3]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `card-studio/services/legacyResultNormalizationService.js:157` - `extractHorizontalPodiumResults` base algorithm and candidate row schema.
  - Pattern:  `tools/normalize-legacy-results.js:142` - existing normalized-candidates CLI writes `plan.json`, inspection JSON, JSONL, and Markdown.
  - Pattern:  `card-studio/services/legacyXlsTextExtractor.js:22` - SheetJS `.xls` text extraction using `readFile` and `sheet_to_json`.
  - Test:     `backend/tests/legacy-result-normalization.test.js:52` - candidate rows keep event, rank, name, team, record, and source.
  - External: `https://docs.sheetjs.com/docs/api/utilities/array/#array-output` - SheetJS documents `sheet_to_json(ws, { header: 1 })` as array-of-arrays output and `defval`/`blankrows` behavior.

  Acceptance criteria (agent-executable only):
  - [ ] RED captured first: `node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-00[34]" > .omo/evidence/task-2-a3-xls-step2-extraction-red.tap 2>&1; test $? -ne 0`
  - [ ] GREEN after implementation: `node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-00[34]" > .omo/evidence/task-2-a3-xls-step2-extraction-green.tap 2>&1`
  - [ ] JSONL validation passes: `node tools/validate-data-candidates.js --input .omo/evidence/task-2-a3-xls-step2-extraction/normalized-candidates.jsonl > .omo/evidence/task-2-a3-xls-step2-validate.txt 2>&1`

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: synthetic horizontal XLS rows become candidates
    Tool:     bash
    Steps:    mkdir -p .omo/evidence/task-2-a3-xls-step2-extraction && node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-003" > .omo/evidence/task-2-a3-xls-step2-extraction.tap 2>&1
    Expected: Exit code 0; output JSONL contains 김테스트 with rank 1 and record 10.99.
    Evidence: .omo/evidence/task-2-a3-xls-step2-extraction.tap

  Scenario: header pollution is rejected
    Tool:     bash
    Steps:    node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-004" > .omo/evidence/task-2-a3-xls-step2-extraction-error.tap 2>&1
    Expected: Exit code 0; JSONL does not contain `"name":"성명"`, `"affiliation":"소속"`, or `"record":"기록"`.
    Evidence: .omo/evidence/task-2-a3-xls-step2-extraction-error.tap
  ```

  Commit: YES | Message: `feat(data): extract a3 xls normalized candidates` | Files: [`card-studio/services/legacyXlsCandidateDryRunService.js`, `backend/tests/legacy-xls-candidate-dry-run.test.js`]

- [ ] 3. Division metadata and unspecified threshold guard

  What to do: For every candidate row, call `divisionHierarchyService.normalizeDivision(row.division)` and attach stable metadata fields, preferably `divisionKey`, `divisionLevel`, `divisionLabel`, `divisionDetail`, `gender`, and `rawDivision`. Compute `unspecifiedRatio = unspecifiedRows / candidateRows`; if it exceeds `0.20`, abort before writing `normalized-candidates.jsonl`, return code `A3_XLS_UNSPECIFIED_THRESHOLD_EXCEEDED`, and write sanitized `unspecified-samples.json` with at most 10 raw-division/source-sheet samples. Add RED/GREEN tests `LEGACY-XLS-CANDIDATE-005` and `LEGACY-XLS-CANDIDATE-006`.
  Must NOT do: Do not invent `kaaf-kind-*` keys; do not silently pass threshold breaches; do not change `divisionHierarchyService` labels in this plan.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [2, 7] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - API/Type: `card-studio/services/divisionHierarchyService.js:74` - `normalizeDivision(rawLabel)` returns `gender`, `divisionLevel`, `divisionKey`, `divisionLabel`, `divisionDetail`, `rawDivision`.
  - Test:     `backend/tests/division-hierarchy.test.js:44` - TOP100 dedup stats and no `kaaf-kind-*` keys invariant.
  - Scope:    `docs/work-orders/20260709-a3-xls-layout-classification.md:39` - Step 2 must use division hierarchy and stop if unspecified exceeds 20%.
  - Scope:    `docs/work-orders/20260708-track-a-continuation-full-queue.md:67` - A-3/A-4 tracks must use `divisionHierarchyService`, not ad hoc keys.

  Acceptance criteria (agent-executable only):
  - [ ] RED captured first: `node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-00[56]" > .omo/evidence/task-3-a3-xls-step2-division-red.tap 2>&1; test $? -ne 0`
  - [ ] GREEN after implementation: `node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-00[56]" > .omo/evidence/task-3-a3-xls-step2-division-green.tap 2>&1`
  - [ ] Forced 21% unspecified fixture exits non-zero and does not create `normalized-candidates.jsonl`.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: division metadata happy path
    Tool:     bash
    Steps:    node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-005" > .omo/evidence/task-3-a3-xls-step2-division.tap 2>&1
    Expected: Exit code 0; candidate rows include divisionKey and divisionLevel from divisionHierarchyService.
    Evidence: .omo/evidence/task-3-a3-xls-step2-division.tap

  Scenario: unspecified threshold abort
    Tool:     bash
    Steps:    node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-006" > .omo/evidence/task-3-a3-xls-step2-division-error.tap 2>&1
    Expected: Exit code 0; test observes code A3_XLS_UNSPECIFIED_THRESHOLD_EXCEEDED and no JSONL candidate output.
    Evidence: .omo/evidence/task-3-a3-xls-step2-division-error.tap
  ```

  Commit: YES | Message: `feat(data): guard a3 xls division normalization` | Files: [`card-studio/services/legacyXlsCandidateDryRunService.js`, `backend/tests/legacy-xls-candidate-dry-run.test.js`]

- [ ] 4. Blocked-workbook and partial-sheet evidence model

  What to do: Write sanitized `blocked-workbooks.json` from the selector output and sanitized `partial-sheet-opportunities.json` for blocked workbooks that contain horizontal sheets. Each blocked workbook entry must include `year`, `originalFilename`, `sha256Prefix`, `workbookLayout`, `blockReason`, `blockedSheets`, and `candidateRowsParsed: 0`. Each partial opportunity must include `suggestedWorkbookStatus: "partially_promoted"`, horizontal sheet names, blocked residual sheet names/reasons, and `candidateRowsParsed: 0`.
  Must NOT do: Do not include `sourcePath`, `privateStoragePath`, raw rows, or unredacted private-like tokens in either evidence file.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [7] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `card-studio/services/legacyReportSafety.js:3` - forbidden report text scanner to reuse for non-candidate evidence.
  - Pattern:  `card-studio/services/legacyXlsConverterDryRunService.js:32` - workbook summary sanitization pattern.
  - Pattern:  `card-studio/services/legacyXlsLayoutClassifierService.js:324` - workbook block-reason logic.
  - Evidence: `.omo/evidence/a3-xls-layout/final/xls-dry-run-report.json:81` - current blocked reasons are 3 mixed-result and 35 vertical.
  - Scope:    `docs/work-orders/20260709-a3-xls-layout-classification.md:21` - workbook/sheet layout evidence contract.

  Acceptance criteria (agent-executable only):
  - [ ] RED captured first: `node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-00[78]" > .omo/evidence/task-4-a3-xls-step2-blocked-red.tap 2>&1; test $? -ne 0`
  - [ ] GREEN after implementation: `node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-00[78]" > .omo/evidence/task-4-a3-xls-step2-blocked-green.tap 2>&1`
  - [ ] Forbidden scanner passes: `node -e "const fs=require('fs'); const re=/privateStoragePath|sourcePath|data[\\\\/]+sources[\\\\/]+import[\\\\/]+originals|PERSON_NO|birthdate|phone|email|address|secret|010-\\d{3,4}-\\d{4}/i; for (const p of ['.omo/evidence/task-4-a3-xls-step2-blocked/blocked-workbooks.json','.omo/evidence/task-4-a3-xls-step2-blocked/partial-sheet-opportunities.json']) { if (re.test(fs.readFileSync(p,'utf8'))) throw new Error(p); }" > .omo/evidence/task-4-a3-xls-step2-forbidden-scan.txt 2>&1`

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: blocked evidence happy path
    Tool:     bash
    Steps:    mkdir -p .omo/evidence/task-4-a3-xls-step2-blocked && node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-007" > .omo/evidence/task-4-a3-xls-step2-blocked.tap 2>&1
    Expected: Exit code 0; blocked-workbooks.json exists and all entries have candidateRowsParsed 0.
    Evidence: .omo/evidence/task-4-a3-xls-step2-blocked.tap

  Scenario: partial opportunity remains evidence-only
    Tool:     bash
    Steps:    node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-008" > .omo/evidence/task-4-a3-xls-step2-blocked-error.tap 2>&1
    Expected: Exit code 0; partial-sheet-opportunities.json contains suggestedWorkbookStatus partially_promoted and no candidate rows.
    Evidence: .omo/evidence/task-4-a3-xls-step2-blocked-error.tap
  ```

  Commit: YES | Message: `feat(data): record blocked a3 xls workbook evidence` | Files: [`card-studio/services/legacyXlsCandidateDryRunService.js`, `backend/tests/legacy-xls-candidate-dry-run.test.js`]

- [ ] 5. Candidate dry-run CLI and package script

  What to do: Add `tools/normalize-legacy-xls-candidates-dry-run.js` with `--years`, `--manifest`, `--out-dir`, `--limit`, `--json`, and strict default mode. Add `package.json` script `data:normalize:legacy-xls:dry-run` that writes to `.omo/evidence/a3-xls-step2-candidate-dry-run`. Validate malformed args with structured JSON errors under code `A3_XLS_CANDIDATE_DRY_RUN_FAILED`.
  Must NOT do: Do not add a `--write` flag; do not default to `data/results`; do not reuse the promotion CLI name.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [6, 7] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `tools/convert-legacy-xls-dry-run.js:17` - CLI arg parsing and structured JSON error pattern.
  - Pattern:  `tools/convert-legacy-xls-dry-run.js:59` - existing A-3 `.xls` dry-run CLI writes JSON and Markdown reports.
  - Pattern:  `package.json:21` - existing data scripts naming convention.
  - Test:     `backend/tests/legacy-xls-converter-dry-run.test.js:217` - missing manifest and malformed CLI argument tests.
  - External: `https://nodejs.org/api/test.html#running-tests-from-the-command-line` - Node test runner supports `node --test` command-line execution.

  Acceptance criteria (agent-executable only):
  - [ ] RED captured first: `node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-00(9|10)" > .omo/evidence/task-5-a3-xls-step2-cli-red.tap 2>&1; test $? -ne 0`
  - [ ] GREEN after implementation: `node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-00(9|10)" > .omo/evidence/task-5-a3-xls-step2-cli-green.tap 2>&1`
  - [ ] `npm pkg get scripts.data:normalize:legacy-xls:dry-run > .omo/evidence/task-5-a3-xls-step2-package-script.txt` prints the new script.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: CLI writes expected evidence files
    Tool:     bash
    Steps:    mkdir -p .omo/evidence/task-5-a3-xls-step2-cli && node tools/normalize-legacy-xls-candidates-dry-run.js --years 2017 --limit 1 --out-dir .omo/evidence/task-5-a3-xls-step2-cli --json > .omo/evidence/task-5-a3-xls-step2-cli.json
    Expected: Exit code 0; JSON payload has ok true and outDir .omo/evidence/task-5-a3-xls-step2-cli.
    Evidence: .omo/evidence/task-5-a3-xls-step2-cli.json

  Scenario: malformed CLI args fail structured
    Tool:     bash
    Steps:    node tools/normalize-legacy-xls-candidates-dry-run.js --years not-a-year --json > .omo/evidence/task-5-a3-xls-step2-cli-error.json; test $? -ne 0
    Expected: JSON payload has ok false and code A3_XLS_CANDIDATE_DRY_RUN_FAILED.
    Evidence: .omo/evidence/task-5-a3-xls-step2-cli-error.json
  ```

  Commit: YES | Message: `feat(data): add a3 xls candidate dry-run cli` | Files: [`tools/normalize-legacy-xls-candidates-dry-run.js`, `package.json`, `backend/tests/legacy-xls-candidate-dry-run.test.js`]

- [ ] 6. TOP100 invariant and dry-run delta report

  What to do: Add manual TOP100 stats capture to the dry-run CLI using the existing `recordAnalyticsService.warmup().manualTopRecords` pattern. Write `manual-top-delta.json` and include `manualTopRecordStats.before`, `.after`, and `.delta` in `candidate-dry-run-report.json`. The expected dry-run invariant is `before.skippedDuplicates === 7321`, `after.skippedDuplicates === 7321`, and `delta.skippedDuplicates === 0`.
  Must NOT do: Do not mutate `data/results` to compute the delta; do not reinterpret delta `0` as failure for this dry-run.

  Parallelization: Can parallel: NO | Wave 2 | Blocks: [7] | Blocked by: [2, 5]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `tools/promote-track-a-xlsx-results.js:50` - existing `readManualTopStats` implementation.
  - Pattern:  `tools/promote-track-a-xlsx-results.js:62` - delta stats helper.
  - Test:     `backend/tests/division-hierarchy.test.js:52` - current TOP100 skipped duplicate invariant is 7,321.
  - Test:     `backend/tests/manual-top-records-ingest.test.js:126` - manual TOP100 dedup skip count is asserted as 7,321.
  - Scope:    `docs/work-orders/20260709-a3-xls-layout-classification.md:56` - Step 2 must keep TOP100 skip count 7,321 invariant.

  Acceptance criteria (agent-executable only):
  - [ ] RED captured first: `node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-011" > .omo/evidence/task-6-a3-xls-step2-top100-red.tap 2>&1; test $? -ne 0`
  - [ ] GREEN after implementation: `node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-011" > .omo/evidence/task-6-a3-xls-step2-top100-green.tap 2>&1`
  - [ ] CLI evidence assertion passes: `node -e "const r=require('./.omo/evidence/task-6-a3-xls-step2-top100/candidate-dry-run-report.json'); if (r.manualTopRecordStats.before.skippedDuplicates!==7321 || r.manualTopRecordStats.after.skippedDuplicates!==7321 || r.manualTopRecordStats.delta.skippedDuplicates!==0) throw new Error('TOP100 delta invariant failed')" > .omo/evidence/task-6-a3-xls-step2-top100-assert.txt 2>&1`

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: TOP100 delta remains zero in dry-run
    Tool:     bash
    Steps:    mkdir -p .omo/evidence/task-6-a3-xls-step2-top100 && node tools/normalize-legacy-xls-candidates-dry-run.js --years 2017 --limit 1 --out-dir .omo/evidence/task-6-a3-xls-step2-top100 --json > .omo/evidence/task-6-a3-xls-step2-top100.json
    Expected: Exit code 0; manual-top-delta.json exists and skippedDuplicates delta is 0.
    Evidence: .omo/evidence/task-6-a3-xls-step2-top100.json

  Scenario: invariant regression fails
    Tool:     bash
    Steps:    node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-011" > .omo/evidence/task-6-a3-xls-step2-top100-error.tap 2>&1
    Expected: Exit code 0; test would fail if skippedDuplicates is not exactly 7321 before and after.
    Evidence: .omo/evidence/task-6-a3-xls-step2-top100-error.tap
  ```

  Commit: YES | Message: `feat(data): report a3 xls top100 dry-run delta` | Files: [`tools/normalize-legacy-xls-candidates-dry-run.js`, `card-studio/services/legacyXlsCandidateDryRunService.js`, `backend/tests/legacy-xls-candidate-dry-run.test.js`]

- [ ] 7. Full original-fixture integration and safety scans

  What to do: Add private-original guarded integration tests using `ATHLETETIME_LEGACY_ORIGINAL_FIXTURE_ROOT` fallback, mirroring existing skip behavior. The full run must assert `attemptedWorkbooks: 83`, `candidateWorkbooks: 45`, `blockedWorkbooks: 38`, `blockedCandidateRowsParsed: 0`, no `held-candidates.jsonl`, no `data/results` diff, no raw originals tracked by git, and no forbidden tokens in public reports. Keep tests skipped with reason `private original workbook not present` when originals are unavailable.
  Must NOT do: Do not require private originals in public CI; do not hide failures when originals are present.

  Parallelization: Can parallel: NO | Wave 2 | Blocks: [8] | Blocked by: [1, 2, 3, 4, 5, 6]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `backend/tests/legacy-result-normalization.test.js:16` - private original fixture root and skip guard.
  - Pattern:  `backend/tests/legacy-xls-layout-classification.test.js:148` - full 83-workbook layout classification integration test.
  - Pattern:  `backend/tests/legacy-xls-layout-classification.test.js:167` - CLI evidence generation with `data/results` diff guard.
  - Pattern:  `backend/tests/legacy-result-normalization.test.js:70` - raw original git tracking must remain empty.
  - Evidence: `.omo/evidence/a3-xls-layout/final/xls-dry-run-report.json:9` - baseline attempted/converted files is 83.

  Acceptance criteria (agent-executable only):
  - [ ] RED captured first: `node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-012" > .omo/evidence/task-7-a3-xls-step2-integration-red.tap 2>&1; test $? -ne 0`
  - [ ] GREEN after implementation: `node --test backend/tests/legacy-xls-candidate-dry-run.test.js --test-name-pattern "LEGACY-XLS-CANDIDATE-012" > .omo/evidence/task-7-a3-xls-step2-integration-green.tap 2>&1`
  - [ ] Full targeted suite passes: `node --test backend/tests/legacy-xls-candidate-dry-run.test.js backend/tests/legacy-xls-layout-classification.test.js backend/tests/legacy-result-normalization.test.js backend/tests/division-hierarchy.test.js backend/tests/manual-top-records-ingest.test.js > .omo/evidence/task-7-a3-xls-step2-targeted.tap 2>&1`
  - [ ] Production diff guard passes: `git diff --exit-code -- data/results data/sources/import/originals > .omo/evidence/task-7-a3-xls-step2-data-diff.txt 2>&1`

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: full private-original dry-run
    Tool:     bash
    Steps:    mkdir -p .omo/evidence/task-7-a3-xls-step2-full && node tools/normalize-legacy-xls-candidates-dry-run.js --years 2015,2016,2017 --out-dir .omo/evidence/task-7-a3-xls-step2-full --json > .omo/evidence/task-7-a3-xls-step2-full.json
    Expected: Exit code 0 when originals are available; report has attemptedWorkbooks 83, candidateWorkbooks 45, blockedWorkbooks 38, serviceDataMutated false, and TOP100 skippedDuplicates delta 0.
    Evidence: .omo/evidence/task-7-a3-xls-step2-full.json

  Scenario: clean production data diff
    Tool:     bash
    Steps:    git diff --exit-code -- data/results data/sources/import/originals > .omo/evidence/task-7-a3-xls-step2-full-error.txt 2>&1
    Expected: Exit code 0 and no diff output.
    Evidence: .omo/evidence/task-7-a3-xls-step2-full-error.txt
  ```

  Commit: YES | Message: `test(data): verify a3 xls candidate dry-run invariants` | Files: [`backend/tests/legacy-xls-candidate-dry-run.test.js`, `card-studio/services/legacyXlsCandidateDryRunService.js`, `tools/normalize-legacy-xls-candidates-dry-run.js`]

- [ ] 8. Operator report polish and real CLI/tmux QA evidence

  What to do: Finalize `candidate-dry-run-report.md` and JSON payload fields for handoff: years, attempted/candidate/blocked workbooks, candidate rows by year, unspecified ratio, top 10 unspecified samples when present, blocked reason counts, partial sheet opportunities count, TOP100 before/after/delta, service mutation flags, and exact next-step note that service promotion is out of scope. Execute real CLI and tmux QA commands and store evidence.
  Must NOT do: Do not add marketing copy; do not claim promotion readiness beyond dry-run evidence; do not omit the partial-sheet decision.

  Parallelization: Can parallel: NO | Wave 3 | Blocks: [final] | Blocked by: [7]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `card-studio/services/legacyXlsConverterDryRunService.js:144` - Markdown report structure for A-3 dry-run evidence.
  - Pattern:  `tools/promote-track-a-xlsx-results.js:71` - concise human report fields for promotion-like data operations.
  - Scope:    `docs/work-orders/20260709-a3-xls-layout-classification.md:37` - normalized-candidates evidence must use promotable workbooks only.
  - Scope:    `docs/work-orders/20260709-a3-xls-layout-classification.md:38` - dedup delta must be reported.
  - Scope:    `docs/work-orders/20260712-unspecified-copy-and-coverage-track-k.md:53` - every A-3/A-4/A-6 PR should report unspecified-ratio change.

  Acceptance criteria (agent-executable only):
  - [ ] `npm run data:normalize:legacy-xls:dry-run -- --json > .omo/evidence/task-8-a3-xls-step2-npm.json 2> .omo/evidence/task-8-a3-xls-step2-npm.stderr` exits 0 when private originals are available.
  - [ ] `node -e "const fs=require('fs'); const r=JSON.parse(fs.readFileSync('.omo/evidence/a3-xls-step2-candidate-dry-run/candidate-dry-run-report.json','utf8')); for (const [k,v] of Object.entries({attemptedWorkbooks:83,candidateWorkbooks:45,blockedWorkbooks:38})) if (r[k]!==v) throw new Error(k); if (r.manualTopRecordStats.delta.skippedDuplicates!==0) throw new Error('top100 delta'); if (fs.existsSync('.omo/evidence/a3-xls-step2-candidate-dry-run/held-candidates.jsonl')) throw new Error('held candidates found');" > .omo/evidence/task-8-a3-xls-step2-report-assert.txt 2>&1`
  - [ ] `npm test > .omo/evidence/task-8-a3-xls-step2-npm-test.tap 2>&1` exits 0.
  - [ ] `npm audit --omit=dev --json > .omo/evidence/task-8-a3-xls-step2-npm-audit.json` exits 0 or records only accepted pre-existing advisories with no new dependency added by this work.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: real CLI dry-run with evidence
    Tool:     bash
    Steps:    rm -rf .omo/evidence/a3-xls-step2-candidate-dry-run && mkdir -p .omo/evidence/a3-xls-step2-candidate-dry-run && node tools/normalize-legacy-xls-candidates-dry-run.js --years 2015,2016,2017 --out-dir .omo/evidence/a3-xls-step2-candidate-dry-run --json > .omo/evidence/task-8-a3-xls-step2-cli.json
    Expected: Exit code 0; report has candidateWorkbooks 45, blockedWorkbooks 38, no held candidates, unspecifiedRatio <= 0.20, and TOP100 skippedDuplicates delta 0.
    Evidence: .omo/evidence/task-8-a3-xls-step2-cli.json

  Scenario: tmux-captured operator dry-run
    Tool:     tmux
    Steps:    tmux new-session -d -s a3_xls_step2_qa "cd /c/Users/SAMSUNG/Documents/GitHub/athletetime && node tools/normalize-legacy-xls-candidates-dry-run.js --years 2015,2016,2017 --out-dir .omo/evidence/a3-xls-step2-candidate-dry-run-tmux --json > .omo/evidence/task-8-a3-xls-step2-tmux.json 2>&1; tmux wait-for -S a3_xls_step2_done" && tmux wait-for a3_xls_step2_done && tmux capture-pane -pt a3_xls_step2_qa -S -200 > .omo/evidence/task-8-a3-xls-step2-tmux-pane.txt
    Expected: Command completes; tmux JSON evidence exists; pane capture contains no stack trace and JSON payload has ok true.
    Evidence: .omo/evidence/task-8-a3-xls-step2-tmux-pane.txt
  ```

  Commit: YES | Message: `docs(data): report a3 xls candidate dry-run evidence` | Files: [`card-studio/services/legacyXlsCandidateDryRunService.js`, `tools/normalize-legacy-xls-candidates-dry-run.js`, `package.json`, `backend/tests/legacy-xls-candidate-dry-run.test.js`, `.omo/evidence/a3-xls-step2-candidate-dry-run/*`]

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
- Reference the plan file path in the final commit footer: `Plan: .omo/plans/athletetime-a3-xls-step2-candidate-dry-run.md`.

## Success criteria
- All 83 A-3 `.xls` workbooks are classified, exactly 45 promotable workbooks are parsed, and exactly 38 blocked workbooks are represented only in `blocked-workbooks.json`.
- `normalized-candidates.jsonl` exists, contains no held-candidate stubs, and every candidate row has required candidate fields plus division metadata from `divisionHierarchyService`.
- `unspecifiedRatio <= 0.20`; otherwise the run fails with `A3_XLS_UNSPECIFIED_THRESHOLD_EXCEEDED` and sanitized samples.
- `manualTopRecordStats.skippedDuplicates` remains `7321` before and after; `delta.skippedDuplicates` is `0`.
- `data/results` diff is zero, raw originals remain untracked, public reports pass forbidden-token scans, all targeted tests and `npm test` pass, and F1-F4 approve.
