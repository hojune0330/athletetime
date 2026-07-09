# AthleteTime A-3 XLS Converter Dry-Run PR

## TL;DR
> Summary:      Build a main-based PR for A-3 legacy `.xls` converter dry-run groundwork only. Based on exploration, the branch is currently at `20fa69c` with `main` as the merge-base; this plan keeps converter evidence separate from service promotion.
> Deliverables:
> - Missing-original skip guard for `LEGACY-NORMALIZE-002`, `003`, and `005`
> - Approved SheetJS/BIFF dependency and synthetic `.xls` converter coverage
> - Dry-run converter service + CLI that writes sanitized evidence and never mutates `data/results`
> - Preflight copy/status updated from "approval needed" to "approved for dry-run, not service promotion"
> - A-2 Daegu indoor 60m/60mH protection regression proving ambiguous rows are not promoted
> - Agent-executed RED/GREEN test logs and manual QA artifacts
> Effort:       Medium
> Risk:         Medium - the work introduces a spreadsheet parser dependency and touches legacy data pipelines where raw originals must stay private.

## Scope
### Must have
- PR base is `main`, not an A-2/A-3 feature branch. Confirm before PR with `git merge-base HEAD main` returning `20fa69cab80509544103ed751afb84bf44c8eb64`.
- Dry-run converter only: inspect/convert `.xls` workbooks into local/sanitized evidence, not public `data/results` service files.
- Keep service promotion separate. Do not route `.xls` converter output into `tools/promote-track-a-xlsx-results.js` or `card-studio/services/legacyResultPromotionService.js`.
- Add missing-original skip guards in `backend/tests/legacy-result-normalization.test.js` for `LEGACY-NORMALIZE-002`, `LEGACY-NORMALIZE-003`, and `LEGACY-NORMALIZE-005`, so clones without ignored private originals skip those fixture-dependent checks instead of failing.
- Add approved SheetJS dependency for BIFF `.xls` parsing and lock it in `package-lock.json`.
- Add synthetic `.xls` tests first, then implement converter service/CLI.
- Converter output must contain sanitized workbook metadata by default: year, original filename, extension, sha256 prefix, sheet names, row counts, status/error codes, and aggregate counts.
- Private source paths and raw row/cell dumps must not appear in committed evidence. If executor adds an opt-in local row-sample mode, it must write only under an ignored local evidence path.
- Preserve A-2 Daegu indoor 60m/60mH parser protection: ambiguous/header-polluted rows remain held and cannot be mis-promoted.
- Evidence paths use `.omo/evidence/task-<N>-a3-xls-converter-dry-run.<ext>`.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- Stop condition: if any command modifies `data/results/*.json` or `data/results/index.json`, stop, revert only executor-made changes, and diagnose before continuing.
- Stop condition: if `git ls-files data/sources/import/originals` prints anything, stop; raw originals must not be committed.
- Stop condition: if SheetJS cannot read a synthetic BIFF `.xls` fixture, do not switch to service promotion or manual parsing; fix dependency/setup first.
- Stop condition: if the converter report contains `privateStoragePath`, `sourcePath`, `data/sources/import/originals/`, `PERSON_NO`, phone, email, address, or birthdate-like fields, stop and sanitize before proceeding.
- Do not commit raw `.xls` or `.xlsx` originals.
- Do not edit `data/results/**` in this PR.
- Do not edit `tools/promote-track-a-xlsx-results.js` or `card-studio/services/legacyResultPromotionService.js` unless a RED A-2 protection test proves a regression in existing promotion guard behavior.
- Do not promote A-3 `.xls` rows to public service data. Dry-run evidence is not approval for service promotion.
- Do not weaken existing 83 `.xls` and 335 older `.xls` queue counts unless manifest evidence proves the count changed.
- Do not add UI, API, frontend, crawler, or unrelated data candidate changes.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: TDD + Node built-in test runner (`node --test`) and CLI contract checks
- QA policy: every task has agent-executed scenarios
- Evidence: `.omo/evidence/task-<N>-a3-xls-converter-dry-run.<ext>`

## Execution strategy
### Parallel execution waves
> Target 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks to maximize parallelism.

Wave 1 (no dependencies):
- Task 1: Add missing-original skip guard for legacy normalization tests
- Task 2: Add approved SheetJS dependency and dependency smoke check
- Task 3: Add local-only evidence ignore guard
- Task 4: Lock A-2 Daegu indoor no-promotion regression

Wave 2 (after Wave 1):
- Task 5: depends [2, 3] - add converter service with synthetic BIFF `.xls` tests
- Task 6: depends [5] - add dry-run CLI and package script
- Task 7: depends [4, 6] - update preflight status/rendering for approved dry-run, not service promotion

Wave 3 (after Wave 2):
- Task 8: depends [1, 2, 3, 4, 5, 6, 7] - capture local dry-run QA and PR boundary evidence

Critical path: Task 2 -> Task 5 -> Task 6 -> Task 7 -> Task 8

