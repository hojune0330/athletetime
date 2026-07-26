# AthleteTime Editorial Release Gate

> Status: required operator gate for the editorial magazine and news-discovery rollout.
>
> Purpose: keep code merge, database change, and public release as three separate decisions.

This document applies to the editorial migration sequence `006` through `013`.
It does not authorize automatic news collection, draft creation, approval, or publication.

## 1. Roles and Evidence

| Role | Responsibility | Evidence to record |
| --- | --- | --- |
| Release owner | Approves every gate and controls hosting secrets | production commit, start/end time, go/no-go decision |
| Operator | Runs backup, restore, staging, and smoke checks | aggregate result only; never secrets or database URLs |
| Reviewer | Checks the PR chain and migration evidence | required CI links and review result |

Do not record secret values, connection strings, user records, raw backup locations, or provider credentials in a pull request or issue.

## 2. Code Merge Gate

The editorial work is a stacked series. Its safe order is `#52 -> #53 -> #54 -> #55`.

1. Hold automatic production deployment before the first merge.
2. Confirm the current `main` commit and preserve it as the traffic rollback commit.
3. Merge `#52` into `main` using **Create a merge commit**. Do not squash or rebase-merge it.
4. Retarget `#53` to `main`, mark it ready for review, rerun its required checks, and merge it with a merge commit.
5. Repeat the retarget, review, CI, and merge-commit process for `#54`, then `#55`.
6. Keep every feature branch until the production observation window ends.

No-Go:

- A child PR still targets a feature branch or is still a draft.
- A required test is missing, failing, or lacks the stated PostgreSQL migration evidence.
- A merge would use squash or rebase while downstream PRs still depend on the parent commit.
- The dependency-security prerequisite has not been reviewed separately.

## 3. Backup and Migration Gate

The managed migration runner applies every tracked migration starting at `004`; it cannot be limited to a selected subset. Confirm the migration ledger before starting a service that connects to production.

Before staging or production release:

1. Create an encrypted, access-controlled PostgreSQL backup.
2. Restore that backup into an isolated database and record a successful restore result.
3. Check the migration ledger for `004` onward, including checksum consistency. Stop on unknown rows or a mismatch.
4. Record the intended code commit and the already-known traffic rollback commit.
5. Keep the legacy data collector disabled. Do not use a release command that can trigger a frozen collector.

No-Go:

- No successful restore drill from a fresh backup.
- A migration checksum mismatch, uncertain ledger state, or staging startup failure.
- A plan that relies on running down-SQL before code/traffic rollback has been assessed.

## 4. Environment Gate

Review environment-variable names in the hosting dashboard without copying their values into notes.

Required core settings include `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `ZERO_RESULT_SEARCH_SECRET`, `DATA_RIGHTS_ENCRYPTION_KEY`, and `DATA_RIGHTS_LEGACY_TICKET_PEPPER`.

For this release, keep both flags disabled or unset:

```text
NAVER_NEWS_COLLECTOR_ENABLED=false
EDITORIAL_SCHEDULER_ENABLED=false
```

If NAVER credentials are prepared for a future manual pilot, keep them only in Render's server-side secret settings. They must never be added to Netlify, a Vite variable, a browser bundle, logs, PR text, or screenshots.

## 5. Staging Gate

1. Restore the protected backup to staging.
2. Deploy the Render backend first with the collector and scheduler disabled.
3. Confirm `/health` is healthy, the database is connected, and data-rights readiness is available.
4. Confirm the editor/admin route rejects non-admin access and reports the collector as disabled.
5. Exercise existing public surfaces: records, community, marketplace, data request, authentication, and chat.
6. Verify a WebSocket handshake and a same-room message exchange from two clients.
7. Confirm the disabled discovery action makes zero provider calls.

## 6. Production Gate

Only proceed when every prior gate is recorded as pass.

1. Deploy Render first, still with the collector and scheduler disabled.
2. Verify direct Render health, database readiness, and the established public API surface.
3. Deploy Netlify second.
4. From the production Netlify URL, smoke-test `/`, `/records`, `/community`, `/chat`, `/marketplace`, `/data-request`, and `/admin/operator-guide`.
5. As an authenticated administrator, verify the magazine screen is available and the collector is disabled.
6. Verify the production WebSocket handshake and a room message exchange.
7. Observe HTTP errors, authentication failures, 404 recovery, WebSocket failures, and database errors during the launch window.

The NAVER collector remains disabled during the launch window. A manual pilot is a later, separately approved operation; automatic collection, drafting, approval, and publication remain out of scope.

## 7. Rollback Rule

First response to a release problem:

1. Keep the collector and scheduler disabled.
2. Stop or protect new writes if data divergence is suspected.
3. Restore traffic to the recorded prior Render and Netlify releases.
4. Preserve an export of new writes before any database restoration decision.
5. Use migration down-SQL only after the matching code has been rolled back and after a release owner approves the data-loss impact.

Down-SQL is not a harmless undo button: it can remove discovery, event, scheduler, or editorial data. A future release-specific rollback rehearsal must define how to preserve or reconcile writes before any destructive database action.

## 8. Release Record Template

Record this in a private operator log, not in public source control:

```text
Release commit:
Traffic rollback commit:
Backup created at (KST):
Isolated restore result: PASS / FAIL
Migration ledger check: PASS / FAIL
Staging smoke: PASS / FAIL
Production backend smoke: PASS / FAIL
Production frontend smoke: PASS / FAIL
WebSocket smoke: PASS / FAIL
Collector state: DISABLED
Scheduler state: DISABLED
Release owner decision: GO / NO-GO
```
