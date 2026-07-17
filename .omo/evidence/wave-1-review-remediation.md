# Wave 1 review remediation

## Blocking findings closed

- Workspace path traversal: canonical real paths now reject symlink and junction escapes for reports, approvals, receipts, backup artifacts, and fixture databases.
- Human accountability: every editorial write requires a valid actor UUID; database transition events require a new action UUID and are emitted by an `AFTER` trigger.
- Publish policy bypass: `review_ready` now requires an HTTPS source and evaluates title, body, summary, why-now, discussion question, age group, and source metadata.
- Correction history: entering `corrected` invalidates the prior policy check; only `reviseIssue` can append a revision, re-run policy, and enable the existing public post ID to be republished.
- Stale quarantine state: checksums now include `deleted_at` and `is_blinded`.
- Candidate coverage: QA/test/fixture, Korean `테스트` substrings, blank posts, and placeholder titles are report candidates; no automatic mutation was added.

## Verification

- Real PostgreSQL 18.4: 12 passed, 0 failed, 0 skipped.
- Root suite: 336 passed, 0 failed, 14 skipped, 350 total.
- Frontend TypeScript: passed.
- Frontend production build: passed.
- New dependency count: zero.
- Five-lane post-implementation review: all final verdicts PASS.

The repository still has pre-existing production dependency advisories. This Wave adds no package or lockfile dependency change.
