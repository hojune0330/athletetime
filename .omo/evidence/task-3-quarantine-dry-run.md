# Task 3 quarantine dry-run evidence

- Date: 2026-07-17 UTC
- Repository: disposable JSON fixture, enabled only with `NODE_ENV=test`
- Fixture composition: 5 QA/test candidates and 5 normal community posts
- Exact command: `node scripts/community-post-quarantine.js --report .omo/evidence/task-3-candidates.json`
- Exit: `0`
- CLI result: `{"mode":"dry-run","candidates":5,"databaseChecksum":"11cfb195fdbcf89d4ed53b421f874dcbfdb52a0fa21b778a90315cbda9de96a5"}`
- JSON report: `.omo/evidence/task-3-candidates.json`
- Markdown report: `.omo/evidence/task-3-candidates.md`
- Candidate fields observed: post ID, seed ID, author, created time, title, body summary, views, comments, state checksum
- Before database checksum: `11cfb195fdbcf89d4ed53b421f874dcbfdb52a0fa21b778a90315cbda9de96a5`
- After database checksum: `11cfb195fdbcf89d4ed53b421f874dcbfdb52a0fa21b778a90315cbda9de96a5`
- Active quarantine rows after report: `0`

Result: PASS. JSON and Markdown candidates were produced and report mode made no database mutation.

## Quarantine/restore rehearsal

- Quarantine CLI result: `{"mode":"quarantine","postIds":[1],"committed":true}`
- Restore CLI result: `{"mode":"restore","postIds":[1],"committed":true}`
- Repeated restore exit: `1`, `Post 1 has no active quarantine`
- Roundtrip database checksum: `11cfb195fdbcf89d4ed53b421f874dcbfdb52a0fa21b778a90315cbda9de96a5`
- Quarantine history rows: `1`; active: `0`; released/restored: `1`

Result: PASS. Post content, comments, and counters were unchanged across the reversible quarantine roundtrip, and the repeated restore did not claim success.

## Adversarial QA

| Class | Probe | Observable |
|---|---|---|
| Malformed approval JSON | Truncated approval object through the real CLI | Exit `1`; parser named the invalid file; no mutation |
| Path traversal | `--report ../task-3-path-traversal.json` | Exit `1`; workspace boundary rejection; no outside file created |
| Duplicate IDs | Approval `[1, 1]` through the real CLI | Exit `1`; duplicate-ID rejection before mutation |
| Stale state | Changed views after report while refreshing only the backup receipt | Automated contract rejected `Post state changed after report: 1`; zero mutations |
| SIGINT/cancel before commit | Pre-aborted signal, repeated three times | All three attempts rejected before commit; zero quarantine rows |
| Dirty worktree | Ran report/reject/roundtrip with concurrent Task 1/2 files present | Decisions and checksums were unchanged; no Git operation is used by the tool |
| Hung database timeout | Checked-out PostgreSQL client held `BEGIN`; abort released it with an error | Promise rejected as cancelled and the connection was destroyed, forcing server rollback |
| Flaky rerun/idempotency | Repeated active quarantine and repeated restore | Second active quarantine rejected; second restore exited `1` |
| Misleading success output | Invalid/commented mixed approval through CLI | Only failure output was emitted; no `committed:true`; checksum unchanged |
| Repeated interruption/rollback | Three consecutive aborted domain transactions | All rejected and repository mutation count remained `0` |

Task 2 compatibility was also pinned against its `post_quarantines` contract: UUID `id`, `reason_code`, `status='active'`, and release via `status='released'` plus `released_at`.

Cleanup receipt: disposable fixture DB, fixture backup/receipt, temporary approvals, malformed input, and after/roundtrip reports were removed. No database process, port, container, or environment session was left running. The requested candidate JSON/Markdown and final evidence files were retained.
