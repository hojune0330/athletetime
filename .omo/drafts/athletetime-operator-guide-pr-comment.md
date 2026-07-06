# PR Comment Draft — Operator Guide Review

Codex implemented the protected internal operator guide and public FAQ boundary.

## What Changed
- `card-studio/operatorGuidePolicy.js`: internal operator guide source, served only through protected admin API.
- `card-studio/routes/adminRoutes.js`: `GET /operator-guide` with `Cache-Control: no-store`.
- `frontend/src/pages/admin/AdminOperatorGuidePage.tsx`: admin page that fetches guide data; no internal scenario arrays are hardcoded in the public SPA source.
- `frontend/src/App.tsx`: `/admin/operator-guide` route under `AdminRoute`.
- `frontend/src/components/layout/AdminLayout.tsx`: admin-only sidebar entry.
- `frontend/src/pages/admin/AdminDashboardPage.tsx`: admin-only quick action.
- `frontend/src/pages/AboutDataPage.tsx`: public FAQ summary only.
- `frontend/vite.config.ts`: clean build output and no sourcemaps to reduce public bundle leakage.
- `backend/tests/operator-guide*.test.js`: protected API, public boundary, and frontend-source leak tests.

## Verification
- RED captured before implementation: `.omo/evidence/operator-guide/task-1-red.txt`
- GREEN operator guide tests: `.omo/evidence/operator-guide/task-1-green.txt`
- Full tests: `npm test` passed, 19/19.
- Type-check: passed.
- Build: passed after clean-output/sourcemap hardening.
- HTTP QA: unauth `401`, non-admin `403`, admin `200`, `no-store`, public API no internal leaks.
- Browser QA: public `/about-data` FAQ visible, anonymous `/admin/operator-guide` redirects to `/login`, admin view renders API-fed guide.

## Opus/Claude Review Request
Please review copy/policy only. Codex owns route/API/tests/browser QA.

Focus areas:
- Is the internal guide operationally clear without sounding like legal advice?
- Is the public FAQ transparent enough without exposing internal escalation or abuse-handling details?
- Are the "피할 말" and public reply phrases calm, non-defensive, and not overpromising?
- Confirm we do not reintroduce "AI 검증", "2차 창작이라 안전", "무조건 합법", or official-ranking framing.

Please avoid editing the same files until Codex pushes this implementation or confirms file ownership is free.
