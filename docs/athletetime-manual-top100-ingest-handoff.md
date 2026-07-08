# Manual TOP100 Ingest Handoff

## What Changed

- Batch: `20260708-kaaf-top100`
- Source page: `https://result.kaaf.or.kr/recInfo/topRecList.do`
- Observed endpoint: `searchTopRecList.do`
- Stored files:
  - `data/manual/kaaf-top100/20260708-kaaf-top100-records.jsonl`
  - `data/manual/kaaf-top100/20260708-kaaf-top100-summary.json`
- Candidate rows: 24,630
- Search-indexable rows: 16,885
- Held rows: 7,745
- Covered years: 2005-2026
- Review status after Fable PR #30 P0:
  - `source_verified`: 23,861
  - `needs_external_confirmation`: 769

## Why It Is Separate From `data/results`

This batch is a TOP-record candidate list, not a full competition result sheet.
It should not be represented as if we crawled the whole meet result.
Athlete search may use safe individual rows, but the source remains labeled as `public_top_record_candidate`.

## Safety Rules

- Do not store `PERSON_NO`, birth date, contact, address, or any restricted identifier.
- Domestic KAAF TOP100 rows use `reviewStatus: source_verified`.
- Overseas / foreign-hosted hint rows stay `reviewStatus: needs_external_confirmation` until an operator confirms the external result.
- Exclude relay, road-relay, and comma-separated multi-athlete rows from athlete-name search.
- Preserve source provenance: source URL, endpoint, batch, source row ID, and source type.
- If a signed-in athlete reports a missing record, an operator may verify it through athlete-history lookup and add a manual candidate row with the same source rules.
- Analytics indexing dedups by normalized name + event key + date + record; existing `data/results` rows always win over TOP100 rows.

## Fable Review Checklist

- Confirm TOP100 rows may be shown as "KAAF 공개 기록", not official certification.
- Confirm the held 7,745 rows should stay hidden from athlete search until a team-event schema exists.
- Confirm the 769 overseas / foreign-hosted hint rows should remain `needs_external_confirmation`.
- Confirm UI copy should say "모은 공개 기록" and avoid "공식 기록", "인증", or "전체 랭킹".

## Operator Workflow

1. Receive missing-record request from a signed-in athlete.
2. Search KAAF athlete-history or TOP record pages manually.
3. Save only public record fields: name, team, event, category, mark, wind, date, meet, source URL, and operator review status.
4. Do not save person number or birth date.
5. Run `node tools/import-kaaf-top100-batch.js --input-dir <folder> --batch <YYYYMMDD-kaaf-top100>` if the source is a TOP100 batch.
6. Run `npm run data:promote:kaaf-top100` after updating a TOP100 batch.
7. Run `npm run data:check:kaaf-top100` to confirm review status and summary are idempotent.
8. Run `npm test` before push.
