# AthleTime Agent Coordination

## Purpose

This document fixes the shared execution agreement between Codex and Claude/Genspark for the next AthleTime service-loop slice. It exists to prevent parallel-agent drift and to keep the product direction, legal trust layer, and file ownership aligned.

Tooling note: read `docs/athletetime-agent-tooling-notes.md` before starting local QA servers or long-running shell commands.

## Final Direction

Use the merged Codex + Claude plan.

The next slice is not a full 28-page redesign. The priority is a safe vertical service loop:

1. Synchronize branches and confirm ownership.
2. Verify `resultsStore` and `searchService` real-data API behavior.
3. Define the suppression contract before connecting insights to real data.
4. Keep record insights server-backed only; do not add local fake athlete seeds.
5. Unify all correction, deletion, and objection paths to `/data-request`.
6. Apply TRAINORACLE polish only to the core loop and trust/community surfaces.
7. Run smoke QA, browser QA, and PR handoff.

## Suppression Contract

Search/result tables and insight surfaces intentionally behave differently.

| Status | Search/results | Record insights |
| --- | --- | --- |
| `under_review` | Mask as `비공개 요청 처리 중` where row context matters | Hide completely |
| `removed` | Exclude completely | Exclude completely |
| `restored` | Restore if source data exists | Eligible again |

Reason: search/results preserve competition-table context, but insight cards are highlight content. A disputed athlete must not be amplified while under review.

## Data Architecture Decision

Record insights should move behind a backend insight feed API instead of letting the frontend compose raw records.

Recommended backend path:

- Add `card-studio/services/insightService.js`.
- Reuse `resultsStore` for real data.
- Reuse the `dataRequestService` suppression source and contract as the single gate.
- For full-feed indexing, read active suppressions once and evaluate in memory to avoid per-row file IO.
- Treat `mask` and `remove` as exclusion for insight candidates.
- Expose a public endpoint from `card-studio/routes/publicRoutes.js`.

The frontend should receive already-safe insight data and focus on rendering, routing, and empty states.

## Codex-Owned Files

Codex owns user-facing entry, search UX, and insight UI:

- `frontend/src/pages/MainPage.tsx`
- `frontend/src/pages/CompetitionsPage.tsx`
- `frontend/src/components/record-insights/AthleteInsightShowcase.tsx`
- `frontend/src/data/athleteRecords.ts`
- `frontend/src/lib/recordInsights.ts`

Codex may change `recordCorrectionUrl` in `frontend/src/data/athleteRecords.ts` to `/data-request`.

## Claude/Genspark-Owned Files

Claude/Genspark owns data, trust, backend suppression, and request lifecycle:

- `card-studio/services/resultsStore.js`
- `card-studio/services/searchService.js`
- `card-studio/services/dataRequestService.js`
- `card-studio/services/insightService.js`
- `card-studio/routes/publicRoutes.js`
- `card-studio/routes/adminRoutes.js`
- `frontend/src/api/dataRequests.ts`
- `frontend/src/api/insights.ts`
- `frontend/src/pages/DataRequestPage.tsx`
- `frontend/src/pages/admin/AdminDataRequestsPage.tsx`
- `frontend/src/components/common/DataNotice.tsx`

## Shared Files: Approval Required

Do not edit these without explicitly telling the other agent first:

- `frontend/src/App.tsx`
- `frontend/src/components/ui/*`
- `frontend/tailwind.config.js`
- `frontend/src/index.css`

## Immediate Claude/Genspark Work Order

1. Do not modify code until the user approves fast-forward pull.
2. After approval, fast-forward pull `codex/athletetime-product-ux-refresh`.
3. Verify build/type-check state.
4. Verify `resultsStore`/`searchService` API behavior.
5. Design backend `insightService` and public insight endpoint, but keep it inside Claude-owned files.
6. Enforce insight suppression server-side: `under_review` and `removed` are excluded.
7. Keep `/data-request` and admin status workflow as the single trust path.

## Immediate Codex Work Order

1. Keep home, competitions, and record insight UI aligned with the merged plan.
2. Keep every correction link on `/data-request`.
3. Do not touch Claude-owned backend/trust files.
4. Validate with frontend type-check/build and file-level evidence.
