# Manual TOP100 Ingest Handoff

## What Changed

- Batch: `20260708-kaaf-top100`
- Source page: `https://result.kaaf.or.kr/recInfo/topRecList.do`
- Observed endpoint: `searchTopRecList.do`
- Stored file: `data/manual/kaaf-top100/20260708-kaaf-top100.json`
- Candidate rows: 24,630
- Search-indexable rows: 16,885
- Held rows: 7,745
- Covered years: 2005-2026

## Why It Is Separate From `data/results`

This batch is a TOP-record candidate list, not a full competition result sheet.
It should not be represented as if we crawled the whole meet result.
Athlete search may use safe individual rows, but the source remains labeled as `public_top_record_candidate`.

## Safety Rules

- Do not store `PERSON_NO`, birth date, contact, address, or any restricted identifier.
- Keep `reviewStatus: needs_external_confirmation` until Fable or an operator approves promotion.
- Exclude relay, road-relay, and comma-separated multi-athlete rows from athlete-name search.
- Preserve source provenance: source URL, endpoint, batch, source row ID, and source type.
- If a signed-in athlete reports a missing record, an operator may verify it through athlete-history lookup and add a manual candidate row with the same source rules.

## Fable Review Checklist

- Confirm TOP100 rows may be shown as "candidate / collected public top-record data", not official certification.
- Confirm the held 7,745 rows should stay hidden from athlete search until a team-event schema exists.
- Confirm whether specific high-value records can be promoted from `needs_external_confirmation` to an approved review status.
- Confirm UI copy should say "모은 공개 기록" and avoid "공식 기록", "인증", or "전체 랭킹".

## Operator Workflow

1. Receive missing-record request from a signed-in athlete.
2. Search KAAF athlete-history or TOP record pages manually.
3. Save only public record fields: name, team, event, category, mark, wind, date, meet, source URL, and operator review status.
4. Do not save person number or birth date.
5. Run `node tools/import-kaaf-top100-batch.js --input-dir <folder> --batch <YYYYMMDD-kaaf-top100>` if the source is a TOP100 batch.
6. Run `npm test` before push.
