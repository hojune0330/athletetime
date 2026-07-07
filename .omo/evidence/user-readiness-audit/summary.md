# User Readiness Audit: Athlete History / Performance Search

Date: 2026-07-07

## Question

Can AthleteTime feel acceptable to real athletes, parents, teams, and operators when compared with:

- KAAF athlete history lookup style usage.
- KSOC sports support portal athlete activity / performance certificate expectations.

## Current Local Coverage

- Stored result range: 2018-2026.
- Public indexed competitions after life-sport exclusion: 207.
- Public indexed events after quality hold: 7,836.
- Public visible result rows after quality hold: 79,838.

## Key Finding

The service must not claim official certificate or full athlete-history coverage yet.

Why:

- The local structured result set starts at 2018, not 2000.
- Source URL / captured-at provenance is still missing for existing structured result competitions.
- Same-name separation is intentionally conservative and cannot replace official registered-athlete identity.

## Fixed In This Round

Before the patch, combined events such as 10-event / 7-event tables could expose numeric scores as athlete names.

Example unsafe stored row:

- Competition: `2018__2018-track_field-001.json`
- Event: `13 10종경기 결승`
- Stored name: `5390`
- Stored affiliation: `이리공업고등학교`

This is now held at the public adapter layer:

- `tableType`: `combined`
- `resultsStatus`: `source_reverify_needed`
- `qualityMessage`: `기록 확인 중이에요`
- `results`: `[]`

The original data remains stored for source recheck.

## Public Adapter Audit After Patch

```json
{
  "competitions": 207,
  "events": 7836,
  "rows": 79838,
  "heldEvents": 244,
  "heldRows": 1730,
  "pollutedVisibleRows": 0,
  "combinedHeldEvents": 208,
  "relayHeldEvents": 36
}
```

## Search Smoke Results

- `심종섭`: 26 matches, 3 event groups.
- `한세현`: 10 matches, 1 event group.
- `김민지`: 39 matches, 8 event groups.

Regression added: numeric military affiliations such as `전라남도-제5295부대` must not be treated as polluted rows.

## Validation

- `node --test backend/tests/relay-results-standard.test.js`: 8/8 pass.
- `npm test`: 158/158 pass.
- `git diff --check`: pass.

## Decision

Acceptable positioning for launch:

> Public record index and athlete self-check surface.

Not acceptable positioning yet:

> Official athlete history, official ranking, or performance certificate replacement.

## Next Blockers

1. Backfill source ledger URLs / file names for every structured result competition.
2. Continue collecting 2000-2017 official result files before any "old-to-current" claim.
3. Reparse held combined / relay events from original PDF/XLS/HTML sources.
4. Add UI copy that says held events are preserved but hidden until source recheck.
