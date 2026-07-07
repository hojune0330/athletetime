# Data Candidate Workspace

This folder is for public-safe, reviewable data candidates only.

Raw source files, cookies, HTML dumps, full athlete-history pages, `person_no`, birth data, and source-side identifiers must not be stored here.

## Folder Layout

```text
docs/data-candidates/
  README.md
  missing-result-candidate.schema.json
  batches/
    YYYYMMDD-short-topic/
      candidate-records.jsonl
      source-ledger.jsonl
      review-report.md
```

## What Goes Where

| File | Purpose | Git? |
| --- | --- | --- |
| `candidate-records.jsonl` | Sanitized normalized candidate rows | Yes |
| `source-ledger.jsonl` | URL/file/hash/provenance records | Yes |
| `review-report.md` | Human-readable operator report | Yes |
| Raw PDF/XLS/XLSX | Original source files | No. Store under `data/sources/import/originals/` |
| Raw athlete-history HTML | Full KAAF popup/list HTML | Never |
| Temporary copied history line | Local scratch only | Never |

## Candidate Row Contract

Each `candidate-records.jsonl` line is one JSON object. Required fields:

- `candidateId`
- `status`: `needs_external_confirmation`, `confirmed`, `held`, or `discarded`
- `discoveryMethod`
- `discoveredAt`
- `operator`
- `competitionName`
- `competitionAliases`
- `date`
- `event`
- `round`
- `place`
- `record`
- `athleteDisplayName`
- `teamDisplayName`
- `category`
- `sourceRefs`
- `restrictedFieldsDropped`
- `notes`

Allowed `discoveryMethod` values:

- `kaaf_schedule_attachment`
- `kaaf_top_record_manual`
- `kaaf_athlete_history_manual`
- `self_submitted_material`
- `external_official_result`

## Source Ledger Contract

Each `source-ledger.jsonl` line is one JSON object. Required fields:

- `sourceId`
- `type`: `kaaf_schedule_page`, `kaaf_result_attachment`, `kaaf_top_record_manual_check`, `kaaf_athlete_history_manual_check`, `world_athletics_result`, `jaaf_result`, `taiwan_federation_result`, `host_official_result`, or `submitted_proof`
- `url`
- `title`
- `checkedAt`
- `operator`
- `httpStatus`
- `contentHash`
- `storedOriginalPath`
- `privacyNotes`

For manual checks where no raw file is saved, use:

```json
{
  "storedOriginalPath": null,
  "contentHash": null,
  "privacyNotes": "manual check only; raw HTML and restricted identifiers not stored"
}
```

## Operator Steps

1. Create a new batch folder: `docs/data-candidates/batches/YYYYMMDD-topic/`.
2. Fill `source-ledger.jsonl` first.
3. Fill `candidate-records.jsonl` only with sanitized facts.
4. Write `review-report.md` using the template below.
5. Run `git diff --check`.
6. Ask another reviewer to verify source links and forbidden-field absence.

## Review Report Template

```md
# Missing Result Candidate Batch

Date:
Operator:
Batch:

## Scope

## Sources Checked

## Candidates

## Restricted Fields Dropped

## External Confirmation

## Decisions

## Reviewer Notes
```
