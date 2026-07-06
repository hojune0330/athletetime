# ULW Final PR Handoff Notepad

## Objective

Prepare a final PR for `hojune0330/2026-first-item` that gives the final decision agent a compact, evidence-backed path to judge launch readiness.

## Ponytail Attempt

- Requested repo: `DietrichGebert/ponytail`
- Local clone: `/tmp/ponytail`
- Direct plugin installation command attempted: `codex plugin marketplace add DietrichGebert/ponytail`
- Result: blocked by local executable execution failure in this Windows session.
- Fallback used: documented Ponytail-style token-saving protocol in `.omo/drafts/ponytail-agent-rules.md` and `docs/athletetime-final-decision-blueprint.md`.

## Branch Risk

Local branch `codex/athletetime-product-ux-refresh` is behind `origin/codex/athletetime-product-ux-refresh` by 17 commits. Final push should not overwrite that branch. Preferred path:

1. Commit local launch-readiness work.
2. Create a fresh final branch from `origin/codex/athletetime-product-ux-refresh`.
3. Cherry-pick the local final commits.
4. Push as `codex/final-service-readiness-handoff`.
5. Open PR to `genspark_ai_developer`.

## Evidence To Attach

- `npm test`
- `npm --prefix frontend run type-check`
- `npm --prefix frontend run build`
- `git diff --check`
