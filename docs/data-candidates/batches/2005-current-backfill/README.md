# 2005-Current Backfill Batch

Created: 2026-07-08

## Purpose

This batch is the shared workspace for filling missing AthleteTime competition results from 2005 through the current service date.

The goal is not to expose every raw source file on GitHub. The goal is to make every operator and agent see:

- what years were checked,
- what sources were checked,
- where private originals are stored,
- which result candidates were created,
- which candidates are confirmed, held, or discarded,
- what still needs review.

## GitHub Visibility Rule

GitHub may contain:

- this README,
- source ledgers,
- year checklist,
- sanitized candidate records,
- review reports,
- hashes and filenames,
- public source URLs.

GitHub must not contain:

- raw PDF/XLS/XLSX/HWP originals,
- raw TOP-record JSON responses,
- raw athlete-history HTML,
- source-side athlete identifier values,
- source-side TOP-record row identifier values,
- birth data copied from athlete-history pages,
- cookies,
- session IDs,
- private credentials.

## Private Original Storage

Store raw originals here on the operator machine or private synced storage:

```text
data/sources/import/originals/kaaf-backfill-2005-20260708/
  2005/
  2006/
  ...
  2026/
```

This path is ignored by Git via `.gitignore`.

If multiple people or agents need access, sync this ignored folder through a private channel such as:

- private cloud drive folder,
- private object storage,
- private server volume,
- encrypted archive shared directly with the operator team.

Do not use the public GitHub repository for these originals.

## Shared GitHub Files In This Batch

```text
docs/data-candidates/batches/2005-current-backfill/
  README.md
  year-checklist.csv
  source-ledger.jsonl
  candidate-records.jsonl
  review-report.md
```

## Collection Order

For each year from 2005 through the current year:

1. Check KAAF domestic schedule:
   `https://www.kaaf.or.kr/ver3/info/internal.asp?currentYear=YYYY`
2. Check KAAF international schedule:
   `https://www.kaaf.or.kr/ver3/info/international.asp?currentYear=YYYY`
3. For each competition row, open the detail page if present.
4. If result attachments exist, download originals to the private ignored folder.
5. Record each original in `source-ledger.jsonl`.
6. If a competition or athlete result appears missing, check KAAF TOP records manually.
7. If TOP records show a candidate, check athlete-history manually.
8. Strip restricted identifiers.
9. Add only sanitized records to `candidate-records.jsonl`.
10. Confirm overseas or missing-source records against external official sources.
11. Update `year-checklist.csv` and `review-report.md`.

## Required Year Checklist Status

Use these status values in `year-checklist.csv`:

- `not_started`
- `schedule_checked`
- `attachments_downloaded_private`
- `source_ledger_done`
- `candidate_review_needed`
- `candidate_review_done`
- `complete`
- `blocked`

## Year Checklist Counts

- `candidate_count`: number of candidate rows whose `date` falls in that year.
- `source_ledger_count`: number of unique `sourceRefs` used by those candidate rows.
- If a year only has private originals downloaded but no sanitized candidate yet, keep both counts at `0` until candidate rows are added.
- The validator rejects stale counts, so update this row whenever a candidate is added, held, discarded, or moved.

## Required Candidate Status

Use these status values in `candidate-records.jsonl`:

- `needs_external_confirmation`
- `confirmed`
- `held`
- `discarded`

## Minimum Per-Year Definition Of Done

A year is not done until:

- domestic schedule checked,
- international schedule checked,
- all found result attachments are either downloaded privately or marked unavailable,
- every source has a ledger row,
- every candidate has a status,
- restricted identifiers are absent from committed files,
- reviewer notes are added to `review-report.md`,
- the batch validator passes after updates.

## Validation Command

Run this before handing the batch to another worker or opening a PR:

```sh
node tools/validate-data-candidates.js \
  --batch docs/data-candidates/batches/2005-current-backfill \
  --start-year 2005 \
  --current-year 2026 \
  --json
```

The command is a safety gate for shared GitHub files only. It does not read private originals. It blocks malformed rows, missing source references, duplicate IDs, raw HTML/session material, and restricted identifier keys.

## Operator Command

```text
Work on the 2005-current backfill batch.
Pick the next year in year-checklist.csv whose status is not complete.
Check KAAF domestic and international schedule pages for that year.
Download only official result attachments to data/sources/import/originals/kaaf-backfill-2005-20260708/{year}/, which is not committed.
Write source metadata to source-ledger.jsonl.
If a missing record is found through TOP records or athlete-history lookup, write only a sanitized candidate to candidate-records.jsonl.
Never commit raw originals, raw athlete-history HTML, source-side identifier values, birth data, cookies, or session IDs.
Run node tools/validate-data-candidates.js --batch docs/data-candidates/batches/2005-current-backfill --start-year 2005 --current-year 2026 --json before handing off.
```
