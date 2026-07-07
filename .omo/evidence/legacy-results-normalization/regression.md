# Legacy Result Normalization Regression Evidence

Date: 2026-07-07

## Scope

This evidence covers the legacy KAAF result-source collection lane for 2000-2017. It does not claim complete row-level athlete normalization.

## Commands Run

```sh
node --test backend/tests/kaaf-schedule-result-harvester.test.js
git diff --check
npm test
git check-ignore -v data/sources/import/originals/legacy-kaaf-results-2000-2017-20260707/001_05child_result.xls
find data/sources/import/originals/legacy-kaaf-results-2000-2017-20260707 -type f | wc -l
```

## Results

- `node --test backend/tests/kaaf-schedule-result-harvester.test.js`: 5 / 5 pass.
- `git diff --check`: pass. Windows CRLF warning only for the touched test file.
- `npm test`: 160 / 160 pass.
- Raw original storage ignore check: `.gitignore:57:data/sources/import/originals/`.
- Downloaded raw originals count: 396 files.

## Notes

- The full test run still prints existing 2026 competition source warnings for a few road/relay competitions with missing `kaafUrl`/`kaafSeq`. Those warnings predate this work and do not fail the suite.
- No `result.kaaf.or.kr` collection path was used.
- Raw result files are intentionally kept out of Git. The PR should commit only the reproducible CLI, tests, source manifest/catalog, and evidence reports.
