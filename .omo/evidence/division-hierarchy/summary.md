# Division Hierarchy Track I Evidence

Date: 2026-07-09

## Scope

Track I prerequisite for legacy 2005-2014 data expansion:

- Replace source-specific division keys such as `kaaf-kind-*` with canonical gender/level hierarchy keys.
- Preserve manual TOP100 ingestion counts.
- Add gender rollups such as `men-all` and `women-all`.
- Keep composite labels such as `남초,여초` out of one-sided gender rollups.
- Preserve grade-only levels such as `고 1학년부` and `중 1학년부` as high/middle hierarchy rows even when gender is absent.
- Expose fixed division level order to the records UI.
- Make the default season table open on a non-empty, useful selection.
- Do not promote or modify raw legacy result data in this branch.

## Verification

- RED contract: `.omo/evidence/division-hierarchy/red.tap`
- GREEN contract after default selection: `.omo/evidence/division-hierarchy/green-default-selection.tap`
- GREEN contract after review fixes: `.omo/evidence/division-hierarchy/green-review-fixes.tap`
- Full test suite: `.omo/evidence/division-hierarchy/npm-test-final.tap`
  - `# tests 223`
  - `# pass 223`
  - `# fail 0`
- Frontend typecheck and production build: `.omo/evidence/division-hierarchy/frontend-build-check-final.log`
  - `tsc -b && vite build`
  - built successfully in 24.54s
- HTTP QA: `.omo/evidence/division-hierarchy/http-qa-summary-final.json`
  - `/api/card-studio/analytics/filters` 200
  - `/api/card-studio/analytics/season-records` 200
  - `/records` 200
  - no `kaaf-kind-*` keys
  - default selection: `2026 / marathon / men-all`, `rowCount: 84`
- Browser QA: `.omo/evidence/division-hierarchy/browser-qa-summary-final.json`
  - opened `/records`
  - clicked `시즌 기록표 보기`
  - rendered 84 default rows
  - gender segment visible
  - level select includes `전체(부 통합)`, `고등부`, `중학부`
  - `층위 배지` column visible
  - console errors: 0
- Screenshot: `.omo/evidence/division-hierarchy/records-division-hierarchy-final.png`
- Interactive browser QA: `.omo/evidence/division-hierarchy/browser-filter-interaction-summary.json`
  - selected `100m`
  - clicked `여자`
  - selected `고등부`
  - observed request: `divisionKey=women-high`
  - observed table label: `2026 · 100m · 여자 고등부`
  - rendered rows: 1
  - console errors: 0
- Interactive screenshot: `.omo/evidence/division-hierarchy/records-division-filter-interaction.png`
- Reviewer recheck: `Verifier the 8th` returned OKAY after the composite-gender, grade-only, and interactive-browser QA fixes.

## Notes

- No source originals or raw private data were added.
- 2016 held workbook and 2005-2014 `.xls` conversion remain follow-up data expansion tracks after this prerequisite is reviewed/merged.
