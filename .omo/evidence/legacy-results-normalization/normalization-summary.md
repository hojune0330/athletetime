# Legacy Result Normalization Summary

Date: 2026-07-07

## What Changed

AthleteTime now has a reproducible safe-source lane for legacy KAAF result files before the current structured `data/results/2018-2026` set.

This round did not claim row-level athlete normalization for all legacy files. It completed the safer prerequisite:

1. Discover public KAAF `FILEs_4` result attachments for 2000-2017.
2. Download official result originals into ignored private storage.
3. Build a canonical result-file catalog with stable IDs, title normalization, season buckets, file type buckets, and duplicate groups.
4. Audit which files can proceed to row-level extraction now and which need conversion.

## Public Source Basis

- KAAF domestic competition page pattern: `https://kaaf.or.kr/ver3/info/internal.asp?currentYear=<YEAR>`
- KAAF result attachment pattern: `https://www.kaaf.or.kr/DATA/schedule/<YEAR_OR_OLD>/.../FILEs_4/<FILENAME>`
- KAAF records/status reference pages remain secondary cross-check sources.
- KSOC result/history pages remain cross-check sources, not the primary bulk-download lane.

No blocked `result.kaaf.or.kr` collection path was used.

## Discovery Result

- Requested range: 2000-2017.
- Official result attachment candidates discovered: 396.
- Candidate-bearing years: 2005-2017.
- 2000-2004: no `FILEs_4` result candidates found from the current KAAF annual page scan.
- Excluded links: 3,346, including non-result file slots, life-sport exclusions, and blocked hosts.

Evidence:

- `kaaf-2000-2017-candidates.json`
- `source-discovery.md`

## Download Result

- Batch: `legacy-kaaf-results-2000-2017-20260707`
- Downloaded: 396 / 396.
- Failed: 0.
- Raw originals: `data/sources/import/originals/legacy-kaaf-results-2000-2017-20260707/`
- Raw originals are ignored by Git.

Evidence:

- `legacy-kaaf-results-2000-2017-20260707-manifest.json`
- `legacy-kaaf-results-2000-2017-20260707-report.md`

## Canonical Catalog Result

- Catalog entries: 396.
- Duplicate groups: 18.
- Extensions:
  - `.xls`: 329
  - `.xlsx`: 37
  - `.pdf`: 17
  - `.hwp`: 13
- Magic types:
  - `compound_office`: 337
  - `zip_office`: 37
  - `pdf`: 17
  - `unknown`: 5
- Category hints:
  - `track_field`: 230
  - `road`: 99
  - `youth`: 34
  - `field`: 18
  - `professional`: 15

Evidence:

- `legacy-kaaf-results-2000-2017-catalog.json`
- `catalog-report.md`
- `catalog-search-kbs-2005.json`

## Extraction Readiness

- `.xlsx`: 37 parseable with bundled `openpyxl`; all 37 have header hits.
- `.pdf`: 15 parseable text PDFs, 2 likely image/no-text PDFs.
- `.xls`: 329 require an XLS engine or conversion lane.
- `.hwp`: 13 require HWP conversion/extraction.

Evidence:

- `extraction-readiness.json`
- `extraction-readiness.md`

## Product Meaning

We can now honestly say:

> We have started collecting and organizing official KAAF public result files back to 2005, with source URLs and hashes.

We still must not say:

> AthleteTime has complete normalized athlete result rows from 2000-present.

Next required lane:

1. Add XLS/HWP conversion support.
2. Parse workbook/PDF tables into a staging schema.
3. Run row-quality holds before any public search exposure.
4. Backfill `data/results` only after staging rows pass quality gates.
