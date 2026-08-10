# Safe Record Comparison Recovery

## TL;DR
> **Summary**: Stale or partially unavailable comparison links must tell the user exactly that the displayed comparison is incomplete, without inventing an athlete, leaking an identifier, or leaving a blank screen.
> **Deliverables**: Request-outcome model, explicit partial/unavailable UI, truthful E2E fixture, route-readiness proof, mobile browser evidence.
> **Effort**: Short
> **Parallel**: NO
> **Critical Path**: S1 -> F1/F2/F3

## Scope
- INCLUDE: public comparison links in `/records`, synthetic E2E fixtures, comparison recovery copy, browser readiness assertions.
- EXCLUDE: team threshold policy, private memo storage, identity merging, authentication changes, real data, production deployment.

## Guardrails
- Same-name candidates remain separate.
- Unknown comparison keys return a synthetic 404 in tests; they never fall back to a valid person.
- UI never displays raw athlete keys or server error text.
- A comparison with fewer than two loaded profiles never renders a table or chart.

## TODOs

- [x] S1. Make incomplete comparison links explicit and recoverable

  **What to do**:
  1. Add a small typed request-outcome helper near `frontend/src/components/record-insights/CompareView.tsx` that retains requested count, loaded profiles, and unavailable count without passing failures as `null` through the UI.
  2. Render four exclusive states: loading; complete ready; partial ready (two or more loaded but not all); unavailable (zero or one loaded). Partial copy contains the unavailable count but no keys. Unavailable copy distinguishes no loaded profiles from one loaded profile only in user-action terms, not failure cause.
  3. Keep the existing close action as the single recovery action when comparison cannot render.
  4. Ensure `backend/tests/records-flow-e2e-data.js` returns `null` for unknown keys and `backend/tests/records-flow-e2e-fixture.js` turns it into a 404.
  5. Strengthen `navigateToReady` in `backend/tests/records-flow-e2e-fixture.js`: a test must wait for document completion, the fallback to disappear, and an explicit route marker/expected locator supplied by its caller.

  **Must NOT do**: Do not modify the comparison cap, identity policy, server athlete API, local storage, or team APIs.

  **References**:
  - `frontend/src/components/record-insights/CompareView.tsx`
  - `frontend/src/components/record-insights/CompareNotices.tsx`
  - `backend/tests/records-recovery-e2e.test.js`
  - `backend/tests/records-flow-e2e-data.js`
  - `backend/tests/records-flow-e2e-fixture.js`

  **Acceptance Criteria**:
  - [x] Two valid and one unavailable candidate show exactly two separately named profile chips and a count-based partial notice.
  - [x] Zero or one valid candidate show no comparison visual and one touch-safe close action.
  - [x] Fixture unknown keys produce a 404 and never render `Alpha Kim` or another fallback profile.
  - [x] Existing complete comparison remains unchanged.
  - [x] Targeted comparison E2E readiness waits for an explicit expected locator after the lazy-route fallback clears.

  **QA Scenarios**:
  ```text
  Scenario: Partial comparison on mobile
    Tool: Playwright real browser through backend/tests/records-recovery-e2e.test.js
    Steps: Open /records?compare=alpha-2016,alpha-2020,missing-one at 375px.
    Expected: Two candidate chips remain, partial notice says one record could not load, all visible actions are >=44px, no console/page error is unaccounted for.
    Evidence: .omo/evidence/safe-record-compare-recovery/partial/records-flow-e2e-results.json

  Scenario: Fully stale shared link
    Tool: Playwright real browser through backend/tests/records-recovery-e2e.test.js
    Steps: Open /records?compare=missing-one,missing-two at 375px and press the recovery action.
    Expected: No chart/table/person profile renders, one recovery action returns to the records hub, unknown keys never appear in visible text.
    Evidence: .omo/evidence/safe-record-compare-recovery/stale/records-flow-e2e-results.json
  ```

  **Commit**: YES | Message: `fix(records): make incomplete comparisons explicit` | Files: compare view/notices, fixture, recovery tests.

## Final Verification Wave

- [x] F1. Contract and regression checks
  - [x] `node --test backend/tests/records-recovery-e2e.test.js` passes.
  - [x] `npm.cmd --prefix frontend run type-check` passes.
  - [x] `npm.cmd --prefix frontend run build:check` passes.
  - [x] `git diff --check` passes.

- [x] F2. Real mobile browser evidence
  - [x] Run the S1 scenarios at 375px with evidence writing enabled.
  - [x] Inspect evidence for zero unexpected console/page errors and temporary test-server cleanup.

- [x] F3. Scope fidelity audit
  - [x] Confirm no team, memo, auth, storage, identity merge, or production data file changed.
  - [x] Confirm all changed code uses synthetic test data only.

## Commit Strategy
- Commit only after S1 and F1-F3 pass.
- Push this branch and open a focused draft PR against `main`; do not add it to PR #81 or PR #82.

## Success Criteria
- A user can tell whether a comparison is complete and can recover from a stale link in one action.
- No unavailable key can become another person through test or UI fallback behavior.
