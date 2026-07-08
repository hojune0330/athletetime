# KAAF Backfill Service Readiness

## Skills

- `ulw-loop`: user invoked it; evidence-bound loop and manual QA are required.
- `programming`: JavaScript/TypeScript service and test changes.
- `debugging`: runtime/API verification and failure investigation.
- `review-work`: final diff and risk review.
- `ultra-research`: reviewed but not used as primary workflow; this is local artifact ingestion, not web-first product research.

## Success Criteria

1. Backup tar handling is clear and safe: originals are extracted only to ignored private storage, while committed artifacts are manifest/report only.
2. TOP100 manual records and current collected records are both usable by service search.
3. Fable/operator handoff explains how missing signed-in athlete records are manually verified and added.
4. No restricted identifiers or raw original files are committed.

## QA Scenarios

1. Backup import happy path
   - Automated RED/GREEN: `backend/tests/kaaf-backfill-originals-import.test.js` / `BACKFILL-IMPORT-001`.
   - Manual QA channel: tmux, command `node tools/import-kaaf-backfill-originals.js --archive C:/Users/SAMSUNG/Downloads/kaaf_backfill_originals_2005-2017_2026-07-08.tar.gz --batch 20260708-kaaf-backfill-2005-2017 --json`.
   - Pass observable: JSON has `ok:true`, `fileCount:428`, and `storageTrackedByGit:false`.
2. Service search happy path
   - Automated RED/GREEN: `backend/tests/manual-top-records-ingest.test.js` / existing TOP100 search test.
   - Manual QA channel: HTTP, command `curl -i "http://127.0.0.1:<port>/api/card-studio/analytics/records/search?q=김국영&limit=3"`.
   - Pass observable: HTTP 200 body includes `김국영` and candidate provenance remains non-official.
3. Current collected record regression
   - Automated RED/GREEN: `backend/tests/manual-top-records-ingest.test.js` / new current-record regression.
   - Manual QA channel: HTTP, command `curl -i "http://127.0.0.1:<port>/api/card-studio/results/competitions?year=2024"`.
   - Pass observable: HTTP 200 with existing competitions and no TOP100 batch as a fake competition.
4. Malformed archive path edge case
   - Automated RED/GREEN: `backend/tests/kaaf-backfill-originals-import.test.js` / `BACKFILL-IMPORT-002`.
   - Manual QA channel: tmux, command `node tools/import-kaaf-backfill-originals.js --archive C:/missing.tar.gz --batch bad --json`.
   - Pass observable: non-zero exit with `BACKFILL_ARCHIVE_NOT_FOUND`.

## Evidence Log

- RED pending.
- GREEN pending.
- Manual QA pending.
- Reviewer pending.

## Progress update - 2026-07-08 15:45 KST
- Imported Fable backup tar as private originals: 428 files, 2005-2017, safe-entry-js extraction.
- Committed-ready artifacts: data/sources/manifests/20260708-kaaf-backfill-2005-2017-{manifest.json,report.md}.
- Originals remain ignored: git ls-files data/sources/import/originals = 0.
- HTTP QA: TOP100 KIM KUKYOUNG and 김국영 return 200/search results; 2024 competitions return 30; season records include public_top_record_candidate source metadata.
- Verification: npm run data:verify:kaaf-backfill, manual-top records test, npm test 192/192, frontend type-check/build all pass.