### Dependency matrix
| Task | Depends on | Blocks | Can parallelize with |
|------|------------|--------|----------------------|
| 1    | none       | 8      | 2, 3, 4              |
| 2    | none       | 5, 8   | 1, 3, 4              |
| 3    | none       | 5, 8   | 1, 2, 4              |
| 4    | none       | 7, 8   | 1, 2, 3              |
| 5    | 2, 3       | 6      | none                 |
| 6    | 5          | 7, 8   | none                 |
| 7    | 4, 6       | 8      | none                 |
| 8    | 1, 2, 3, 4, 5, 6, 7 | none | none        |

## Todos
> Implementation + Test = ONE task. Never separate.
> Every task MUST have: References + Acceptance Criteria + QA Scenarios + Commit.

- [ ] 1. Add missing-original skip guard for legacy normalization tests

  What to do: In `backend/tests/legacy-result-normalization.test.js`, add a small helper that receives the `node:test` context and skips only private-original-dependent tests when the Track A sample/original vault is absent. Convert `LEGACY-NORMALIZE-002`, `LEGACY-NORMALIZE-003`, and `LEGACY-NORMALIZE-005` callbacks to accept `t`; call the helper before touching `TRACK_A_SAMPLE` or invoking the normalizer CLI. Use a test-only env override such as `ATHLETETIME_FORCE_MISSING_ORIGINALS_FOR_TEST=1` so the skip behavior can be proven without moving private files.
  Must NOT do: Do not skip `LEGACY-NORMALIZE-001` or `LEGACY-NORMALIZE-004`; they validate manifest planning and raw-original git safety without private originals. Do not hide real parser failures when originals exist.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [8] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `backend/tests/legacy-result-normalization.test.js:16` - private `TRACK_A_SAMPLE` path currently points under ignored originals.
  - Pattern:  `backend/tests/legacy-result-normalization.test.js:39` - `LEGACY-NORMALIZE-002` currently hard-fails when the sample is absent.
  - Pattern:  `backend/tests/legacy-result-normalization.test.js:50` - `LEGACY-NORMALIZE-003` depends on the same sample workbook.
  - Pattern:  `backend/tests/legacy-result-normalization.test.js:79` - `LEGACY-NORMALIZE-005` invokes the CLI and expects local original files.
  - Pattern:  `backend/tests/legacy-result-normalization.test.js:68` - keep raw-original git guard unskipped.
  - Pattern:  `tools/normalize-legacy-results.js:90` - CLI already reports `ORIGINAL_FILE_NOT_FOUND` per file when originals are absent.
  - Test:     `backend/tests/legacy-expansion-preflight.test.js:64` - temp-dir CLI test pattern with cleanup.
  - External: `https://nodejs.org/api/test.html` - Node `test()` context supports `t.skip()`.

  Acceptance criteria (agent-executable only):
  - [ ] RED: before adding the skip guard, `powershell -NoProfile -Command "$root=(Get-Location).Path; $wt=Join-Path $env:TEMP 'athletetime-missing-originals-red'; if(Test-Path $wt){git worktree remove --force $wt | Out-Null}; git worktree add --detach $wt HEAD | Out-Null; Push-Location $wt; node --test backend/tests/legacy-result-normalization.test.js *> (Join-Path $root '.omo/evidence/task-1-a3-xls-converter-dry-run-red.tap'); $code=$LASTEXITCODE; Pop-Location; git worktree remove --force $wt | Out-Null; if($code -eq 0){exit 1}else{exit 0}"` exits 0 by proving the unguarded clone-without-originals test fails.
  - [ ] GREEN: `powershell -NoProfile -Command "$env:ATHLETETIME_FORCE_MISSING_ORIGINALS_FOR_TEST='1'; node --test backend/tests/legacy-result-normalization.test.js *> .omo/evidence/task-1-a3-xls-converter-dry-run-green-forced-missing.tap"` exits 0 and the TAP contains `# skip 3`.
  - [ ] GREEN: `node --test backend/tests/legacy-result-normalization.test.js > .omo/evidence/task-1-a3-xls-converter-dry-run-green-local.tap` exits 0 on the executor machine when originals exist, with `LEGACY-NORMALIZE-002/003/005` still running.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: clone without ignored originals skips only fixture-dependent tests
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "$env:ATHLETETIME_FORCE_MISSING_ORIGINALS_FOR_TEST='1'; node --test backend/tests/legacy-result-normalization.test.js *> .omo/evidence/task-1-a3-xls-converter-dry-run-forced-missing.tap; if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}; $tap=Get-Content .omo/evidence/task-1-a3-xls-converter-dry-run-forced-missing.tap -Raw; if($tap -notmatch '# skip 3'){exit 1}; if($tap -notmatch 'LEGACY-NORMALIZE-001'){exit 1}; if($tap -notmatch 'LEGACY-NORMALIZE-004'){exit 1}"
    Expected: command exits 0; exactly three tests skip; manifest and git raw-original checks still run.
    Evidence: .omo/evidence/task-1-a3-xls-converter-dry-run-forced-missing.tap

  Scenario: local machine with originals still exercises parser/evidence path
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "Remove-Item Env:\ATHLETETIME_FORCE_MISSING_ORIGINALS_FOR_TEST -ErrorAction SilentlyContinue; node --test backend/tests/legacy-result-normalization.test.js *> .omo/evidence/task-1-a3-xls-converter-dry-run-local.tap; if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}; $tap=Get-Content .omo/evidence/task-1-a3-xls-converter-dry-run-local.tap -Raw; if($tap -match '# skip 3'){exit 1}"
    Expected: command exits 0; no forced missing-original skip appears when originals exist locally.
    Evidence: .omo/evidence/task-1-a3-xls-converter-dry-run-local.tap
  ```

  Commit: YES | Message: `test(data): guard legacy normalization without private originals` | Files: [`backend/tests/legacy-result-normalization.test.js`, `.omo/evidence/task-1-a3-xls-converter-dry-run-*.tap`]

- [ ] 2. Add approved SheetJS dependency and dependency smoke check

  What to do: Add the Fable-approved SheetJS dependency to the root Node project and lock it. Use the official SheetJS install shape unless repo policy requires an internal mirror: `npm install --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. Verify CommonJS loading from Node and document the dependency as approved for A-3 dry-run only in evidence.
  Must NOT do: Do not import SheetJS into service promotion. Do not install frontend dependencies. Do not leave `package-lock.json` out of sync.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [5, 8] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `package.json:34` - root runtime dependencies live here.
  - Pattern:  `package.json:49` - Node engine is `>=18.0.0`.
  - Pattern:  `package-lock.json:1` - lockfile must change with dependency.
  - Pattern:  `card-studio/services/xlsxTextExtractor.js:111` - existing `.xlsx` parser is hand-rolled and should remain separate from `.xls` BIFF support.
  - External: `https://docs.sheetjs.com/docs/getting-started/installation/nodejs` - SheetJS Node install and codepage setup for legacy formats.
  - External: `https://docs.sheetjs.com/docs/miscellany/errors` - CommonJS full build can be loaded with `require("xlsx/dist/xlsx.full.min")`.
  - External: `https://docs.sheetjs.com/docs/getting-started/examples/loader` - `XLSX.read(buffer)` supports Node Buffers.

  Acceptance criteria (agent-executable only):
  - [ ] RED: `node -e "require('xlsx/dist/xlsx.full.min')"` fails before dependency installation and output is captured in `.omo/evidence/task-2-a3-xls-converter-dry-run-red.txt`.
  - [ ] GREEN: `node -e "const XLSX=require('xlsx/dist/xlsx.full.min'); if(!XLSX.read || !XLSX.utils || !XLSX.utils.sheet_to_json) process.exit(1);"` exits 0 after installation.
  - [ ] `npm ls xlsx > .omo/evidence/task-2-a3-xls-converter-dry-run-npm-ls.txt` exits 0.
  - [ ] `git diff -- package.json package-lock.json` shows only the SheetJS dependency/lock changes.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: dependency loads in the root CommonJS runtime
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "node -e \"const XLSX=require('xlsx/dist/xlsx.full.min'); const ok=Boolean(XLSX.read&&XLSX.utils&&XLSX.utils.sheet_to_json); if(!ok) throw new Error('SheetJS API missing'); console.log(JSON.stringify({ok:true, version:XLSX.version||null}));\" *> .omo/evidence/task-2-a3-xls-converter-dry-run-smoke.json"
    Expected: command exits 0 and evidence JSON contains `"ok":true`.
    Evidence: .omo/evidence/task-2-a3-xls-converter-dry-run-smoke.json

  Scenario: lockfile is synchronized
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "npm ls xlsx *> .omo/evidence/task-2-a3-xls-converter-dry-run-npm-ls.txt"
    Expected: command exits 0 and output lists `xlsx`.
    Evidence: .omo/evidence/task-2-a3-xls-converter-dry-run-npm-ls.txt
  ```

  Commit: YES | Message: `build(data): add approved SheetJS xls parser` | Files: [`package.json`, `package-lock.json`, `.omo/evidence/task-2-a3-xls-converter-dry-run-*`]

- [ ] 3. Add local-only evidence ignore guard

  What to do: Add a narrow ignore rule for any intentionally local raw/sample converter evidence, for example `.omo/evidence/a3-xls-converter-dry-run/local/`. This protects optional local row-sample artifacts while allowing sanitized summary evidence to be committed. Add a repository guard test/command to prove raw originals and local row samples are not tracked.
  Must NOT do: Do not ignore all `.omo/evidence/`; existing evidence is tracked in this repo. Do not ignore the plan file. Do not remove existing tracked evidence.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [5, 8] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `.gitignore:56` - raw originals are already ignored under `data/sources/import/originals/`.
  - Pattern:  `backend/tests/track-a-xlsx-promotion.test.js:102` - public output must not expose `sourcePath` or `privateStoragePath`.
  - Pattern:  `backend/tests/track-a-xlsx-promotion.test.js:107` - existing safety scan pattern for private data terms.
  - Pattern:  `backend/tests/legacy-expansion-preflight.test.js:20` - helper pattern for asserting no private source paths.
  - Test:     `backend/tests/legacy-expansion-preflight.test.js:64` - sanitized CLI evidence and `data/results` non-mutation pattern.

  Acceptance criteria (agent-executable only):
  - [ ] RED: `git check-ignore -q .omo/evidence/a3-xls-converter-dry-run/local/raw-row-sample.jsonl` fails before the ignore rule and is captured in `.omo/evidence/task-3-a3-xls-converter-dry-run-red.txt`.
  - [ ] GREEN: `git check-ignore -v .omo/evidence/a3-xls-converter-dry-run/local/raw-row-sample.jsonl > .omo/evidence/task-3-a3-xls-converter-dry-run-green.txt` exits 0 after the ignore rule.
  - [ ] `git ls-files data/sources/import/originals > .omo/evidence/task-3-a3-xls-converter-dry-run-raw-originals.txt` produces an empty file.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: local raw converter evidence path is ignored
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "git check-ignore -v .omo/evidence/a3-xls-converter-dry-run/local/raw-row-sample.jsonl *> .omo/evidence/task-3-a3-xls-converter-dry-run-ignore.txt"
    Expected: command exits 0 and output names the new narrow ignore rule.
    Evidence: .omo/evidence/task-3-a3-xls-converter-dry-run-ignore.txt

  Scenario: raw original files are still untracked
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "git ls-files data/sources/import/originals *> .omo/evidence/task-3-a3-xls-converter-dry-run-raw-originals.txt; if((Get-Content .omo/evidence/task-3-a3-xls-converter-dry-run-raw-originals.txt -Raw).Trim().Length -ne 0){exit 1}"
    Expected: command exits 0 and evidence file is empty.
    Evidence: .omo/evidence/task-3-a3-xls-converter-dry-run-raw-originals.txt
  ```

  Commit: YES | Message: `chore(data): ignore local xls converter samples` | Files: [`.gitignore`, `.omo/evidence/task-3-a3-xls-converter-dry-run-*`]

