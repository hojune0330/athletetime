# AthleteTime Final Decision Blueprint

> Purpose: final decision-agent briefing for the service-readiness PR. Read this before opening the large diff.
> Token rule: start here, then read the PR body, then inspect only the domain files for the decision you are making.

## One-Line State

AthleteTime is moving from a broad prototype into a staged public service: records/search and data-source transparency are the core, while unfinished community/chat/market/live-style features should remain hidden, softened, or marked as later.

## What This PR Is Trying To Decide

1. Can the current product branch be accepted as a staged-launch foundation?
2. Are the data-source and coverage claims truthful enough for public users?
3. Are authentication, privacy, and operator response flows ready enough for a controlled service opening?
4. Which surfaces must stay "coming soon" rather than being shown as complete?

## Ponytail Token-Saving Protocol

The user asked to use DietrichGebert/ponytail so the final decision agent spends fewer tokens. Direct plugin installation was attempted but blocked by the local Codex executable on Windows, so this repo includes a practical fallback protocol.

Use this ladder for every review branch:

1. Does this feature need to exist for launch?
2. Can it be hidden or simplified instead of completed now?
3. Can existing project code or browser-native behavior solve it?
4. Can one small test prove the risk?
5. Only then read or change the full implementation.

Do not use this laziness for security, privacy, data-rights, accessibility, or user trust. Those are launch blockers, not polish.

## Domain Map For Review

| Domain | First files to read | What to decide |
|---|---|---|
| Service IA / UX | `frontend/src/pages/RecordsPage.tsx`, `frontend/src/pages/CompetitionsPage.tsx`, `frontend/src/components/layout/Layout.tsx`, `frontend/src/components/layout/Footer.tsx` | Is the public surface simple enough, and are weak features hidden or reduced? |
| Data provenance | `frontend/src/pages/AboutDataPage.tsx`, `frontend/src/pages/AboutDataSections.tsx`, `frontend/src/pages/aboutDataContent.ts`, `docs/athletetime-coverage-matrix.md` | Does the site explain what was collected, from where, and what is incomplete? |
| Source ledger / downloads | `card-studio/services/sourceInventoryService.js`, `card-studio/services/sourceLedgerService.js`, `card-studio/services/sourceDownloadService.js`, `tools/download-source.js` | Are originals handled privately and only from approved source rows? |
| Coverage truth | `card-studio/services/coverageMatrixService.js`, `tools/build-coverage-matrix.js`, `backend/tests/coverage-matrix.test.js` | Are "2010-present" and "official complete DB" claims blocked? |
| KAAF catalog/reference | `card-studio/services/kaafResultCatalogService.js`, `card-studio/services/kaafResultOriginalSearchService.js`, `tools/build-kaaf-result-catalog.js`, `tools/search-kaaf-result-originals.js` | Is this a reference/catalog layer rather than a bypassing crawler? |
| Auth / privacy | `frontend/src/context/AuthContext.tsx`, `frontend/src/api/index.ts`, `backend/tests/auth-cookie-csrf.test.js`, `backend/tests/frontend-auth-cookie-contract.test.js` | Does the browser path avoid token exposure and require CSRF where expected? |
| Operator readiness | `frontend/src/pages/admin/AdminPipelinePage.tsx`, `.omo/ulw-loop-auth-wave1-brief.md`, `.omo/ulw-loop-auth-wave2-brief.md` | Can staff understand response duties, risks, and remaining launch gates? |

## Current Launch Position

### Good Enough For Staged Opening

- Records and competitions can be the center of the public service.
- Source transparency now has a concrete direction: public-data imports, official downloadable files, reference tables, and blocked paths are separated.
- Coverage wording is conservative: the site should not claim every result from 2010 to today is searchable.
- Auth work has moved toward HttpOnly cookie sessions and CSRF contracts.
- The UX direction is less "feature museum" and more "search, understand, verify, request correction."

### Keep Out Of The Main Launch Promise

- Community as a fully active forum.
- Real-time chat.
- "Interesting record" discovery if it implies complete ranking or official judging.
- Any live-results feature that cannot show source, freshness, and coverage limits.
- Any scrape/bulk-collection path from blocked domains.

