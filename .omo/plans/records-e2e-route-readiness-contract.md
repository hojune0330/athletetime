# Records E2E Route Readiness Contract

## Goal

Every records-related browser test must wait for its actual destination, not merely for an HTTP response or a disappeared lazy-route fallback. This makes a loading race fail as a test failure instead of looking like a broken product screen.

## Scope

- Include: the shared records E2E navigation helper and every current caller in the four records E2E suites.
- Exclude: production routes, API contracts, record data, identity behavior, team policy, authentication, storage, and visual copy.

## Fixed Decisions

- `navigateToReady` requires a target locator. Missing the locator rejects before navigation, so new E2E callers cannot accidentally use the weak readiness check.
- Each caller supplies a locator for the same visible route state it already asserts later in the scenario.
- The helper still waits for document completion and the lazy fallback to disappear before the target locator.
- Tests use the existing 375px Chrome harness; no new dependency or browser fixture is introduced.

## Tasks

- [x] R1. Lock the missing-locator failure before changing the helper.
  - Add a focused Node contract test that calls `navigateToReady` without a locator and proves that it rejects without triggering `page.goto`.
  - Red proof: the test fails because the current helper accepts an omitted locator.

- [x] R2. Make route readiness mandatory and update every caller.
  - Require the third `readyLocator` argument in `backend/tests/records-flow-e2e-fixture.js`.
  - Update all calls in `records-flow-e2e.test.js`, `records-recovery-e2e.test.js`, `records-mobile-dock-e2e.test.js`, and `records-workspace-e2e.test.js`.
  - Use a stable page marker, heading, form state, or action already asserted by that scenario.
  - Do not add sleeps, retries, production data, or selector-only test IDs.

- [x] R3. Verify all browser entry routes.
  - Run the focused helper contract, then all four records browser suites.
  - Run changed-file syntax checks and `git diff --check`.
  - Record the exact test counts and any expected mocked 404/503 console messages in evidence.

## Acceptance Criteria

- [x] A caller without a route locator is rejected before browser navigation.
- [x] Every `navigateToReady` call has an explicit third argument, except the one intentional missing-locator contract case.
- [x] Records hub, browse, mine, athlete detail, stale-link, comparison, workspace, and team entry scenarios all pass at 375px.
- [x] No production code or data contract changes.
- [x] No `waitForTimeout` or time-based sleep was added to the changed tests.

## Commit

`test(records): require explicit browser route readiness`
