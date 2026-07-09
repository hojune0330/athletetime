# A-3 Legacy XLS Converter Dry-Run Groundwork

Base: `main`

## Summary
- Adds an approved SheetJS/BIFF `.xls` parser path for **dry-run evidence only**.
- Adds a separate `tools/convert-legacy-xls-dry-run.js` CLI so `.xls` inspection cannot be confused with service promotion.
- Keeps A-2 Daegu indoor 60m/60mH held and marks A-3 as `ready_for_dry_run`, with `servicePromotionAllowed: false`.
- Adds missing-original skip guards so private-original-dependent legacy tests do not fail in clean clones.

## What This Does Not Do
- Does not mutate `data/results`.
- Does not commit raw originals.
- Does not promote `.xls` rows to the public service.
- Does not expose `privateStoragePath`, `sourcePath`, raw rows, `PERSON_NO`, or local original paths in dry-run reports.

## Verification
- `node --test backend/tests/legacy-original-fixture-guard.test.js backend/tests/legacy-result-normalization.test.js backend/tests/legacy-xls-converter-dry-run.test.js backend/tests/legacy-expansion-preflight.test.js backend/tests/track-a-xlsx-promotion.test.js`
  Evidence: `.omo/evidence/task-10-a3-xls-converter-targeted-final.tap` (`22/22`)
- `npm test`
  Evidence: `.omo/evidence/task-10-a3-xls-converter-npm-test-final.tap` (`237/237`)
- `npm --prefix frontend run build:check`
  Evidence: `.omo/evidence/task-8-a3-xls-converter-dry-run-frontend-build-check.log`
- Real local `.xls` dry-run: `node tools/convert-legacy-xls-dry-run.js --years 2015,2016,2017 --limit 3 --out-dir .omo/evidence/task-8-a3-xls-converter-dry-run-local --json`
  Evidence: `.omo/evidence/task-10-a3-xls-converter-local-final.json` (`attempted=3`, `converted=3`, `failed=0`)
- Malformed CLI guard: `.omo/evidence/task-10-a3-xls-converter-mixed-year-cli.json` exits non-zero for `--years 2017,not-a-year`.
- No public data mutation: `.omo/evidence/task-10-a3-xls-converter-data-results-diff-final.txt` is empty.
- No raw originals tracked: `.omo/evidence/task-10-a3-xls-converter-raw-originals-final.txt` is empty.
- PR base evidence: `.omo/evidence/task-8-a3-xls-converter-dry-run-merge-base.txt` equals `origin/main`.
- Independent reviewer: `UNCONDITIONAL APPROVAL` after two blocker rounds.

## Security Notes
- Uses SheetJS CDN tarball `xlsx@0.20.3`; `npm audit` still reports existing dependency issues, but `xlsx` is not in the vulnerability list after this change.
- `.omo/evidence/a3-xls-converter-dry-run/local/` is ignored for any optional local raw row samples.
- `legacyExpansionPreflightService.js` is now 215 pure LOC. It is under the 250 LOC ceiling but should be split before the next substantial expansion.

## Fable Review Ask
- Confirm the dry-run evidence shape is enough for A-4/A-5/A-6 expansion planning.
- Confirm whether the next PR should start with 2015-2017 `.xls` parsed layout classification, or first split `legacyExpansionPreflightService.js` before adding more rules.
