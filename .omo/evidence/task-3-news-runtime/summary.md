# Task 3 verification summary

Date: 2026-07-26

## Delivered

- Separate PostgreSQL run, discovery, and audit-event persistence.
- One advisory-locked run per KST date and query-profile version.
- Idempotent completed reruns and deterministic URL-hash upserts.
- Administrator-only manual run, run history, filtered discovery list, start-review, and dismiss routes.
- Exact request parsing, CSRF enforcement, `Cache-Control: no-store`, and response allowlists.
- Safe failure codes for missing credentials, rejected credentials, local quota, provider quota, and mixed failures.
- 90-day purge for dismissed/expired discoveries and 13-month completed/failed run retention.
- No public discovery route, article body, API description, raw provider response, credentials, or arbitrary query persistence.

## Verification

- Focused news suite: 45 passed, 0 failed, 4 PostgreSQL-only skipped locally.
- Community/editorial suite: 175 passed, 0 failed, 32 PostgreSQL-only skipped locally.
- Full repository suite: 434 passed, 0 failed, 38 environment-only skipped.
- Frontend type-check: passed.
- Frontend production build: passed.
- `git diff --check`: passed.
- Real HTTP QA:
  - unauthenticated list: `401`
  - administrator list: `200`
  - list cache policy: `no-store`
  - CSRF-authenticated manual run: `200`
  - arbitrary run-body injection: `400`
- Temporary QA server closed in-process; temporary QA script deleted.

## CI gate

The local machine has no PostgreSQL runtime. PR #55 started PostgreSQL 16 and passed both required checks after fixing the lock lifetime:

- `migration-contract`: passed in 36 seconds.
- `postgres-contract`: passed in 1 minute 44 seconds.
- Two-worker execution made one provider call and one run.
- Migration apply/rollback/reapply, state guards, retention, and audit checks passed without skips.

## Residual release blockers

- Root dependency audit remains a separate P0 security PR: 12 advisories (5 high, 7 moderate).
- Do not enable scheduled collection before the 14-day manual pilot and explicit owner `GO-DAILY`.
- Merge the editorial stack in order before production migrations and deployment.
