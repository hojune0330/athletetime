# KAAF Backfill + TOP100 Service Readiness Evidence

## Backup import
- Source archive: `C:/Users/SAMSUNG/Downloads/kaaf_backfill_originals_2005-2017_2026-07-08.tar.gz`
- Import result: `.omo/evidence/kaaf-backfill-service-readiness/backfill-import-result.json`
- Manifest: `data/sources/manifests/20260708-kaaf-backfill-2005-2017-manifest.json`
- Report: `data/sources/manifests/20260708-kaaf-backfill-2005-2017-report.md`
- File count: 428
- Years: 2005-2017
- Extensions: `.xls` 335, `.xlsx` 37, `.pdf` 39, `.hwp` 17
- Extraction mode: `safe-entry-js`
- Raw originals tracked by Git: 0 (`git-tracked-originals.txt`)

## Service QA
- `http-top100-kim-kukyoung.txt`: HTTP 200, `total=1`, first result 김국영.
- `http-top100-korean-kim.txt`: HTTP 200, `total=3`, first result 김국영.
- `http-current-competitions-2024.txt`: HTTP 200, `total=30`, first result `2024 JTBC서울마라톤대회`.
- `http-season-records-2026-100m.txt`: HTTP 200, season rows include `sourceType=public_top_record_candidate`, `sourceTier=B`, `reviewStatus=needs_external_confirmation`.
- Cleanup receipt: `http-qa-cleanup.txt`.

## Test gates
- `npm run data:verify:kaaf-backfill`: pass, 3/3.
- `node --test backend/tests/manual-top-records-ingest.test.js`: pass, 3/3.
- `npm test`: pass, 192/192.
- `npm --prefix frontend run type-check`: pass.
- `npm --prefix frontend run build`: pass. Only Browserslist/baseline data age warnings.

## Boundary
- TOP100 and current normalized `data/results` are service-searchable.
- Fable backup originals are stored as private evidence/reprocessing sources only; their internal rows are not public-searchable until extracted and reviewed.