## Hard Guardrails

- Do not claim legal certainty.
- Do not claim official status.
- Do not claim complete national rankings.
- Do not auto-merge same-name athletes.
- Do not store or expose `person_no`, birthdate, or hidden official identifiers as a product identity layer.
- Do not treat cataloged original files as searchable results until row-level import, provenance, suppression, and UX tests pass.
- Do not bypass robots or access controls. Use official files, public-data portals, manual uploads, or cooperation requests.

## Evidence Commands

Run these before final approval:

```bash
npm test
npm --prefix frontend run type-check
npm --prefix frontend run build
git diff --check
```

If any fail, the final decision should be "not ready to merge" even if the product looks good.

Current local evidence for this PR pass is under `.omo/evidence/final-pr-handoff/`.

Final branch evidence after cherry-picking onto the latest product branch is under `.omo/evidence/final-pr-handoff/final-branch-*`.

Final rereview evidence is summarized in `.omo/evidence/final-pr-handoff/final-rereview-summary.txt`. Treat this as newer than the earlier 87-test prep evidence:

- GitHub reported PR #3 and PR #4 as open, non-draft, and mergeable.
- Local branch matched `origin/codex/final-service-readiness-handoff`; ahead count from `origin/codex/athletetime-product-ux-refresh` was 2 before this rereview patch, so final reviewers should recompute the count after the latest commit.
- Fresh gates passed again: `npm test` 102/102, frontend type-check, frontend build, and `git diff --check`.
- Browser smoke passed for `/records`, `/competitions`, `/about-data`, and `/login` with zero captured console errors.
- Home copy was tightened so the first user path says to enter a real name directly instead of mentioning sample/example athletes.

Observed scan caveats:

- Public-claim scan finds `아직 2010년부터 오늘까지 모든 경기결과가 다 있는 상태가 아닙니다.` in `coverageMatrixService.js`. This is a negative/incomplete-coverage warning, not a complete-coverage claim.
- Sensitive-pattern scan finds token-localStorage strings only inside tests that assert those strings are absent from frontend auth code.
- `athletetime-admin-2024` appears only in a test that proves the old predictable admin key is rejected.
- Auth session responses were hardened during final prep: session tokens are set through HttpOnly cookies and are no longer serialized as `accessToken`/`refreshToken` JSON fields.
- `심종섭` appears in real result data and one file-search fixture; it should not be treated as a public fake example unless found in UI copy or seeded demo data.
- One profile-update debug log that exposed `userId`, nickname, and password-change boolean was removed during final prep.
- `git diff --check` exited successfully; captured output includes Windows LF/CRLF conversion warnings, not whitespace-error failures.

## Safe Publication Procedure

The local branch may be behind the shared product branch. The final PR must be published from a fresh branch based on the latest `origin/codex/athletetime-product-ux-refresh`, not by force-pushing the stale local branch.

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

Commit only the launch-readiness bundle, final-decision docs, and compact evidence. Do not stage `.ultra/**`, historical `.omo/evidence/**`, runtime ledgers, downloaded originals, or broad process logs.

## Decision Checklist

- [ ] PR branch is based on the latest remote product branch, not the stale local branch.
- [ ] Public copy says "모은 공개 기록" or equivalent, not "official DB/ranking."
- [ ] `/about-data` or equivalent clearly explains source types and incomplete coverage.
- [ ] Raw downloaded originals are private/ignored and not shipped to the frontend.
- [ ] Auth session path does not depend on storing access tokens in localStorage.
- [ ] Weak features are hidden, downgraded, or marked later.
- [ ] Tests and build evidence are attached in the PR.
- [ ] Opus/Claude is asked to review copy, legal tone, and "would a real athlete trust this?" questions.

## Suggested Final-Agent Review Order

1. Read this file and the final PR body only.
2. Scan `git diff --name-status origin/codex/athletetime-product-ux-refresh...HEAD`.
3. Run the evidence commands.
4. Review one domain at a time using the table above.
5. Write the final blueprint as decisions, not a new wishlist: launch now, staged launch, or hold.
