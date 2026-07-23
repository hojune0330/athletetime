# Community magazine public-detail QA

Date: 2026-07-22

## Static checks

- `npm --prefix frontend run type-check`: pass
- `npm --prefix frontend run build`: pass
- `git diff --check`: pass

## Isolated browser fixture

The fixture supplied one unchanged public post and changed only the by-post
magazine response at `/community/post/999`. No production service or data was
used.

| Response | Expected result | Result |
| --- | --- | --- |
| `200` with source, correction, and hidden counts | Magazine blocks render beside the existing post | Pass |
| `200` with `sources: []` | Quiet empty-source message without a source link | Pass |
| `404` | Existing ordinary-post presentation remains; no magazine block | Pass |
| `500` | Existing post remains with a retry affordance | Pass; retry recovered after a later `200` |

## Mobile and clean smoke check

- At `390x844`, a 200+ character source title and a long related-record URL
  rendered with `scrollWidth=382`, `innerWidth=390`.
- The source and related-record links were keyboard-focusable anchors.
- A fresh normal-response tab had `scrollWidth=1528`, `innerWidth=1536`, and
  browser console errors `0`.

## Scope boundary

The public API contract, database, routing policy, and scheduler state were not
changed. Sharing now uses native Web Share when available, otherwise attempts
clipboard copy and gives the existing user-facing feedback for success or a
safe recovery message for failure.
