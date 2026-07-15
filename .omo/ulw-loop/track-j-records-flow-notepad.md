# Track J Records Flow Notepad

Date: 2026-07-13 KST

Objective: implement the first split of Track J `/records` stepped flow from PR #44: hub, Mine flow A1-A4, Browse B0 gateway, deep-link compatibility, and 375x667 mobile evidence.

Tier: HEAVY. Reason: new user-facing route flow and mobile UX interaction model; Fable required browser QA and independent review evidence.

Skills / rules used:
- `ulw-loop`: user invoked evidence-led execution.
- TrainOracle resume principle: GitHub/local state only; PR #44 and PR #43 comments verified through GitHub connector.
- Frontend/design: existing UI flow changed; `DESIGN.md` created from existing Tailwind tokens.
- Programming/TypeScript: `.tsx` and Node test changes.
- Visual QA: Chrome-driven screenshots at 375x667.

Scope shipped in this split:
- `/records` hub with two choices: "내 기록 찾기" and "기록 둘러보기".
- Mine flow A1-A4 through `?flow=mine&step=...`.
- Browse B0 through `?flow=browse`.
- Existing `?athlete=` and `?compare=` links bypass the hub.
- Candidate selection updates `mineDraft` in the URL with `replace: true`, so browser Back returns to the previous step instead of prior selection states.
- Sticky CTAs are offset above the mobile bottom tab bar.

Out of scope by Fable-approved split:
- Browse B detailed flows: team grouping UI and season step chip editor.
- A-3 xls normalization step 2 and vertical/parser work.
- J-2 account sync and SSO linkage.

Success criteria and evidence:
1. A1-A4 contracts exist, candidate selection stays in one screen, URL draft state survives refresh, and direct links bypass hub.
   - Evidence: `node --test backend/tests/records-flow-e2e.test.js` -> 1/1 pass.
   - Regression suite: `node --test backend/tests/athlete-user-ux.test.js backend/tests/records-flow-e2e.test.js backend/tests/division-hierarchy.test.js` -> 28/28 pass.
2. Frontend type/build passes.
   - Evidence: `npm --prefix frontend run build:check` -> pass.
3. Real browser mobile QA passes at 375x667.
   - Evidence script: `.omo/evidence/track-j-records-flow-qa/records-flow-qa.cjs`.
   - Evidence JSON: `.omo/evidence/track-j-records-flow-qa/records-flow-375x667-qa.json`.
   - Screenshots: `.omo/evidence/track-j-records-flow-qa/*-375x667.png`.
   - Checks passed: back navigation returns to name step, `?athlete=` bypasses hub, `?compare=` bypasses hub, all measured CTAs are fully visible, console/page errors are 0.
4. QA cleanup completed.
   - Evidence: preview parent process `166824` stopped, remaining port listener `54892` stopped, `http://127.0.0.1:4173/records` no longer responds.

Findings during QA:
- Initial browser QA caught a real issue: candidate toggles added history entries, so Back returned to prior `mineDraft` state rather than the previous step.
- Fix: `toggleMineDraft` now calls `setSearchParams(next, { replace: true })`; contract test added.
- Visual QA also showed the sticky CTA could overlap the mobile tab bar and step transitions could retain prior scroll position.
- Fix: Mine sticky CTAs use `bottom-[calc(var(--mobile-tabbar-height)+env(safe-area-inset-bottom)+12px)] md:bottom-0`; step changes reset to the top of the new step.
- Follow-up QA caught Korean heading/body orphan lines at 375px. Fix: hub/surface and done headings now use smaller mobile type while preserving larger desktop sizes; done-step summary copy was shortened.
- Final QA also caught the compare panel `닫기` button wrapping into two one-syllable lines. Fix: CompareView close buttons now use `whitespace-nowrap`.

Review follow-up:
- Code review rejected the first pass because `backend/tests/records-my-flow-steps.test.js` and `backend/tests/records-browse-flow-steps.test.js` were source-inspection tests.
- Follow-up fix removed those hollow tests from the main suite and replaced them with `backend/tests/records-flow-e2e.test.js` plus `backend/tests/records-flow-e2e-fixture.js`.
- The new test starts a real Vite server, drives Chrome through `/records`, mocks only `/api/*`, and asserts the observable hub, Mine A1-A4, browser Back/Forward, `mineDraft`, Browse B0, and `?athlete=`/`?compare=` bypass behavior.
- Evidence: `.omo/evidence/track-j-records-e2e-replacement/records-flow-e2e-results.json`.

Full-suite status:
- `npm test` was rerun and logged to `.omo/evidence/track-j-records-flow-qa/npm-test.log`.
- Result after E2E replacement: exit 1, tests 242, pass 235, fail 2, skipped 5.
- Track J records E2E passed inside the full run.
- Failing tests are outside this UI scope:
  - `backend/tests/kaaf-backfill-originals-import.test.js` / `BACKFILL-IMPORT-001`: expected `false`, actual `true`.
  - `backend/tests/legacy-original-fixture-guard.test.js` / `LEGACY-FIXTURE-GUARD-001`: expects `/# skipped 3/u`, but current Node output uses `ℹ skipped 3`.
