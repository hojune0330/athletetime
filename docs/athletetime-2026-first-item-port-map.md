# 2026-first-item to athletetime Port Map

> Status: frozen migration inventory for the first production-mainline wave.
> Evidence sources: `athletetime` PR #17, `2026-first-item` PR #5 comments, local `origin/main` at `9a1f4e1`.

## 1. Current PR State

| Source | State | Decision |
|---|---:|---|
| `hojune0330/athletetime` PR #17 | merged into `main` as `9a1f4e1` | Treat as current production baseline. Do not re-port the same UX slice. |
| `hojune0330/2026-first-item` PR #5 | open, 26 commits, 123 changed files | Treat as evidence/history. Cherry-pick only classified slices. |
| `hojune0330/athletetime` repository visibility | public at inspection time | Owner should switch to private before adding more source catalogs or operational detail. |
| `hojune0330/2026-first-item` repository visibility | public at inspection time | Owner should switch to private or archive once production migration is settled. |

## 2. Already In Production Baseline

These should not be re-ported unless a targeted regression is found:

- `WORKFLOW.md` and README pointer to production workflow.
- Records progressive UX from PR #17: disclosure sections, my-athlete shortcut, same-name combined viewing with non-merge notice.
- Training Log Lite and TRAINORACLE teaser.
- Migration snapshot chain through PR #17 on `athletetime/main`.
- P1 launch surface work from the migration branch: no broad feature nav resurrection without tests.

Verification source:

- `athletetime` PR #17 changed files: `README.md`, `WORKFLOW.md`, records insight components, `TrainingLogLite`, `progressive-ux.test.js`, and `package.json`.

## 3. Port Now, But As Small PRs

These are safe next slices because they strengthen production correctness or prevent overclaiming:

1. **Production policy and port inventory**
   - This document and `docs/athletetime-production-mainline-policy.md`.
   - No runtime behavior change.

2. **Auth/security dirty branch reconciliation**
   - Source: local `codex/auth-security-verification` dirty worktree.
   - Action: inspect in a separate PR, do not silently merge into migration docs.
   - Required: auth route tests, migration tests, privacy scans, deployment validation.

3. **Legacy result source catalog, not row exposure**
   - Source: `2026-first-item` PR #5 comment `4895140047`.
   - Safe claim: "2005년까지 거슬러 공식 공개 결과 파일 수집·정리 시작".
   - Unsafe claim: "2000년부터 오늘까지 모든 선수 행 검색 가능".
   - Only catalog metadata belongs in git. Raw originals stay ignored/private.

4. **Quality-hold behavior preservation**
   - Source: relay/combined event comments in PR #5.
   - Action: preserve the public adapter rule that polluted relay/combined rows show "기록 확인 중이에요" instead of fake reconstructed rows.

## 4. Port Later

These need more design, data, or security work before production:

- `.xlsx` and text-PDF staging extraction for legacy 2005-2017 files.
- `.xls` 329-file conversion lane.
- `.hwp` 13-file conversion lane.
- Postgres/private object storage for source catalogs and normalized rows.
- Admin-only zero-result analytics dashboard.
- Shared URL redirect map expansion after real traffic URL samples are available.
- Community/marketplace legacy data migration from production PostgreSQL.
- Same-origin WebSocket consolidation and `VITE_WS_URL` cutover.

## 5. Internal Only

Keep these out of public UI and public data endpoints:

- Raw source originals under `data/sources/import/originals/`.
- `.omo/evidence` files containing operational diagnostics or source inventories.
- Any failed-query detail below the approved k-anonymity threshold.
- Source-side identifiers, person numbers, birthdates, cookies, or private operator notes.

## 6. Do Not Port

These are explicit no-go items:

- Any collector that bypasses blocked paths, robots restrictions, login walls, or anti-bot controls.
- `result.kaaf.or.kr` legacy blocked-path scraping as a new collection route.
- Fake example athletes, sample screens with seeded athletes, or fabricated records.
- Official/complete/ranking/certificate wording.
- Whole-population `person_no` based cleanup.
- Full-table CSV/JSON download endpoints for public users.

## 7. Next Reviewer Questions

Ask Fable/Opus to review these before the next data-facing PR:

1. Does the legacy source catalog wording avoid implying row-level normalization?
2. Are 2000-2004 gaps described as "current public year-page candidates not found" rather than failure?
3. Is the next extraction priority correct: `.xlsx` 37 and text PDFs before `.xls`/`.hwp` converters?
4. Does any UI copy now imply official proof, certification, complete coverage, or rankings?
