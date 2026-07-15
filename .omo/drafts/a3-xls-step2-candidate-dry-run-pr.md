## Summary
- Add A-3 Step 2 XLS candidate dry-run pipeline for 2015-2017 legacy `.xls` originals.
- Parse only horizontal podium sheets into normalized candidate rows; keep vertical/mixed residual sheets blocked as evidence.
- Preserve Fable boundaries: 45 fully promotable workbooks, 38 blocked workbooks, plus 3 sheet-level partial promotions from mixed 전국체전 files.
- Keep full `normalized-candidates.jsonl` as a local/generated artifact only; commit the summary, blocked evidence, and 50-row sample to avoid turning the PR into a bulk data dump.

## Key Result
- Attempted XLS files: 83
- Candidate rows generated locally: 21,865
- Fully promotable workbooks: 45
- Partially promoted workbooks: 3
- Blocked workbooks evidence list: 38
- Non-horizontal candidate rows: 0
- Private/source path leakage in committed evidence: 0
- Division unspecified ratio: 14.91% (below 20% stop threshold)
- TOP100 skipped duplicates invariant: 7,321 unchanged
- `data/results` mutation: 0

## Files
- `card-studio/services/legacyXlsHorizontalPodiumCandidateExtractor.js`
- `card-studio/services/legacyXlsStep2CandidateDryRunService.js`
- `tools/normalize-legacy-xls-candidates-dry-run.js`
- `backend/tests/legacy-xls-step2-candidate-dry-run.test.js`
- `package.json`
- `.gitignore`
- `.omo/evidence/a3-xls-step2-candidate-dry-run/*` (summary/sample/blocked only; full JSONL ignored)
- `.omo/evidence/a3-xls-step2/*`

## Verification
- RED captured: `.omo/evidence/a3-xls-step2/red-test.txt`
- Focused tests after reviewer skip-guard fix: `node --test backend/tests/legacy-xls-step2-candidate-dry-run.test.js` -> 4/4 pass
- Full tests after reviewer skip-guard fix: `npm test` -> 245/245 pass
- Frontend build check: `npm run build:check --prefix frontend` -> pass
- Final CLI: `node tools/normalize-legacy-xls-candidates-dry-run.js --years 2015,2016,2017 --out-dir .omo/evidence/a3-xls-step2-candidate-dry-run --json` -> pass
- Forbidden evidence scan -> `NO_MATCH`
- `git diff --check` -> pass (Windows CRLF warning only)
- `git status --short -- data/results` -> empty

## Fable Review Notes
- No vertical parser was introduced here.
- No held-candidate stubs are generated for blocked vertical sheets.
- Mixed workbooks are still listed in the 38 blocked-workbook evidence set; only their horizontal podium sheets are marked `partially_promoted` for candidate dry-run.
- The generated full candidate dump is reproducible but gitignored: `.omo/evidence/a3-xls-step2-candidate-dry-run/normalized-candidates.jsonl`.
- Real private-original tests now use the same skip guard as the adjacent XLS layout tests, so CI/clones without private originals do not fail.
