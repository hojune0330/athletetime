# AthleteTime staged launch readiness + final decision handoff

## Summary

This PR prepares AthleteTime for final launch decision review. It consolidates UX simplification, data-source transparency, source-ledger/download tooling, coverage truth checks, and auth/privacy readiness evidence into a branch the final decision agent can evaluate without rereading the whole history.

## Why this matters

The product is close enough to be staged, but it must not overclaim. The safe launch posture is:

- core: record search, competition/results exploration, source transparency
- later: community, real-time chat, live-like updates, broad "interesting record" discovery
- never without proof: official ranking language, complete DB claims, blocked-source collection, same-name athlete auto-merge

## High-signal files

- Final decision brief: `docs/athletetime-final-decision-blueprint.md`
- Coverage truth: `docs/athletetime-coverage-matrix.md`
- About data UX: `frontend/src/pages/AboutDataPage.tsx`, `frontend/src/pages/AboutDataSections.tsx`, `frontend/src/pages/aboutDataContent.ts`
- Source handling: `card-studio/services/sourceInventoryService.js`, `card-studio/services/sourceLedgerService.js`, `card-studio/services/sourceDownloadService.js`
- Source CLIs: `tools/build-source-inventory.js`, `tools/download-source.js`, `tools/build-coverage-matrix.js`, `tools/build-kaaf-result-catalog.js`
- Auth contracts: `backend/tests/auth-cookie-csrf.test.js`, `backend/tests/frontend-auth-cookie-contract.test.js`, `frontend/src/context/AuthContext.tsx`, `frontend/src/api/index.ts`

## Review instructions for final decision agent

Use Ponytail-style review:

1. Read `docs/athletetime-final-decision-blueprint.md`.
2. Inspect changed filenames before reading large diffs.
3. Run:

```bash
npm test
npm --prefix frontend run type-check
npm --prefix frontend run build
git diff --check
```

4. Decide staged launch vs hold using the checklist in the blueprint.
5. Ask Opus/Claude to focus on copy/legal tone and real-athlete trust, not implementation mechanics.

## Verification performed by Codex

- `npm test` passed: 87 tests, 0 failures.
- `npm --prefix frontend run type-check` passed.
- `npm --prefix frontend run build` passed.
- `git diff --check` passed; captured output contains Windows LF/CRLF warnings only.
- Public-claim scan: only incomplete-coverage warning text matched.
- Security-sensitive scan: matches are test assertions only after removing a profile-update debug log.
- Auth token-body blocker fixed: register, login, verify-email, and refresh no longer serialize `accessToken` or `refreshToken` into JSON bodies; tests now enforce cookie-only session delivery.
- Example-data scan: `심종섭` matches are real result rows or a search fixture, not public demo UI.
- Ponytail: direct Codex plugin install was blocked in this Windows session, so the PR includes a Ponytail-style token-saving protocol and local fallback evidence.

## Final branch verification

After rebasing the handoff onto the latest `origin/codex/athletetime-product-ux-refresh` through a fresh branch and resolving conflicts in favor of the newer remote UX structure:

- `npm test` passed: 102 tests, 0 failures.
- `npm --prefix frontend run type-check` passed.
- `npm --prefix frontend run build` passed.
- `git diff --check` passed.
- token response scan found no JSON-field-like `accessToken` or `refreshToken` response fields.

Evidence files are under `.omo/evidence/final-pr-handoff/final-branch-*`.

## Publication procedure used

The local working branch was behind `origin/codex/athletetime-product-ux-refresh` by 17 commits during final prep. To avoid overwriting Opus/Claude work, do not push the stale local branch directly.

Intended safe publication path:

```bash
git commit -m "feat(service): prepare staged launch decision handoff"
git fetch origin
git switch -c codex/final-service-readiness-handoff origin/codex/athletetime-product-ux-refresh
git cherry-pick <final-local-commit>
npm test
npm --prefix frontend run type-check
npm --prefix frontend run build
git diff --check
git push -u origin codex/final-service-readiness-handoff
```

Intended commit scope:

- include production/service changes already staged in this final launch-readiness bundle
- include concise final-decision docs and compact evidence under `.omo/evidence/final-pr-handoff/`
- exclude bulk `.omo/evidence/**`, `.omo/ulw-loop/**` historical logs, `.ultra/**`, runtime source ledgers, and downloaded originals
- never use `git add .` for this PR

## Requested review from Opus/Claude

- Does the public wording feel truthful without sounding defensive?
- Would a middle/high school athlete understand what is searchable and what is incomplete?
- Are any pages still implying "official ranking" or "complete national DB"?
- Are weak features safely hidden or marked for later?
- Is the about-data explanation enough to defend source collection and processing choices?

## Known residual risks

- Full production hosting readiness still requires real env/secret/database/email verification in the hosting service.
- Cataloged original files are not automatically equal to searchable result rows.
- Same-name athlete identity must remain separated by default.
- Data-rights operations need continued human discipline after launch.
