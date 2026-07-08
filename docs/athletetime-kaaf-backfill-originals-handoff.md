# KAAF 2005-2017 Originals Backfill Handoff

## What Fable's backup file is

`kaaf_backfill_originals_2005-2017_2026-07-08.tar.gz` is an operator backup of original KAAF result files. It is not a normalized service database.

Use it as:

- source evidence for where old results came from
- a private reprocessing vault for future XLS/XLSX/PDF/HWP row extraction
- a reconciliation target when old competitions are missing from `data/results`

Do not use it as:

- a public download bundle
- a static asset
- a direct search index
- proof that every row inside is clean enough to publish

## Current import result

Batch: `20260708-kaaf-backfill-2005-2017`

Committed artifacts:

- `data/sources/manifests/20260708-kaaf-backfill-2005-2017-manifest.json`
- `data/sources/manifests/20260708-kaaf-backfill-2005-2017-report.md`

Private local originals:

- `data/sources/import/originals/20260708-kaaf-backfill-2005-2017/`
- This directory is git-ignored and must stay untracked.

Observed import summary:

- tar entries: 451
- files: 428
- years: 2005-2017
- `.xls`: 335
- `.xlsx`: 37
- `.pdf`: 39
- `.hwp`: 17

## How to re-run the import

```bash
npm run data:import:kaaf-backfill -- --archive "C:/Users/SAMSUNG/Downloads/kaaf_backfill_originals_2005-2017_2026-07-08.tar.gz" --json
```

The importer stores files with safe internal filenames while preserving the original archive path in the manifest.

Why: old KAAF files can contain Korean names, spaces, brackets, or legacy archive metadata that may fail on Windows or deployment environments.

## Service-readiness boundary

Already service-searchable:

- existing normalized result data in `data/results`
- manual TOP100 candidate records in `data/manual/kaaf-top100`

Not yet service-searchable:

- row contents inside the 2005-2017 original XLS/XLSX/PDF/HWP files

Those rows require a separate extractor and reviewer pass before they can move into a normalized public search index.

## Rules for Fable, Opus, Codex, and human operators

1. Keep originals private.
2. Commit only manifest, report, parser code, tests, and normalized reviewed rows.
3. Never expose original file bodies through an API.
4. Never mix TOP100 candidate records with official competition result rows.
5. Preserve `archivePathInBackup`, `sha256`, `fileSize`, `extension`, and `reviewStatus` for every original.
6. If a logged-in athlete requests a missing record, use the manifest to find likely source files, then manually verify through athlete-history/result evidence before adding reviewed normalized rows.

## Next parser work

Recommended order:

1. XLS/XLSX parser for structured result sheets.
2. PDF text extraction for international/open meet files.
3. HWP conversion policy before import; do not auto-publish HWP rows without manual QA.
4. Competition-level reconciliation report: expected competitions by year vs normalized competitions already searchable.
