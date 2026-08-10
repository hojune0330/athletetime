# Safe Record Comparison Recovery Evidence

All browser checks used a 375px-wide mobile viewport and synthetic public-record fixtures only.

| Scenario | Result | Page errors | Expected fixture 404 console messages |
| --- | --- | ---: | ---: |
| Stale link: no profiles available | Passed | 0 | 8 |
| Partial link: two profiles available | Passed | 0 | 4 |
| One profile available | Passed | 0 | 4 |

The E2E harness asserts that every console message outside the declared synthetic 404 responses is absent. It also closes the browser, Vite server, and mock API server after each scenario.

Artifacts:

- `stale/records-flow-e2e-results.json`
- `partial/records-flow-e2e-results.json`
- `one-available/records-flow-e2e-results.json`
