# Task 9 clone-only quarantine/restore rehearsal

Executed: 2026-07-23T12:54:32.2923278Z

Rechecked after public-boundary implementation: 2026-07-23T13:19:41.707Z

Branch: `codex/editorial-ops-verification`

## Disposition

- Only remaining blocked portion: **production-backup clone execution**
- Safe disposable-fixture rehearsal: **PASS**
- Fail-closed prerequisite checks: **PASS**
- Scheduler default-off check: **PASS**
- Quarantine public-surface check on disposable embedded PostgreSQL: **PASS**
- Production writes attempted: **0**
- Scheduler enablement attempted: **0**

All locally runnable Task 9 checks now pass. The production-backup clone portion alone
remains blocked because no clearly approved local production
community database backup artifact, matching cryptographic backup receipt, or production
approval allowlist was available. Repository and local Documents/Downloads filename
searches found no community/post production dump, backup, receipt, or approval artifact.
`DATABASE_URL` and `TEST_DATABASE_URL` were also absent. The unrelated
`server-postgres-backup.js` source file found under Downloads is code, not a backup
artifact, and was not used.

## Backup source and clone identity

- Rehearsal source type: committed disposable Tier B JSON fixture copy, not a production
  backup.
- Source: `.omo/evidence/community-magazine-tier2/quarantine-fixture.json`
- Source SHA-256:
  `044e8a96f6a14f79c0fa27004e42d1c4e079d82441a7c597075f125198235cdc`
- Temporary baseline backup type: byte-for-byte JSON fixture copy.
- Temporary baseline backup SHA-256:
  `044e8a96f6a14f79c0fa27004e42d1c4e079d82441a7c597075f125198235cdc`
- Isolated clone identifier:
  `task9-fixture-clone-20260723T125244Z-4e05f37a`
- Recheck clone identifier:
  `task9-fixture-recheck-20260723T131902Z-488`
- Approved fixture IDs: `[101]`
- Candidate IDs reported by the unchanged clone: `[101]`
- CLI database checksum:
  `07ce90108b9d8206d1135ff86e9262cfc514872dad8cceb4c8f6094ae0569607`
- Candidate report checksum:
  `f9396ad1a9c58844c5ac2ed49cea4ff068ada430f555c11629bd71d64a847649`

The temporary fixture approval named only ID `101`. ID `102`, the ordinary post with
one comment, was neither reported as a candidate nor approved.

## Quarantine and restore roundtrip

The `posts` digest covers identity, author, timestamps, title/content, nested comments,
visibility state, and counters. The other digests independently cover the requested
content, comments, and counter subsets.

| Component | Before | After quarantine | After restore | Result |
|---|---|---|---|---|
| posts | `1beaab688fb0ecbe9a3a07fc5299329de254f5b97946b5cc38301a4febe2c102` | `1beaab688fb0ecbe9a3a07fc5299329de254f5b97946b5cc38301a4febe2c102` | `1beaab688fb0ecbe9a3a07fc5299329de254f5b97946b5cc38301a4febe2c102` | PASS |
| content | `f74b066985eb9f86b66a6aa8298e9704d4f33af553893981ec2671d74573f4aa` | `f74b066985eb9f86b66a6aa8298e9704d4f33af553893981ec2671d74573f4aa` | `f74b066985eb9f86b66a6aa8298e9704d4f33af553893981ec2671d74573f4aa` | PASS |
| comments | `4f4975cd66bfd8c69cf2b2784d3435250f15690914c1a117310946cddc3d5772` | `4f4975cd66bfd8c69cf2b2784d3435250f15690914c1a117310946cddc3d5772` | `4f4975cd66bfd8c69cf2b2784d3435250f15690914c1a117310946cddc3d5772` | PASS |
| counters | `dcafad74ed74d152411939d7db6d282fedf529642d9d65a797990dd98240be4c` | `dcafad74ed74d152411939d7db6d282fedf529642d9d65a797990dd98240be4c` | `dcafad74ed74d152411939d7db6d282fedf529642d9d65a797990dd98240be4c` | PASS |

Quarantine exited `0` and returned committed ID `[101]`. The clone then had exactly one
active quarantine for ID `101`. Restore exited `0` and returned committed ID `[101]`.
The clone then had zero active quarantines and one released quarantine.

## Missing-prerequisite rejection evidence

Each probe ran against the restored disposable clone. The checksum is the CLI repository
checksum over post/content/comment/counter state.

| Probe | Exit | Before checksum | After checksum | Result |
|---|---:|---|---|---|
| Missing actor | 1 | `07ce90108b9d8206d1135ff86e9262cfc514872dad8cceb4c8f6094ae0569607` | `07ce90108b9d8206d1135ff86e9262cfc514872dad8cceb4c8f6094ae0569607` | PASS, valid UUID required |
| Missing approval | 1 | `07ce90108b9d8206d1135ff86e9262cfc514872dad8cceb4c8f6094ae0569607` | `07ce90108b9d8206d1135ff86e9262cfc514872dad8cceb4c8f6094ae0569607` | PASS, approval and receipt required |
| Missing backup receipt | 1 | `07ce90108b9d8206d1135ff86e9262cfc514872dad8cceb4c8f6094ae0569607` | `07ce90108b9d8206d1135ff86e9262cfc514872dad8cceb4c8f6094ae0569607` | PASS, approval and receipt required |

