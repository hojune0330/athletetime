# Reports Migration Safe Repair

**Status:** Implemented and verified in a disposable PostgreSQL-compatible rehearsal; draft PR only.
**Branch:** `codex/fix-render-reports-migration-v2`
**Owner decision still required:** production backup, execution window, and production migration command.
**Explicitly out of scope:** connecting to Render, using `DATABASE_URL`, changing live rows, deleting the preserved legacy table, or modifying the bytes of `migration-007-chat.sql`.

## 1. Why This Repair Exists

There are two incompatible tables named `reports`:

- the former community-report table, which contains `post_id`, `comment_id`, `user_id`, and moderation fields;
- the current chat-moderation table expected by `backend/routes/chat.js`, which contains `target_type`, `target_id`, `reporter_anonymous_id`, and `reason_code`.

`migration-006a` runs before `migration-007-chat.sql`. On a database where `007` was already recorded, the runner validates its unchanged checksum and skips its SQL. Renaming a legacy table at that point therefore leaves no new `reports` table. The live symptom is first a missing `target_type` column, then a missing `reports` relation after a naive rename.

This plan preserves the known old data, creates or verifies the new chat table in a *new* migration, and refuses unknown states rather than guessing.

## 2. Fixed Safety Decisions

| Decision | Contract |
| --- | --- |
| Legacy recognition | Only the full known community-report shape is movable: exactly 10 expected columns, expected PostgreSQL types, nullability/defaults, primary key on `id`, expected `status` check, expected foreign-key semantics, and the owned serial sequence for `id`. A missing, extra, or malformed element is an unknown shape. |
| Schema boundary | Every catalog lookup and DDL target is qualified to `current_schema()`. A decoy `reports` table elsewhere on `search_path` cannot be read or altered. |
| Preservation | The old table is renamed to `legacy_community_reports`; its primary-key constraint and owned `reports_id_seq` are renamed with it before chat `reports` can be created. Existing preserved-table collisions stop the transaction. |
| Chat recognition | A table is considered chat `reports` only when it has the complete route contract: all seven columns, required types/nullability/defaults, `target_type` check, and unique reporter constraint. `008` then creates or verifies the two lookup indexes. A `target_type`-only or partly chat-like table is unknown and rejected. |
| Repair sequencing | Add `migration-008-chat-reports-repair.sql`; never edit `007`. Fresh databases run `006a -> 007 -> 008`. Databases that recorded `007` run `006a -> 008`, because the runner correctly skips recorded migration SQL. |
| Unknown and collision states | Unknown `reports`, pre-existing `legacy_community_reports` with a legacy `reports`, conflicting constraint/sequence names, and malformed chat-like tables fail closed. Transaction rollback leaves the original state and migration ledger unchanged. |
| Production boundary | Tests use only `NODE_ENV=test` with a disposable `TEST_DATABASE_URL`. No code task runs `data:rights:schema:migrate` with `DATABASE_URL` or contacts Render. |

## 3. Execution Tasks

### Task 1 - Lock the reported failure in tests (TDD)

**Files:** `backend/tests/data-rights-postgres.integration.test.js`, `backend/tests/chat-report-storage-contract.test.js`, `backend/tests/data-rights-storage.test.js`

1. Build fixtures for the complete old community schema, including `posts`, `comments`, `users`, its foreign keys, check/defaults, indexes, owned serial sequence, and representative rows.
2. Add a failing integration case representing the deployed state: a legacy `reports` table plus a ledger row for the *actual unchanged* `migration-007-chat.sql` checksum. Expect both the preserved old rows and a usable chat `reports` table after the runner completes.
3. Add test cases for fresh legacy state, no `reports` table, already-valid chat table, unknown legacy-like table, malformed chat-like table, and an existing `legacy_community_reports` collision.
4. Add a search-path decoy fixture: a `reports` table outside the active schema must remain untouched.
5. Extend migration-list/static tests to require `migration-008-chat-reports-repair.sql` after `007` and to assert the 007 file checksum/content remains unchanged.

**Acceptance:** tests fail against the current migration for the ledger-recorded-007 state and all unsafe shapes; fixtures do not use a production URL.

### Task 2 - Make legacy isolation exact and reversible by transaction

**Files:** `backend/database/migration-006a-legacy-reports-isolation.sql`, related tests only.

1. Replace unqualified lookup and DDL with `current_schema()`-qualified catalog inspection and identifiers.
2. Recognize only the exact legacy signature described in Section 2; reject any superset/subset or altered constraints/defaults/ownership.
3. If the table is absent, return without assuming `007` will run. If it is already a fully valid chat table, return without mutation. If it is malformed chat-like, fail closed.
4. Before table rename, check that `legacy_community_reports`, its primary-key name, and its serial sequence names can be preserved without collision.
5. Rename table, primary key, and owned serial sequence in the same transaction so `007` can create a new independent `reports_id_seq` for chat reports.

