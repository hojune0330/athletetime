# AthleteTime Production Mainline Policy

> Status: active from 2026-07-07.
> Scope: `hojune0330/athletetime`, the production repository for the live AthleteTime service.

## 1. Current Authority

`hojune0330/athletetime` is now the single production repository.

- Live frontend: Netlify `athlete-time`.
- Live backend: Render `athletetime-backend`.
- Production branch: `main`.
- Development rule: small branch, PR, verify, merge to `main`.
- `hojune0330/2026-first-item` is a historical/experimental source. It is not the place to start new production work.

## 2. Worktree Safety Rule

Do not mix unrelated work into a production rollout branch.

The local canonical worktree currently has auth/security changes in progress on `codex/auth-security-verification`. Those files must not be reverted, amended, restaged, or silently folded into a migration commit.

Safe pattern:

1. Fetch `origin/main`.
2. Create a clean branch or `git worktree` from `origin/main`.
3. Port one bounded slice.
4. Stage explicit files only. Never use `git add .`.
5. Run the relevant tests and record evidence.
6. Push the branch and open/update a PR.

If a branch already contains unrelated dirty files, stop and either use a clean worktree or ask the owner before touching those files.

## 3. Data Boundary

Raw source files and private originals are not production web assets.

Allowed in git:

- Source catalogs: URL, filename, content hash, extension, discovery year, extraction status.
- Public-safe normalized rows already passing quality filters.
- Tests and scripts that do not require bypassing access controls.
- Evidence summaries that do not include private raw file contents.

Not allowed in git or public bundles:

- Raw XLS, XLSX, PDF, HWP originals from `data/sources/import/originals/`.
- Full public dump endpoints for all athlete rows.
- Exact failed-search raw queries unless they satisfy the approved privacy threshold.
- Internal secrets, API keys, cookies, person numbers, birthdates, or source-side identifiers.

The service should expose only the amount of data needed for user actions, through paginated and rate-limited APIs.

## 4. Product Claim Boundary

AthleteTime must be framed as a public-record index and self-check service.

Allowed positioning:

- "이름으로 공개 경기 결과를 찾아보는 곳"
- "AthleteTime이 모은 공개 기록 기준"
- "같은 이름의 다른 선수일 수 있어요"
- "출처와 정정/숨김 요청 절차를 함께 제공"

Forbidden positioning:

- Official KAAF/KSOC proof or certificate replacement.
- Complete national database.
- Official ranking, verified ranking, AI-verified result, prediction, or athlete evaluation.
- "2000년부터 오늘까지 모든 기록 검색 가능" until row-level coverage evidence proves it.

## 5. Migration Gate

No broad porting from `2026-first-item` may start until the target slice is classified in `docs/athletetime-2026-first-item-port-map.md`.

For every slice, record:

- Source PR/comment/commit evidence.
- Whether it is already in `athletetime/main`.
- Whether it touches user data, public claims, auth, security, or raw source files.
- Required tests and manual QA.
- Rollback path.

If the slice changes live behavior, it needs a PR and verification. If it changes only docs/evidence, `git diff --check` plus link/claim scans are sufficient unless the document creates an operational commitment.
