# A-3 XLS Layout Classification Dry Run

Base: `main`

## Summary
- Extends the approved `.xls` dry-run report with workbook/sheet-level layout classification.
- Classifies all 2015-2017 legacy `.xls` files into `horizontal_podium`, `vertical_result_list`, `summary_only`, `mixed`, and `unknown`.
- Keeps the safety line from PR #41: this PR does **not** promote `.xls` rows to public service data.
- Registers a new contract test: `backend/tests/legacy-xls-layout-classification.test.js`.

## Result
- Attempted `.xls` files: `83`
- Converted/readable: `83`
- Failed: `0`
- Workbook `unknown`: `0`
- Sheet `unknown`: `0`
- Promotable by existing horizontal pipeline: `45`
- Blocked pending parser/review: `38`

## Layout Counts
- Workbook layouts: `horizontal_podium=13`, `vertical_result_list=1`, `summary_only=0`, `mixed=69`, `unknown=0`
- Sheet layouts: `horizontal_podium=92`, `vertical_result_list=125`, `summary_only=128`, `mixed=0`, `unknown=0`
- Block reasons: `VERTICAL_RESULT_LIST_NEEDS_PARSER=35`, `MIXED_RESULT_LAYOUTS_NEED_REVIEW=3`

## By Year
- `2015`: total `29`, promotable `17`
- `2016`: total `28`, promotable `14`
- `2017`: total `26`, promotable `14`

## Safety / Non-Goals
- `servicePromotionAllowed: false`
- `serviceDataMutated: false`
- `data/results` diff: empty
- raw originals tracked by git: `0`
- forbidden evidence scan: `0` hits for sensitive/private marker patterns

## Verification
- RED: `.omo/evidence/a3-xls-layout-red.tap`
- Layout contract: `.omo/evidence/a3-xls-layout-green-final.tap` (`4/4`)
- Targeted suite: `.omo/evidence/a3-xls-layout-targeted.tap` (`20/20`)
- Full suite: `.omo/evidence/a3-xls-layout-npm-test.tap` (`241/241`)
- Final evidence:
  - `.omo/evidence/a3-xls-layout-final.json`
  - `.omo/evidence/a3-xls-layout/final/xls-dry-run-report.json`
  - `.omo/evidence/a3-xls-layout/final/xls-dry-run-report.md`
- Mutation guard:
  - `.omo/evidence/a3-xls-layout-data-results-diff.txt` is empty
  - `.omo/evidence/a3-xls-layout-raw-originals.txt` is empty
- Security scan: `.omo/evidence/a3-xls-layout-forbidden-scan.txt` is empty
- `npm audit` summary: `.omo/evidence/a3-xls-layout-npm-audit-summary.json`; `xlsxListed=false`, existing total `12`

## Fable Review Ask
- Confirm that `45` horizontal/mixed-with-summary workbooks are the correct Step 2 candidate set for normalized-candidates dry-run.
- Confirm that `38` blocked workbooks should stay out of Step 2 until vertical road/relay/team parsers are specified.
- Confirm whether Step 2 should parse only `promotable=true` workbooks first, or also produce held-candidate stubs for the `VERTICAL_RESULT_LIST_NEEDS_PARSER` group.