**Acceptance:** legacy rows and all old relationships survive under the legacy name; unknown shape produces an exception with no partial table/ledger change; both old and new `id` defaults work after the full migration path.

### Task 3 - Add an idempotent post-007 repair migration

**Files:** new `backend/database/migration-008-chat-reports-repair.sql`, `backend/database/run-migrations.js` only if a discovered test proves runner behavior needs correction.

1. Create `008` so filename ordering is deterministically after `007`.
2. Inspect only the current schema. If `reports` is absent, create the exact chat route table and lookup indexes. If it is complete and valid, make the migration a no-op.
3. If `reports` is any legacy or partial/unknown shape, abort rather than repairing through inference.
4. Verify or create the two required indexes only after the full table contract is known valid.
5. Keep `migration-007-chat.sql` byte-for-byte unchanged; this migration is the compatibility bridge for the ledger skip rule, not a rewrite of history.

**Acceptance:** all paths support the exact insert/select shape used by `POST /api/chat/reports`; pre-recorded `007` behaves identically to a fresh run; repeated migration runs are idempotent.

### Task 4 - Align fresh bootstrap definitions and operator documentation

**Files:** `backend/database/schema.sql`, `backend/database/schema-fixed.sql`, `docs/athletetime-deployment-target.md`, `backend/tests/deployment-wiring.test.js` or a narrow new contract test.

1. Trace every bootstrap entrypoint. Replace the legacy `reports` bootstrap definition only where it is the database intended for the current application; retain historical archival definitions only when marked non-runnable.
2. Ensure a blank bootstrap plus migration run starts with the valid chat table and does not depend on legacy conversion.
3. Document the operator preflight: verified backup reference, disposable rehearsal, migration ledger inspection, preservation-row count, chat route smoke test, and rollback decision point.
4. Document the hard stop: production execution requires a separate owner-approved runbook; no copy/paste production command belongs in this PR.

**Acceptance:** a new environment has one valid chat `reports` table; docs make it impossible to confuse code review with production approval.

### Task 5 - Prove behavior in a disposable database and complete QA

**Files:** tests/evidence only; no production configuration.

1. Run the focused static contracts and full `npm test`.
2. If a local/disposable PostgreSQL service is available, run the integration file with `NODE_ENV=test` and `TEST_DATABASE_URL` only; record that it was disposable and assert no test skips.
3. If no disposable Postgres is available, do not emulate success: record the integration tests as skipped, keep their fixtures executable, and leave the PR draft with the explicit non-skipped gate outstanding.
4. Run `npm --prefix frontend run build:check` and `git diff --check`.
5. Inspect changed migration SQL manually for unqualified relation access, `IF NOT EXISTS` masking unknown shapes, altered 007 content, destructive drops, or references to production URLs.

**Acceptance:** static/full tests pass; the production-like ledger case passes in a non-skipped disposable-Postgres run before PR is ready for merge. No live service is contacted.

### Task 6 - Publish a reviewable, non-deployable PR

1. Commit only the migration repair, exact tests, bootstrap/docs changes, and evidence necessary to review them.
2. Push `codex/fix-render-reports-migration-v2` and open a **draft** PR against `main`.
3. PR body must include: root cause, fixed states, fail-closed states, exact 007 checksum preservation, test evidence, and a separate owner-decision checklist for production.
4. Do not merge, deploy, run production migrations, or claim that the Render database is repaired.

**Acceptance:** reviewers can reproduce the state matrix and see precisely what still requires owner approval.

## 4. State Matrix

| Starting state | Expected after code-only migration rehearsal |
| --- | --- |
| Full legacy `reports`, no 007 ledger | old rows preserved as `legacy_community_reports`; full chat `reports` exists |
| Full legacy `reports`, valid 007 ledger | same result; 008 creates chat table after 007 is skipped |
| No `reports`, valid 007 ledger | 008 creates full chat table |
| Full valid chat `reports` | no data/table changes; validates cleanly |
| Partial chat-like or unrelated `reports` | transaction fails; table and ledger unchanged |
| Legacy `reports` plus existing `legacy_community_reports` | transaction fails; neither table is overwritten |
| Active-schema table plus decoy in another schema | only active-schema table is considered; decoy unchanged |

## 5. Explicit Owner Holds

- Approve the production backup location and restoration owner.
- Approve the maintenance window and who runs the production command.
- Review the rehearsal row counts and route smoke result before authorizing execution.
- Decide the legacy table’s retention/deletion policy only after a verified backup and a separate retention decision.
