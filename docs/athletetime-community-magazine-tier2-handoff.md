# Community Magazine Tier B Handoff

Date: 2026-07-22

## What changed for people using the service

- A magazine post still opens at the existing community post address. It now shows a compact source list, one verified related-record link, a discussion prompt, public correction history, and the early recommendation-count notice.
- An ordinary community post remains unchanged when it has no magazine context. A temporary magazine lookup failure keeps the post readable and offers a retry.
- Sharing gives a clear success message. Native sharing is preferred; unsupported or failed sharing falls back to copying the link, with a recovery message when copying is unavailable.
- The administrator can see only safe retrying or failed publication warnings for the selected issue and can re-schedule a failed job with the issue's current version and a written reason.

## What was deliberately not changed

- No production database, post, backup original, migration, public API field, or scheduler state transition was modified.
- The public view never receives review notes, actor identifiers, raw errors, or tokens.
- The scheduler remains disabled by default. Its runbook begins with the flag-off deployment step.

## Verification evidence

- Public detail fixtures and mobile/desktop browser checks: `.omo/evidence/community-magazine-tier2/public-detail-qa.md`
- Repeated fixture-only quarantine dry runs: `.omo/evidence/community-magazine-tier2/quarantine-dry-run-summary.json`
- Fixture stayed unchanged: `.omo/evidence/community-magazine-tier2/quarantine-fixture-integrity.txt`
- Quarantine safety tests: `.omo/evidence/community-magazine-tier2/quarantine-contract-tests.txt`
- Scheduler retry inputs: `.omo/evidence/community-magazine-tier2/scheduler-due-fixtures.json`
- Full regression verification: `npm test` = 383 pass, 0 fail, 27 intentional skips; frontend type-check and production build both pass.

## Known boundary for the next high-reasoning decision

`GET /api/admin/editorial/publish-jobs/warnings` intentionally exposes only `retrying` and `failed` work. The administrator UI does not fabricate queued or completed history. If a full job ledger is needed, the next stage must make a separate backend contract decision about pagination, retention, safe fields, and who may read it.

## Rollback

1. Revert the Tier B application commit.
2. Keep `EDITORIAL_SCHEDULER_ENABLED` unset or `false`; this change never enables it.
3. Do not run a database rollback for Tier B because it contains no migration or production write.
4. The quarantine fixture is local review evidence only. It is not an approval list or a production backup.

## Fable review checklist

- Confirm the existing post URL stays the only public detail route.
- Confirm ordinary post fallback, source-less magazine post, temporary lookup error, and 390px long-source view remain readable.
- Confirm warning UI exposes no raw error, actor UUID, or token.
- Decide whether the separate full job-history endpoint is worth a Step 3 contract, rather than expanding the warning endpoint casually.
