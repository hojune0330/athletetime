# Task 5: News discovery inbox verification

## Automated

- `node --test backend/tests/community-editorial-admin-ui.test.js` passed: 11/11 tests.
- `npm.cmd run type-check` passed in `frontend`.
- `npm.cmd run build` passed in `frontend`.
- `git diff --check` passed.

The focused UI tests characterize the protected magazine route and assert the inbox contract: fixed ranges/statuses, manual run only, explicit review/source/link/dismiss actions, review-only source confirmation, required original-source confirmation before calendar linking, optimistic calendar version payload, fail-closed response parsing, escaped title rendering, single-flight disabled actions, safe original-source links, provider-safe run status labels, and cursor paging that resets when filters change.

## Browser QA

- Vite served the frontend at `http://localhost:4173`.
- Navigating directly to `/admin/content/magazine` while unauthenticated redirected to `/login`.
- The browser console had no error-level messages during that check.
- A real administrator session was not available, so populated-card interaction, CSRF rejection, and 390px authenticated-layout checks could not be driven in-browser. The UI has responsive wrapping and no hidden title/status/action controls at the 390px breakpoint by source inspection; those cases remain covered by the focused contract checks rather than an authenticated browser trace.

## Cleanup

- Local Vite process is stopped after verification.
