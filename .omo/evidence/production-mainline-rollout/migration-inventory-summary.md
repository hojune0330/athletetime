# Migration Inventory Summary

This evidence packet supports the first production-mainline rollout wave.

## Frozen Categories

- Already in production: PR #17 UX/workflow snapshot on `athletetime/main`.
- Port now: production policy, port map, auth/security reconciliation, source catalog metadata only, quality-hold preservation.
- Port later: extraction engines, private storage, admin analytics, redirects, legacy DB migration, WebSocket cutover.
- Internal only: originals, operational evidence, low-threshold failed queries, source identifiers.
- Do not port: bypass collectors, official/ranking/complete claims, fake examples, whole-population person-number cleanup, public dumps.

## Why This Freeze Matters

The project now contains enough useful data and operational knowledge that broad, unclassified migration is dangerous. The port map prevents three failure modes:

1. Shipping raw or private source material by accident.
2. Making public claims stronger than the evidence supports.
3. Overwriting active auth/security work while migrating UX/data slices.