- [ ] 4. Lock A-2 Daegu indoor no-promotion regression

  What to do: Add a RED-first regression proving A-2 Daegu indoor 60m/60mH remains held and is not service-promoted. Prefer extending `backend/tests/legacy-expansion-preflight.test.js` with an explicit test that checks `a2HeldIndoor.status`, held workbook details, required parser rule IDs, and a new or existing flag that keeps the held workbook out of A-3 service promotion. If a production change is needed, keep it in preflight/report metadata, not service promotion.
  Must NOT do: Do not loosen `UNSAFE_EVENT_LABELS` handling. Do not treat `60m`/`60mH` as `100m` family events. Do not edit data result files.

  Parallelization: Can parallel: YES | Wave 1 | Blocks: [7, 8] | Blocked by: []

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `backend/tests/legacy-expansion-preflight.test.js:25` - current A-2 held workbook regression.
  - Pattern:  `backend/tests/legacy-expansion-preflight.test.js:30` - required parser rule IDs already include `preserve-indoor-event-keys` and `still-held-on-ambiguity`.
  - Pattern:  `backend/tests/legacy-expansion-preflight.test.js:44` - existing check for `60m` sheet.
  - Pattern:  `backend/tests/legacy-expansion-preflight.test.js:45` - existing check for `60mH` sheet.
  - API/Type: `card-studio/services/legacyExpansionPreflightService.js:70` - required parser rules source.
  - API/Type: `card-studio/services/legacyResultPromotionService.js:303` - promotion safety assessment currently holds unsafe/header-polluted groups.
  - API/Type: `card-studio/services/legacyResultPromotionService.js:315` - unsafe event rows drive hold behavior.
  - Test:     `backend/tests/track-a-xlsx-promotion.test.js:67` - promotion dry-run currently expects one held workbook.

  Acceptance criteria (agent-executable only):
  - [ ] RED: new A-2 protection assertion fails before the preflight/report metadata change and is captured with `node --test backend/tests/legacy-expansion-preflight.test.js > .omo/evidence/task-4-a3-xls-converter-dry-run-red.tap`.
  - [ ] GREEN: `node --test backend/tests/legacy-expansion-preflight.test.js > .omo/evidence/task-4-a3-xls-converter-dry-run-green.tap` exits 0.
  - [ ] `node --test backend/tests/track-a-xlsx-promotion.test.js > .omo/evidence/task-4-a3-xls-converter-dry-run-promotion-guard.tap` exits 0 and still reports the held unsafe workbook.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: preflight keeps Daegu indoor workbook held
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "node --test backend/tests/legacy-expansion-preflight.test.js *> .omo/evidence/task-4-a3-xls-converter-dry-run-preflight.tap"
    Expected: command exits 0; TAP includes `LEGACY-PREFLIGHT-001`; assertions cover `60m`, `60mH`, `preserve-indoor-event-keys`, and `still-held-on-ambiguity`.
    Evidence: .omo/evidence/task-4-a3-xls-converter-dry-run-preflight.tap

  Scenario: promotion guard still refuses ambiguous held workbook
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "node --test backend/tests/track-a-xlsx-promotion.test.js *> .omo/evidence/task-4-a3-xls-converter-dry-run-promotion-guard.tap"
    Expected: command exits 0 and existing promotion report expectations still include one `UNSAFE_EVENT_LABELS` held workbook.
    Evidence: .omo/evidence/task-4-a3-xls-converter-dry-run-promotion-guard.tap
  ```

  Commit: YES | Message: `test(data): preserve indoor legacy hold guard` | Files: [`backend/tests/legacy-expansion-preflight.test.js`, `card-studio/services/legacyExpansionPreflightService.js`, `.omo/evidence/task-4-a3-xls-converter-dry-run-*`]

- [ ] 5. Add converter service with synthetic BIFF `.xls` tests

  What to do: Create `backend/tests/legacy-xls-converter-dry-run.test.js` first. The test should build a synthetic `.xls` workbook in `os.tmpdir()` using SheetJS, then expect a new `card-studio/services/legacyXlsConverterDryRunService.js` to read the BIFF file and return sanitized workbook/sheet metadata. Implement the service after RED. Service should expose pure functions such as `inspectLegacyXlsWorkbook`, `buildLegacyXlsDryRunReport`, and `sanitizeXlsWorkbookSummary`. Use `XLSX.read(fs.readFileSync(filePath), { raw: true })` and `XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, blankrows: false, defval: '' })` or the closest documented SheetJS equivalent.
  Must NOT do: Do not read/write `data/results`. Do not store private source paths in returned report objects. Do not commit synthetic files; create them in temp dirs during tests. Do not use the existing hand-rolled `.xlsx` ZIP parser for `.xls`.

  Parallelization: Can parallel: NO | Wave 2 | Blocks: [6] | Blocked by: [2, 3]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `card-studio/services/legacyResultNormalizationService.js:46` - manifest-year filtering and plan shape to reuse.
  - Pattern:  `card-studio/services/legacyResultNormalizationService.js:119` - existing workbook layout result shape for horizontal podium inspection.
  - Pattern:  `card-studio/services/legacyExpansionPreflightService.js:119` - A-3 `.xls` queue filtering from the normalization plan.
  - Pattern:  `card-studio/services/legacyExpansionPreflightService.js:51` - sanitized workbook metadata pattern with sha256 prefix.
  - Pattern:  `backend/tests/source-download.test.js:42` - local test fixture/server style; use temp files and cleanup.
  - Test:     `backend/tests/track-a-xlsx-promotion.test.js:116` - failure-path test pattern before output exists.
  - External: `https://docs.sheetjs.com/docs/getting-started/examples/loader` - SheetJS can read Node Buffers with `XLSX.read(buffer)`.
  - External: `https://docs.sheetjs.com/docs/solutions/output` - `sheet_to_json(..., { header: 1 })` returns arrays of rows.
  - External: `https://docs.sheetjs.com/docs/getting-started/installation/nodejs` - codepage support for older spreadsheet formats.

  Acceptance criteria (agent-executable only):
  - [ ] RED: `node --test backend/tests/legacy-xls-converter-dry-run.test.js > .omo/evidence/task-5-a3-xls-converter-dry-run-red.tap` fails for the missing/not-yet-implemented converter service, not for syntax errors in the test.
  - [ ] GREEN: `node --test backend/tests/legacy-xls-converter-dry-run.test.js > .omo/evidence/task-5-a3-xls-converter-dry-run-green.tap` exits 0.
  - [ ] Converter report for the synthetic `.xls` includes `sheetNames`, non-zero row counts, and `status: "converted_for_dry_run"` or equivalent.
  - [ ] Converter report text/JSON does not contain `privateStoragePath`, `sourcePath`, `data/sources/import/originals/`, `PERSON_NO`, `phone`, `email`, `address`, or `birthdate`.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: synthetic BIFF workbook is read into sanitized metadata
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "node --test backend/tests/legacy-xls-converter-dry-run.test.js *> .omo/evidence/task-5-a3-xls-converter-dry-run-synthetic.tap"
    Expected: command exits 0; test-created `.xls` fixture is parsed; no fixture remains outside temp cleanup.
    Evidence: .omo/evidence/task-5-a3-xls-converter-dry-run-synthetic.tap

  Scenario: sanitizer blocks private fields in converter summaries
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "node -e \"const svc=require('./card-studio/services/legacyXlsConverterDryRunService'); const text=JSON.stringify(svc.sanitizeXlsWorkbookSummary({year:2015,originalFilename:'sample.xls',extension:'.xls',sha256:'1234567890abcdef',sourcePath:'data/sources/import/originals/private.xls',privateStoragePath:'secret',sheetNames:['Sheet1'],rows:[['PERSON_NO']] })); if(/privateStoragePath|sourcePath|data\\/sources\\/import\\/originals|PERSON_NO/i.test(text)) throw new Error(text);\" *> .omo/evidence/task-5-a3-xls-converter-dry-run-sanitizer.txt"
    Expected: command exits 0 and sanitizer evidence contains no private terms.
    Evidence: .omo/evidence/task-5-a3-xls-converter-dry-run-sanitizer.txt
  ```

  Commit: YES | Message: `feat(data): add legacy xls dry-run converter` | Files: [`backend/tests/legacy-xls-converter-dry-run.test.js`, `card-studio/services/legacyXlsConverterDryRunService.js`, `.omo/evidence/task-5-a3-xls-converter-dry-run-*`]

- [ ] 6. Add dry-run CLI and package script

  What to do: Create `tools/convert-legacy-xls-dry-run.js` that wraps the service. Add a root `package.json` script, for example `data:convert:legacy-xls:dry-run`, that runs `node tools/convert-legacy-xls-dry-run.js --years 2015,2016,2017 --out-dir .omo/evidence/a3-xls-converter-dry-run/sanitized --json`. CLI options must include `--years`, `--out-dir`, `--limit`, `--json`, and optional `--manifest` for synthetic tests. Tests in `backend/tests/legacy-xls-converter-dry-run.test.js` must cover CLI success, missing originals, invalid manifest/path, and non-mutation of `data/results`.
  Must NOT do: Do not add `--write` or any service-promotion mode. Do not default output to `data/results`. Do not print raw rows to stdout.

  Parallelization: Can parallel: NO | Wave 2 | Blocks: [7, 8] | Blocked by: [5]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `tools/audit-legacy-expansion-queue.js:15` - existing lightweight CLI argument parsing.
  - Pattern:  `tools/audit-legacy-expansion-queue.js:47` - output directory creation and JSON/markdown writes.
  - Pattern:  `tools/audit-legacy-expansion-queue.js:60` - CLI error payload shape.
  - Pattern:  `tools/normalize-legacy-results.js:142` - `--years` and `--out-dir` defaults for legacy evidence.
  - Pattern:  `backend/tests/legacy-expansion-preflight.test.js:67` - `git status --short -- data/results` before/after mutation guard.
  - Pattern:  `package.json:21` - existing data script naming pattern.
  - Anti-pattern: `tools/promote-track-a-xlsx-results.js:89` - promotion CLI has `--dry-run`/`--write`; the new converter CLI must not add `--write`.

  Acceptance criteria (agent-executable only):
  - [ ] RED: CLI test fails before `tools/convert-legacy-xls-dry-run.js` exists and is captured in `.omo/evidence/task-6-a3-xls-converter-dry-run-red.tap`.
  - [ ] GREEN: `node --test backend/tests/legacy-xls-converter-dry-run.test.js > .omo/evidence/task-6-a3-xls-converter-dry-run-green.tap` exits 0.
  - [ ] `node tools/convert-legacy-xls-dry-run.js --years 2015,2016,2017 --limit 1 --out-dir .omo/evidence/task-6-a3-xls-converter-dry-run-cli --json > .omo/evidence/task-6-a3-xls-converter-dry-run-cli.json` exits 0 whether originals exist or not; if missing, report contains `ORIGINAL_FILE_NOT_FOUND` counts instead of throwing.
  - [ ] `git diff --name-only -- data/results` is empty after CLI execution.
  - [ ] `npm run data:convert:legacy-xls:dry-run -- --limit 1 --out-dir .omo/evidence/task-6-a3-xls-converter-dry-run-npm --json > .omo/evidence/task-6-a3-xls-converter-dry-run-npm.json` exits 0.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: dry-run CLI writes sanitized converter evidence only
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "$before=git status --short -- data/results; node tools/convert-legacy-xls-dry-run.js --years 2015,2016,2017 --limit 1 --out-dir .omo/evidence/task-6-a3-xls-converter-dry-run-cli --json *> .omo/evidence/task-6-a3-xls-converter-dry-run-cli.json; if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}; $after=git status --short -- data/results; if($before -ne $after){exit 1}; $text=Get-Content .omo/evidence/task-6-a3-xls-converter-dry-run-cli.json -Raw; if($text -match 'privateStoragePath|sourcePath|data/sources/import/originals|PERSON_NO|phone|email|address|birthdate'){exit 1}"
    Expected: command exits 0; sanitized JSON exists; `data/results` status is unchanged; private terms are absent.
    Evidence: .omo/evidence/task-6-a3-xls-converter-dry-run-cli.json

  Scenario: invalid manifest/path fails gracefully
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "node tools/convert-legacy-xls-dry-run.js --manifest .omo/evidence/does-not-exist.json --years 2015 --out-dir .omo/evidence/task-6-a3-xls-converter-dry-run-bad --json *> .omo/evidence/task-6-a3-xls-converter-dry-run-error.json; if($LASTEXITCODE -eq 0){exit 1}; $text=Get-Content .omo/evidence/task-6-a3-xls-converter-dry-run-error.json -Raw; if($text -notmatch 'LEGACY_XLS_DRY_RUN_FAILED|MANIFEST'){exit 1}"
    Expected: process exits non-zero with structured error JSON and no output directory containing converted data.
    Evidence: .omo/evidence/task-6-a3-xls-converter-dry-run-error.json
  ```

  Commit: YES | Message: `feat(data): add legacy xls dry-run cli` | Files: [`tools/convert-legacy-xls-dry-run.js`, `package.json`, `backend/tests/legacy-xls-converter-dry-run.test.js`, `.omo/evidence/task-6-a3-xls-converter-dry-run-*`]

