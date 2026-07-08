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
