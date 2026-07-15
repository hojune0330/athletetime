# G004 Pre-Fable Rollout Gates

## Objective

Prepare read-only, repeatable rollout checks without approving policy, changing production data, or merging PR #50.

## Scope

1. Record and verify a local encrypted-backup artifact by filename, size, SHA-256, and age.
2. Compare legacy JSON suppressions with active PostgreSQL legacy suppressions without printing athlete data.
3. Verify deployed `/health` reports both overall health and data-rights readiness.
4. Prepare an explicitly confirmed post-approval synthetic request-to-lookup smoke check.
5. Add contract tests, npm commands, ignored local manifest storage, and an operator runbook.

## Guardrails

- No production write, migration write, backup creation, merge, or deployment before Fable approval.
- Never print database URLs, ticket values, athlete names, contact data, or suppression signatures.
- Remote readiness checks require HTTPS; HTTP is allowed only for localhost.
- Backup manifests stay local under `.data-rights-rollout/` and are never committed.

## Acceptance

- Unit tests cover successful and failing backup, shadow, and readiness scenarios.
- `npm test` and `npm run test:data-rights` pass.
- The PR documents exact pre-migration, shadow, and post-deploy commands.
