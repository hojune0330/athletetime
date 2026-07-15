# Data-rights rollout runbook

This runbook prepares PR #50 for deployment. It does not replace Fable's privacy and minor-safety approval.

## Before approval

Safe now:

```bash
npm run test:data-rights
npm run data:rights:migrate:dry-run
```

Do not run the write migration, merge the PR, or change production data before Fable approves the policy values and copy.

## After Fable approval

## 1. Record the encrypted backup

Create the database backup with the hosting provider's protected backup facility. Do not put its URL, password, or contents in GitHub. Then record local evidence:

```bash
npm run data:rights:backup:record -- \
  --file /secure/path/athletetime.dump.enc \
  --manifest .data-rights-rollout/production-backup.json
```

The manifest contains only the backup filename, byte size, SHA-256, and timestamps. The local manifest directory is gitignored. Confirm separately that the backup is encrypted, access-controlled, and expires within 35 days.

Immediately before migration, verify the same file and require a manifest no older than 24 hours:

```bash
npm run data:rights:backup:verify -- \
  --file /secure/path/athletetime.dump.enc \
  --manifest .data-rights-rollout/production-backup.json \
  --max-age-hours 24
```

## 2. Dry-run and migrate after approval

Set secrets only in the operator environment. Never pass database URLs or keys as command-line arguments.

```bash
npm run data:rights:migrate:dry-run | tee .data-rights-rollout/legacy-dry-run.json
npm run data:rights:schema:migrate
npm run data:rights:migrate
```

The local dry-run evidence records the current JSON checksum and request/suppression counts without raw request data. Review those counts first. The schema command applies and validates only managed schema migrations. The import command then repeats schema validation as a no-op before the checksum-idempotent import. Run both write commands only after backup verification succeeds.

## 3. Shadow comparison

With `NODE_ENV=production`, the production `DATABASE_URL`, encryption key, and legacy ticket pepper available only in the process environment:

```bash
npm run data:rights:shadow
```

Success requires `equal: true`, zero missing rows, and zero unexpected rows. The command prints counts only. It never prints athlete names, teams, competitions, events, tickets, database URLs, or comparison keys. Exit code 2 means the rollout must stop and the old JSON files must remain in place.

## 4. Deploy and verify readiness

After deploying the approved commit:

```bash
npm run data:rights:readiness -- --base-url https://your-api.example
```

Success requires HTTP 200, overall `healthy`, and `services.dataRights` equal to `ready`. Remote HTTP URLs are rejected. This check is read-only and does not create a test request.

After readiness passes, run the explicitly write-enabled request-to-lookup smoke required by PR #50:

```bash
npm run data:rights:roundtrip -- \
  --base-url https://your-api.example \
  --confirm-write-smoke
```

This creates one clearly synthetic `ROLLOUT-CHECK-*` correction request without contact data, immediately looks it up, and never prints its ticket. Mark the synthetic request `corrected` in the admin console after recording the aggregate pass result. Do not run this command before Fable approval or against an unapproved deployment.

## Stop conditions

- Backup verification fails or the manifest is stale.
- Dry-run counts differ from the reviewed counts.
- Shadow comparison is not exactly equal.
- `/health` is 503, degraded, or data rights are unavailable.
- Any command exposes a ticket, athlete identity, contact, database URL, or secret in output.

On any stop condition, do not delete the JSON evidence and do not route traffic to the new service. Preserve the backup and investigate using aggregate counts only.