- [ ] 7. Update preflight status/rendering for approved dry-run, not service promotion

  What to do: Update `card-studio/services/legacyExpansionPreflightService.js` and `backend/tests/legacy-expansion-preflight.test.js` so A-3 no longer reads as "dependency approval required." It should read as "SheetJS/BIFF dependency approved for dry-run" with `servicePromotionAllowed: false`, `conversionAttempted: false` unless supplied dry-run evidence is explicitly loaded, and clear next actions: run converter dry-run, review sanitized/local evidence, then open a separate service-promotion plan/PR later. Keep the 83 `.xls` queue count for 2015-2017 and 335 `.xls` count for 2005-2017.
  Must NOT do: Do not imply `.xls` rows are approved for public service data. Do not change A-2 held workbook status to clear. Do not include private source paths in rendered JSON/markdown.

  Parallelization: Can parallel: NO | Wave 2 | Blocks: [8] | Blocked by: [4, 6]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `card-studio/services/legacyExpansionPreflightService.js:119` - current A-3 queue summary.
  - Pattern:  `card-studio/services/legacyExpansionPreflightService.js:138` - current `requiresDependencyApproval` flag.
  - Pattern:  `card-studio/services/legacyExpansionPreflightService.js:140` - current approval note text.
  - Pattern:  `card-studio/services/legacyExpansionPreflightService.js:164` - current next actions.
  - Pattern:  `card-studio/services/legacyExpansionPreflightService.js:183` - markdown renderer.
  - Test:     `backend/tests/legacy-expansion-preflight.test.js:49` - current A-3 approval-gated expectations must be updated.
  - Test:     `backend/tests/legacy-expansion-preflight.test.js:113` - rendered report copy assertion must distinguish approved dry-run from promotion.
  - Test:     `backend/tests/legacy-expansion-preflight.test.js:124` - 2005-2017 queue count must remain 335 `.xls`.

  Acceptance criteria (agent-executable only):
  - [ ] RED: updated preflight tests fail before service/rendering changes and are captured in `.omo/evidence/task-7-a3-xls-converter-dry-run-red.tap`.
  - [ ] GREEN: `node --test backend/tests/legacy-expansion-preflight.test.js > .omo/evidence/task-7-a3-xls-converter-dry-run-green.tap` exits 0.
  - [ ] `node tools/audit-legacy-expansion-queue.js --years 2015,2016,2017 --out-dir .omo/evidence/task-7-a3-xls-converter-dry-run-preflight --json > .omo/evidence/task-7-a3-xls-converter-dry-run-preflight.json` exits 0.
  - [ ] The preflight JSON/markdown contains "approved for dry-run" or equivalent and contains `servicePromotionAllowed` false, but does not contain `requiresDependencyApproval` true.
  - [ ] The preflight JSON/markdown contains no private source path terms.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: preflight reports approved converter dry-run without service promotion
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "node tools/audit-legacy-expansion-queue.js --years 2015,2016,2017 --out-dir .omo/evidence/task-7-a3-xls-converter-dry-run-preflight --json *> .omo/evidence/task-7-a3-xls-converter-dry-run-preflight.json; if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}; $text=(Get-Content .omo/evidence/task-7-a3-xls-converter-dry-run-preflight.json -Raw) + (Get-Content .omo/evidence/task-7-a3-xls-converter-dry-run-preflight/preflight-report.md -Raw); if($text -notmatch 'dry-run'){exit 1}; if($text -match 'requiresDependencyApproval.*true'){exit 1}; if($text -notmatch 'servicePromotionAllowed'){exit 1}; if($text -match 'privateStoragePath|sourcePath|data/sources/import/originals'){exit 1}"
    Expected: command exits 0; report distinguishes approved dry-run from service promotion and is sanitized.
    Evidence: .omo/evidence/task-7-a3-xls-converter-dry-run-preflight.json

  Scenario: long-range queue counts are unchanged
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "node --test backend/tests/legacy-expansion-preflight.test.js *> .omo/evidence/task-7-a3-xls-converter-dry-run-preflight.tap"
    Expected: command exits 0; `LEGACY-PREFLIGHT-005` still asserts `xlsxFiles: 37` and `xlsFiles: 335`.
    Evidence: .omo/evidence/task-7-a3-xls-converter-dry-run-preflight.tap
  ```

  Commit: YES | Message: `feat(data): mark xls converter dry-run approved` | Files: [`card-studio/services/legacyExpansionPreflightService.js`, `backend/tests/legacy-expansion-preflight.test.js`, `.omo/evidence/task-7-a3-xls-converter-dry-run-*`]

- [ ] 8. Capture local dry-run QA and PR boundary evidence

  What to do: Run the full targeted verification suite and capture artifacts. If private originals exist locally, run the dry-run converter over at least `--limit 3` and full `2015,2016,2017` if practical; if originals are absent, run the synthetic fixture path and missing-original report path. Confirm PR branch remains based on `main`, raw originals are untracked, `data/results` is untouched, and the planned PR title/body explicitly states "dry-run converter groundwork, not service promotion."
  Must NOT do: Do not declare complete until F1-F4 final verification all approve. Do not open the PR against anything except `main`. Do not commit local raw row-sample artifacts.

  Parallelization: Can parallel: NO | Wave 3 | Blocks: [] | Blocked by: [1, 2, 3, 4, 5, 6, 7]

  References (executor has NO interview context - be exhaustive):
  - Pattern:  `package.json:16` - full root test command includes legacy normalization, preflight, and promotion tests.
  - Pattern:  `package.json:21` - existing legacy normalization script.
  - Pattern:  `package.json:22` - existing Track A dry-run promotion script, used only as a guard that service promotion remains separate.
  - Pattern:  `tools/promote-track-a-xlsx-results.js:89` - existing promotion command has explicit `--write`; new converter must not use it.
  - Pattern:  `.gitignore:57` - raw original vault remains ignored.
  - Pattern:  `.omo/ulw-loop/a3-xls-converter-notepad.md:13` - existing note says branch was created from `main` at `20fa69c`; verify again, do not rely on the note.
  - External: `https://docs.sheetjs.com/docs/getting-started/examples/loader` - use to explain SheetJS Buffer read in PR body.

  Acceptance criteria (agent-executable only):
  - [ ] GREEN: `node --test backend/tests/legacy-result-normalization.test.js backend/tests/legacy-expansion-preflight.test.js backend/tests/legacy-xls-converter-dry-run.test.js backend/tests/track-a-xlsx-promotion.test.js > .omo/evidence/task-8-a3-xls-converter-dry-run-targeted.tap` exits 0.
  - [ ] GREEN: `npm test > .omo/evidence/task-8-a3-xls-converter-dry-run-npm-test.tap` exits 0, or pre-existing unrelated failures are isolated with exact failing tests and logs.
  - [ ] GREEN: `node tools/convert-legacy-xls-dry-run.js --years 2015,2016,2017 --limit 3 --out-dir .omo/evidence/task-8-a3-xls-converter-dry-run-local --json > .omo/evidence/task-8-a3-xls-converter-dry-run-local.json` exits 0.
  - [ ] GREEN: `git diff --name-only -- data/results > .omo/evidence/task-8-a3-xls-converter-dry-run-data-results-diff.txt` produces an empty file.
  - [ ] GREEN: `git ls-files data/sources/import/originals > .omo/evidence/task-8-a3-xls-converter-dry-run-raw-originals.txt` produces an empty file.
  - [ ] GREEN: `git merge-base HEAD main > .omo/evidence/task-8-a3-xls-converter-dry-run-merge-base.txt` contains `20fa69cab80509544103ed751afb84bf44c8eb64` unless `main` advanced; if `main` advanced, rebase/merge main and update evidence with the new merge-base.
  - [ ] PR body draft includes `Base: main`, `Dry-run converter only`, `No data/results mutation`, `Raw originals not committed`, and `A-2 Daegu indoor 60m/60mH remains held`.

  QA scenarios (MANDATORY - task incomplete without these):
  ```
  Scenario: targeted legacy suite passes with converter dry-run separated from promotion
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "node --test backend/tests/legacy-result-normalization.test.js backend/tests/legacy-expansion-preflight.test.js backend/tests/legacy-xls-converter-dry-run.test.js backend/tests/track-a-xlsx-promotion.test.js *> .omo/evidence/task-8-a3-xls-converter-dry-run-targeted.tap"
    Expected: command exits 0; TAP includes all four test files; Track A promotion tests remain green without consuming `.xls` converter output.
    Evidence: .omo/evidence/task-8-a3-xls-converter-dry-run-targeted.tap

  Scenario: real/local dry-run evidence is sanitized and non-mutating
    Tool:     powershell
    Steps:    powershell -NoProfile -Command "$before=git status --short -- data/results; node tools/convert-legacy-xls-dry-run.js --years 2015,2016,2017 --limit 3 --out-dir .omo/evidence/task-8-a3-xls-converter-dry-run-local --json *> .omo/evidence/task-8-a3-xls-converter-dry-run-local.json; if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}; $after=git status --short -- data/results; if($before -ne $after){exit 1}; $text=(Get-Content .omo/evidence/task-8-a3-xls-converter-dry-run-local.json -Raw) + (Get-Content .omo/evidence/task-8-a3-xls-converter-dry-run-local/* -Raw); if($text -match 'privateStoragePath|sourcePath|data/sources/import/originals|PERSON_NO|phone|email|address|birthdate'){exit 1}"
    Expected: command exits 0; dry-run artifacts are sanitized; `data/results` status is unchanged.
    Evidence: .omo/evidence/task-8-a3-xls-converter-dry-run-local.json
  ```

  Commit: YES | Message: `test(data): capture xls converter dry-run evidence` | Files: [`.omo/evidence/task-8-a3-xls-converter-dry-run-*`, optional `.omo/drafts/a3-xls-converter-dry-run-pr.md`]

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
- Reference the plan file path in the final commit footer: `Plan: .omo/plans/athletetime-a3-xls-converter-dry-run-pr.md`.

## Success criteria
- SC1 Missing-original guard: RED clone-without-originals baseline captured; GREEN forced-missing run skips exactly `LEGACY-NORMALIZE-002/003/005`; GREEN local run still exercises those tests when originals exist.
- SC2 SheetJS/BIFF dry-run: RED missing converter/dependency captured; GREEN synthetic `.xls` test and CLI dry-run pass with sanitized metadata.
- SC3 No mutation/no raw originals: `git diff --name-only -- data/results` and `git ls-files data/sources/import/originals` are empty in final evidence.
- SC4 A-2 protection: Daegu indoor 60m/60mH remains held; ambiguous/header rows are not service-promoted; Track A promotion tests still report the unsafe held workbook.
- SC5 PR boundary: PR targets `main`, states dry-run converter groundwork only, and explicitly excludes service promotion.
- All Must-Have shipped; all QA scenarios pass with captured evidence; F1-F4 approved; commit history clean.
