# Community post quarantine runbook

This tool reports possible QA/test community posts and records only human-approved IDs in `post_quarantines`. It never deletes posts, rewrites post or comment data, or mutates from a regular-expression match. Public-route filtering is intentionally outside this task.

## Safety contract

- With no mutation flags, the command is always a report-only dry run.
- `--write` requires an explicit approval file, a cryptographically verified backup receipt, and `--actor` set to the UUID of the user performing the operation. Environment usernames and operator defaults are not accepted.
- Approved IDs are locked and checked together in one database transaction. A missing ID, stale report state, duplicate ID, or unsupported commented post rolls back the entire transaction.
- A post with any comment row requires a separate human comment-approval file. A stale `comments_count=0` does not bypass this check.
- Quarantine inserts an active `post_quarantines` record. It does not update `posts`, `comments`, or counters.
- Restore changes the active quarantine to `status='released'` and records `released_at`/`released_by`. A repeated restore fails instead of claiming success.
- Every CLI path must remain below the repository root. The command times out after 15 seconds by default and rolls back when interrupted before commit.

Task 2's migration must be applied first. The tool writes its exact contract: UUID `id`, `post_id`, `status`, `reason_code`, `reason_detail`, `quarantined_by`, `quarantined_at`, `released_by`, and `released_at`. Post/comment state remains in the original tables and is protected by the report checksum; quarantine never copies then rewrites that state.

## 1. Produce a candidate report

```powershell
node scripts/community-post-quarantine.js --report .omo/evidence/task-3-candidates.json
```

This writes both `.omo/evidence/task-3-candidates.json` and `.omo/evidence/task-3-candidates.md`. Each candidate contains post ID, seed ID, author, creation time, title, a 160-character body summary, views, comments, and a state checksum. The JSON also contains `databaseChecksum` and `reportChecksum`. Preserve the JSON unchanged for approval.

Candidate matching is deliberately limited to reporting. A match is not authorization.

## 2. Create and verify a backup receipt

Create a logical backup before every write operation. Store the artifact inside the repository evidence directory.

```powershell
pg_dump --format=custom --file .omo/evidence/community-posts-before.dump $env:DATABASE_URL
$sha = (Get-FileHash .omo/evidence/community-posts-before.dump -Algorithm SHA256).Hash.ToLower()
$verifiedAt = [DateTime]::UtcNow.ToString('o')
```

Create `.omo/evidence/community-posts-backup-receipt.json`:

```json
{
  "artifactPath": ".omo/evidence/community-posts-before.dump",
  "sha256": "64-character-lowercase-sha256",
  "verifiedAt": "2026-07-17T10:00:00.000Z",
  "databaseChecksum": "databaseChecksum-from-the-candidate-report"
}
```

The tool hashes the artifact itself and compares `databaseChecksum` with current post/comment/counter state before opening the mutation transaction. A copied, edited, missing, or stale receipt is rejected.

## 3. Record explicit approval

Create an approval file, for example `.omo/evidence/community-posts-approved.json`:

```json
{
  "reportFile": ".omo/evidence/task-3-candidates.json",
  "reportChecksum": "reportChecksum-from-that-report",
  "approvedPostIds": [101, 104],
  "reason": "QA fixtures approved in release review 2026-07-17"
}
```

IDs must be unique positive integers and must exist in the referenced report. Do not regenerate or edit the report after approval; run a fresh report and approval cycle instead.

For a commented post, create a separate approval such as `.omo/evidence/community-posts-comment-approved.json`:

```json
{
  "approvedPostIds": [104],
  "actor": "release-manager@example.com",
  "approvedAt": "2026-07-17T10:05:00.000Z",
  "reason": "Comment reviewed and explicitly approved for reversible quarantine"
}
```

The normal approval cannot substitute for this separate decision record.

## 4. Quarantine approved IDs

`--actor` is mandatory for every `--write` quarantine or restore and must be a valid user UUID. The command rejects missing, whitespace-only, malformed, or appended actor values before connecting to the database.

```powershell
node scripts/community-post-quarantine.js --approved .omo/evidence/community-posts-approved.json --backup-receipt .omo/evidence/community-posts-backup-receipt.json --actor 00000000-0000-4000-8000-000000000001 --write
```

Add `--comment-approval .omo/evidence/community-posts-comment-approved.json` only when the separately documented exception applies. Success is printed only after commit and lists exactly the committed post IDs. Any nonzero exit means nothing was committed.

## 5. Restore

Generate a fresh report and backup receipt if post state changed after quarantine, then create an approval file for the IDs to restore. Run:

```powershell
node scripts/community-post-quarantine.js --restore --approved .omo/evidence/community-posts-restore-approved.json --backup-receipt .omo/evidence/community-posts-restore-backup-receipt.json --actor 00000000-0000-4000-8000-000000000001 --write
```

After restore, compare the report/database checksum and inspect post content, comments, views, likes/dislikes, reports, and comment counters. Because quarantine never modifies those rows, the before/after content checksum must be identical.

## Failure and interruption handling

- Invalid/malformed JSON, path traversal, duplicate IDs, missing IDs, stale post state, stale backup state, or an unapproved commented post exits nonzero before commit.
- `Ctrl+C` or the timeout aborts before commit and the PostgreSQL repository issues `ROLLBACK`.
- Override the timeout only for an investigated slow database, for example `--timeout-ms 30000`. A timeout is a failure, never success.
- Re-run report mode freely. Repeating quarantine depends on Task 2's active-quarantine uniqueness constraint and must fail rather than create two active records. Repeating restore fails when no active quarantine remains.
- A dirty Git worktree does not alter database decisions; retain `git status --short` with operational evidence.

## Disposable fixture QA

The JSON fixture repository is available only with `NODE_ENV=test`. It exists for CLI rehearsal and is never selected in production.

```powershell
$env:NODE_ENV = 'test'
$env:COMMUNITY_QUARANTINE_FIXTURE_DB = '.omo/evidence/task-3-fixture-db.json'
node scripts/community-post-quarantine.js --report .omo/evidence/task-3-candidates.json
```

Unset both variables after QA:

```powershell
Remove-Item Env:NODE_ENV
Remove-Item Env:COMMUNITY_QUARANTINE_FIXTURE_DB
```
