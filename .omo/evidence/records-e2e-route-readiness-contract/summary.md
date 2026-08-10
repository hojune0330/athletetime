# Records E2E Route Readiness Contract - Evidence

Date: 2026-08-10

## Scope

Test harness only. No production routes, APIs, record data, identity behavior,
team policy, authentication, or browser storage contract changed.

## Red to Green

Before the helper change, the focused contract failed because
`navigateToReady(page, url)` accepted an omitted locator. After the change:

```text
node --test --test-name-pattern='RECORDS-E2E-READINESS-CONTRACT' backend/tests/records-recovery-e2e.test.js
pass 1 / fail 0
```

The contract proves the helper rejects before calling `page.goto`.

## Browser Verification

All tests use the existing 375px Chrome harness and wait for an actual visible
route marker after document completion and lazy-route fallback removal.

| Command | Result |
| --- | --- |
| `node --test backend/tests/records-flow-e2e.test.js` | 2 passed, 0 failed |
| `node --test backend/tests/records-recovery-e2e.test.js` | 11 passed, 0 failed |
| `node --test backend/tests/records-mobile-dock-e2e.test.js` | 2 passed, 0 failed |
| `node --test backend/tests/records-workspace-e2e.test.js` | 3 passed, 0 failed |

Expected mocked console conditions remain explicitly declared by their existing
recovery scenarios: search `503`, and unavailable public-record `404` links.
No unhandled browser/page error was accepted by the harness.

## Static Verification

- `node --check` passed for all five changed JavaScript files.
- `git diff --check` passed.
- A caller scan confirmed every production browser navigation supplies a page
  locator. The sole omitted-locator invocation is the intentional rejection
  contract itself.
- No production source file changed and no time-based wait was added.

## Note

`npm.cmd test` was also started as a broad, non-gating check, but the desktop
tool stopped waiting at its five-minute output limit before it returned a final
status. It is intentionally not counted as a pass. The four affected browser
suites above completed independently and passed.
