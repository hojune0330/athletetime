# Editorial Scheduler Runbook

## Safe deployment order

1. Deploy with `EDITORIAL_SCHEDULER_ENABLED=false` or unset. This is the default.
2. Apply and verify `migration-010-editorial-publish-jobs.sql` while the flag remains off.
3. Configure `EDITORIAL_SCHEDULER_ACTOR_ID` with the UUID of an existing administrator.
4. Check `/health`. The `services.editorialScheduler` object must contain only safe state and error-code fields.
5. Enable one instance first with `EDITORIAL_SCHEDULER_ENABLED=true` and observe job state before enabling more instances.

The in-process interval only wakes the worker. `editorial_publish_jobs` is the source of truth, so queued and retrying work survives restarts.

## Configuration

| Variable | Required | Meaning |
| --- | --- | --- |
| `EDITORIAL_SCHEDULER_ENABLED` | No | Exact value `true` enables the worker. Unset or `false` disables it. Other values fail closed. |
| `EDITORIAL_SCHEDULER_ACTOR_ID` | When enabled | UUID of an existing user whose `is_admin` value is true. |

Unsafe configuration never prevents the HTTP server from starting. It prevents scheduler timers and writes, and exposes one of these readiness codes:

- `EDITORIAL_SCHEDULER_FLAG_INVALID`
- `EDITORIAL_SCHEDULER_ACTOR_MISSING`
- `EDITORIAL_SCHEDULER_ACTOR_INVALID`
- `EDITORIAL_SCHEDULER_ACTOR_NOT_ADMIN`
- `EDITORIAL_SCHEDULER_ACTOR_LOOKUP_FAILED`
- `EDITORIAL_SCHEDULER_DATABASE_UNAVAILABLE`
- `EDITORIAL_SCHEDULER_RUNTIME_ERROR`

Readiness never includes the configured actor UUID or a raw database/publication error.

## Retry and restart behavior

- The initial attempt is attempt 1.
- Attempt 1 failure persists `retrying` with a one-minute delay.
- Attempt 2 failure persists `retrying` with a five-minute delay.
- Attempt 3 failure persists `failed`; the issue remains `scheduled`.
- Re-scheduling the same issue resets its one job to `queued`, attempt count 0, and clears the safe error code.
- A restarted process claims overdue queued/retrying jobs with `FOR UPDATE SKIP LOCKED`.

Job error storage is a fixed safe code, never an exception message, token, SQL text, or request data.

## Incident response

1. Set `EDITORIAL_SCHEDULER_ENABLED=false` and restart instances to stop new claims.
2. Allow shutdown to finish; it waits for the currently claimed transaction.
3. Inspect counts grouped by `status`, `attempt_count`, and `last_error_code`. Do not copy raw application logs into job rows.
4. Correct the underlying problem before an administrator re-schedules a failed issue.
   - Read `GET /api/admin/editorial/publish-jobs/warnings` and use only its safe error code.
   - Retry with `POST /api/admin/editorial/issues/:issueId/retry-publish` using the current
     issue version, a new ISO schedule, and a required reason.
5. Re-enable a single instance and verify completed jobs and one publish audit per issue before scaling out.

## Rollback

Disable the flag before application rollback. Only run `rollbacks/010-editorial-publish-jobs-down.sql` after confirming no rollback target still imports the scheduler modules and no queued/retrying jobs must be preserved. The rollback drops only `editorial_publish_jobs`; it does not alter issues, posts, calendars, or audit events.