After all three probes, the clone still had zero active quarantines and one released
quarantine. The first disposable setup attempt also failed closed before mutation when
PowerShell emitted a BOM in the temporary approval JSON. That failed clone was removed
before the successful rehearsal.

## Public-surface behavior

The runnable public quarantine boundary now passes on disposable embedded PostgreSQL.
Evidence artifact
`.omo/evidence/community-magazine-tier3/embedded-postgres-tests.txt` has SHA-256
`7cb9a142b4a321341360677c44167ba4ef539fca3d42c28c50b2131419d1155b`
and records 33 passed, 0 failed, 0 skipped.

`EDITORIAL-POST-QUARANTINE-PG-001` starts the real posts API against an isolated
PostgreSQL schema with an active quarantine and verifies:

- The quarantined post is absent from the public list.
- Direct detail, comment creation, vote, and poll requests each return 404.
- The rejected detail request does not increment views.
- The rejected comment request creates no comment row.
- After the quarantine is released, the post returns to the list and detail returns 200.
- A list request racing the quarantine commit waits and then returns no quarantined row.
- Twenty concurrent non-quarantined detail requests complete with the production-sized
  connection pool instead of waiting for a second database connection.

The implementation enforces the list boundary in both the row query and total-count
query. The list holds a global shared quarantine lock; detail, comments, votes, and
polls hold that global lock plus the canonical post lock. Guarded handlers reuse the
same checked-out database client. The refreshed quarantine contract suite also verifies
active, released, never-quarantined, race, and connection-pool saturation behavior.

There is no registered backend `/api/posts/search` route in the current application.
The frontend has an unused `searchPosts` export with no in-tree caller, so there is no
separate runnable community-post search surface to execute. The active public community
list is filtered before any client-side presentation. This is not an additional Task 9
execution blocker.

## Feature flag default-off evidence

`EDITORIAL_SCHEDULER_ENABLED` and `EDITORIAL_SCHEDULER_ACTOR_ID` were absent. A direct
runtime probe using an empty environment returned:

```json
{"readiness":{"enabled":false,"ready":true,"state":"disabled","errorCode":null},"actors":0,"writes":0,"timers":0}
```

`backend/tests/community-editorial-scheduler-lifecycle.test.js` passed 5/5, including the
default-unset flag case with no timer, actor lookup, or write. The scheduler was never
enabled during this rehearsal.

## Verification commands

- Refreshed quarantine contract suite: 21 passed, 0 failed.
- Scheduler lifecycle suite: 5 passed, 0 failed.
- Public-surface plus ordinary post characterization suites: 6 passed, 0 failed.
- Embedded PostgreSQL suite: 33 passed, 0 failed, 0 skipped.
- PostgreSQL public quarantine boundary: list hidden; detail/comment/vote/poll 404;
  views/comments unchanged; list/detail restored after release.
- Fixture quarantine CLI: exit 0, committed `[101]`.
- Fixture restore CLI: exit 0, committed `[101]`.
- Missing actor/approval/backup probes: each exit 1 with unchanged checksum.
- Fixture recheck CLI: quarantine and restore each committed `[101]`; all four component
  checksums remained equal before/quarantine/restore.

## Cleanup receipt

- Removed successful clone directory
  `.omo/evidence/community-magazine-tier3/.tmp-task9-fixture-clone-20260723T125244Z-4e05f37a`.
- Removed its six temporary artifacts: clone DB, baseline backup copy, report JSON,
  report Markdown, approval JSON, and backup receipt JSON.
- Removed failed preflight clone directory
  `.omo/evidence/community-magazine-tier3/.tmp-task9-fixture-clone-20260723T125058Z-781ef529`
  and all six files it contained.
- Removed recheck clone directory
  `.omo/evidence/community-magazine-tier3/.tmp-task9-fixture-recheck-20260723T131902Z-488`
  through its exit trap, including clone DB, baseline backup, report, approval, and
  receipt files.
- Verified all three clone directories absent and zero `.tmp-task9*` artifacts remaining.
- Verified `NODE_ENV`, `COMMUNITY_QUARANTINE_FIXTURE_DB`, `DATABASE_URL`,
  `TEST_DATABASE_URL`, `EDITORIAL_SCHEDULER_ENABLED`, and
  `EDITORIAL_SCHEDULER_ACTOR_ID` absent after cleanup.
- No server, scheduler, PostgreSQL service, background process, or browser was started.
- Verified no listeners on ports 3000, 3001, 5432, or 55432.
- Of the files created by this rehearsal, retained only this evidence file. A concurrent
  `task5-ledger-red.txt` artifact in the same directory was not created or modified by
  this rehearsal. No app code was edited and no commit was created.
