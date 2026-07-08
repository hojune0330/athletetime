# 2005-Current Backfill Review Report

Date: 2026-07-08
Batch: 2005-current-backfill

## Scope

Prepare the shared workspace for collecting missing AthleteTime result data from 2005 through the current service date.

## Storage Decision

Raw originals are not visible on GitHub.

Private originals path:

```text
data/sources/import/originals/kaaf-backfill-2005-20260708/
```

Public-safe GitHub path:

```text
docs/data-candidates/batches/2005-current-backfill/
```

## Current Contents

- `year-checklist.csv`: 2005-2026 work queue.
- `source-ledger.jsonl`: source metadata ledger.
- `candidate-records.jsonl`: sanitized candidate rows.
- `review-report.md`: human-readable report.

## Seed Candidate

One seed candidate exists so workers can see the expected shape:

- `MRC-20260708-0001`
- 2025 디스턴스첼린지대회(5차)
- 2025-07-19
- 이재웅
- 국군체육부대
- 800m
- 1:46.51
- status: `needs_external_confirmation`

## What Workers Should Do Next

1. Pick the next year from `year-checklist.csv`.
2. Check domestic and international KAAF schedule pages.
3. Store raw originals privately if attachments exist.
4. Add source metadata to `source-ledger.jsonl`.
5. Add sanitized missing-result candidates to `candidate-records.jsonl`.
6. Confirm against external official sources before marking candidates `confirmed`.

## Restricted Data Policy

Never commit:

- raw originals,
- raw TOP-record JSON,
- raw athlete-history HTML,
- source-side athlete identifier values,
- source-side TOP-record row identifier values,
- birth data,
- cookies,
- session IDs.

## 2026-07-08 Harvest Run (claude-backfill-20260708)

Automated official-attachment harvest for 2005-2017 (domestic + international KAAF schedule pages), plus one 2018 attachment linked from a 2015 page.

- Domestic schedule attachments: 396/396 downloaded, 0 failed.
- International schedule attachments: 32/32 downloaded, 0 failed (2007, 2008, 2011, 2013 had none).
- Total private originals stored: 428 files (214 MB) under `data/sources/import/originals/kaaf-backfill-2005-20260708/{year}[-intl]/`.
- File types: 335 xls, 39 pdf, 37 xlsx, 17 hwp.
- Source ledger: 428 rows appended (`SRC-20260708-0004`..`SRC-20260708-0431`), each with URL, sha256, file size path, and privacy note. No raw content, identifiers, or session material committed.
- Year checklist: 2005-2018 moved to `attachments_downloaded_private`.
- Per-manifest evidence: `.ultra/docs/research/kaaf-backfill-2005-20260708/{year}-manifest.json` / `{year}-report.md`.

### Per-year attachment counts

| year | files | year | files |
| --- | --- | --- | --- |
| 2005 | 19 | 2012 | 37 |
| 2006 | 27 | 2013 | 39 |
| 2007 | 29 | 2014 | 38 |
| 2008 | 17 | 2015 | 52 |
| 2009 | 26 | 2016 | 37 |
| 2010 | 37 | 2017 | 37 |
| 2011 | 32 | 2018 | 1 |

### Next steps

1. Build/extend the `.xls` conversion engine (Codex track per WORKFLOW.md) to normalize these originals into `data/results/{year}.json`.
2. As competitions are normalized, add sanitized candidate rows and advance checklist statuses to `candidate_review_needed` → `complete`.
3. Sync the ignored originals folder to the operator team through a private channel (private drive/object storage), not GitHub.
