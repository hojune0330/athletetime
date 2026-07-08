# Fable Review Request: KAAF Backfill + TOP100 Service Readiness

Please review this branch before launch merge.

## What changed

- TOP100 candidate records remain service-searchable through analytics.
- Fable's 2005-2017 backup tar is imported into ignored private original storage.
- Only manifest/report are committed for the backup originals.
- Importer uses safe internal filenames and preserves original archive paths in manifest.

## Files to inspect

- `tools/import-kaaf-backfill-originals.js`
- `backend/tests/kaaf-backfill-originals-import.test.js`
- `data/sources/manifests/20260708-kaaf-backfill-2005-2017-manifest.json`
- `data/sources/manifests/20260708-kaaf-backfill-2005-2017-report.md`
- `docs/athletetime-kaaf-backfill-originals-handoff.md`
- `.omo/evidence/kaaf-backfill-service-readiness/summary.md`

## Approval questions

1. Does the backup boundary look right?
   - Raw originals stay local/private.
   - Manifest/report can be committed.
   - Rows inside originals are not published until parser + human review.

2. Does TOP100 candidate handling stay conservative enough?
   - `sourceType=public_top_record_candidate`
   - `sourceTier=B`
   - `reviewStatus=needs_external_confirmation`
   - Not mixed into `data/results` as official competition rows.

3. Is the operator workflow acceptable?
   - If a signed-in athlete requests a missing record, operators use this source vault/manifest plus athlete-history evidence to manually add reviewed normalized rows.

## Evidence

- Import: `.omo/evidence/kaaf-backfill-service-readiness/backfill-import-result.json`
- Git raw original check: `.omo/evidence/kaaf-backfill-service-readiness/git-tracked-originals.txt`
- HTTP TOP100 English search: `.omo/evidence/kaaf-backfill-service-readiness/http-top100-kim-kukyoung.txt`
- HTTP TOP100 Korean search: `.omo/evidence/kaaf-backfill-service-readiness/http-top100-korean-kim.txt`
- HTTP current results: `.omo/evidence/kaaf-backfill-service-readiness/http-current-competitions-2024.txt`
- HTTP season records with TOP100 source: `.omo/evidence/kaaf-backfill-service-readiness/http-season-records-2026-100m.txt`
- Full summary: `.omo/evidence/kaaf-backfill-service-readiness/summary.md`

## Known boundary

This does not make every 2005-2017 row searchable yet. It makes the source evidence safe, traceable, and ready for the next parser/reviewer phase.
