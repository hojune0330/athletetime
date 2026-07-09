# A-3 XLS Converter ULW Notepad

Date: 2026-07-09

Objective: main-based PR for A-3 `.xls` converter dry-run groundwork, A-2 indoor parser preflight protection, and missing-original skip guards.

Bootstrap:
- Skills used:
  - `omo:ulw-loop`: evidence-bound execution, manual QA, reviewer gate.
  - `omo:programming`: JS/Node production and test changes, TDD discipline.
  - `spreadsheets`: `.xls`/`.xlsx` data handling domain.
- `omo ulw-loop` CLI availability: `OMO_MISSING` from Git Bash. Evidence state will be tracked in this notepad and concrete artifact files instead of CLI state mutation.
- Repository start: `main` fast-forwarded to `20fa69c`, new branch `codex/a3-xls-converter-dry-run`.
- Base mistake prevention: this PR must target `main`, not a feature branch.

Success criteria:
- SC1 missing-original guard: original-file-dependent legacy normalization tests skip cleanly when the private original vault is absent, while still running on this machine when originals exist.
- SC2 approved `.xls` converter dry-run: add the approved BIFF parser dependency and produce sanitized conversion/audit evidence without mutating `data/results`.
- SC3 A-2 indoor protection: Daegu indoor 60m/60mH remains blocked or parsed with explicit event-key preservation and header-pollution guard; ambiguous rows are not promoted.
- SC4 PR readiness: targeted tests, full relevant suite, real CLI/manual QA artifacts, no raw originals committed, PR opened against `main`.

Baseline evidence:
- `.omo/evidence/a3-xls-converter-red-baseline-legacy-normalization.tap`: current legacy normalization tests pass on this PC because private originals exist.
- `.omo/evidence/a3-xls-converter-baseline-preflight.tap`: current A-2/A-3 preflight tests pass.
- Local original vault count: 428 files, `.xls` 335, `.xlsx` 37.

Implementation evidence:
- Branch: `codex/a3-xls-converter-dry-run`, merge-base with `origin/main`: `20fa69cab80509544103ed751afb84bf44c8eb64`.
- RED fixture guard: `.omo/evidence/a3-xls-converter-red-fixture-guard.tap`.
- GREEN missing-original guard: `.omo/evidence/task-1-a3-xls-converter-dry-run-green-forced-missing.tap`.
- SheetJS dependency: official CDN tarball `xlsx@0.20.3`; smoke evidence `.omo/evidence/task-2-a3-xls-converter-dry-run-smoke.json`.
- Local dry-run ignore: `.omo/evidence/task-3-a3-xls-converter-dry-run-green.txt`.
- A-2 promotion guard: `.omo/evidence/task-4-a3-xls-converter-dry-run-promotion-guard.tap`.
- XLS dry-run tests: `.omo/evidence/task-5-a3-xls-converter-dry-run-green-after-override.tap`.
- Real local dry-run: `.omo/evidence/task-8-a3-xls-converter-dry-run-local.json` (`attempted=3`, `converted=3`, `failed=0`, total queue `83`).
- Preflight status: `.omo/evidence/task-7-a3-xls-converter-dry-run-preflight.json` (`ready_for_dry_run`, service promotion not allowed).
- Full verification: `.omo/evidence/task-8-a3-xls-converter-dry-run-npm-test.tap` (`234/234`), `.omo/evidence/task-8-a3-xls-converter-dry-run-frontend-build-check.log`.
- Safety: `.omo/evidence/task-8-a3-xls-converter-dry-run-data-results-diff.txt` empty; `.omo/evidence/task-8-a3-xls-converter-dry-run-raw-originals.txt` empty.
- Audit: `.omo/evidence/task-8-a3-xls-converter-dry-run-npm-audit.json`; existing vulnerabilities remain, but `xlsx` is not in the audit vulnerability list after switching to SheetJS CDN `0.20.3`.

Post-write review:
- Changed source/test pure LOC: all new files under 250. `legacyExpansionPreflightService.js` is 215 pure LOC, warning band but not a defect; split before future substantial growth.
- No `data/results` mutation.
- No raw originals tracked.
- Dry-run report intentionally contains workbook/file names and aggregate row counts only, not private storage paths or raw rows.
