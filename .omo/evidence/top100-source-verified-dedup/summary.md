# TOP100 Source Verification + Dedup Evidence

Date: 2026-07-08
Branch: `codex/top100-source-verified-dedup`

## Scope

- Implemented Fable PR #30 P0 work order tasks 1 and 2.
- Promoted domestic KAAF TOP100 rows from `needs_external_confirmation` to `source_verified`.
- Kept overseas / foreign-hosted hint rows at `needs_external_confirmation`.
- Added analytics index dedup so existing `data/results` rows win over TOP100 candidates, and TOP100 internal duplicates are skipped.

## Counts

- TOP100 candidate rows: 24,630
- Indexable candidate rows: 16,885
- Held candidate rows: 7,745
- `source_verified`: 23,861
- `needs_external_confirmation`: 769
- Manual TOP100 index appended: 9,564
- Manual TOP100 duplicate skips: 7,321

## Evidence Files

- `data-check-kaaf-top100.txt`: idempotent `--check` run.
- `manual-top-records-test.txt`: focused TOP100 contract tests.
- `npm-test.txt`: full backend contract suite, 208/208 pass.
- `frontend-type-check.txt`: frontend TypeScript pass.
- `frontend-build.txt`: production build pass.
- `http-health.txt`: local server health.
- `http-search-kim-kukyoung.json`: local search API smoke.
- `http-season-2017-100m.json`: local season table smoke.
- `git-diff-check.txt`: whitespace diff check.

## User-Visible Behavior

- 김국영 2017 코리아오픈 100m 10.07 appears once, not twice.
- The same row now carries `source.reviewStatus: "source_verified"`.
- User-facing note uses `KAAF 공개 기록`, not raw internal status text.

## Remaining Work

- Fable P1 legacy normalization remains separate by design: normalize private source-vault XLS/XLSX files into `data/results/2005..2017.json` in year-batched PRs after this P0 dedup lands.
