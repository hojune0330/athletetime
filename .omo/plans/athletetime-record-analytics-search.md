# AthleteTime Record Analytics Search Plan

## Status
- Claude/Genspark discussion: completed 2 rounds.
- Codex gap review: completed.
- Implementation decision: build V1 around two visible surfaces only.

## V1 Product Decision
- Visible menu 1: `내 기록 한눈에`
- Visible menu 2: `시즌 기록표`
- Embedded section: `기록 발자취`
- Embedded comparison: `내 위치 하이라이트`
- Deferred: direct athlete-vs-athlete compare basket, all-time ranking UI, predictive/AI evaluation copy.

## Core Principle
AthleteTime should feel like a clean record search engine, not an official ranking authority.

Every ranking-like output must be framed as:
- `AthleteTime에 색인된 공개 경기 결과 기준`
- `공식 기록 서비스가 아닙니다`
- `수집 시점과 출처 기준`

## Data Baseline
- Years: 2018-2026
- Competitions: 230
- Events: 9,578
- Result rows: 91,004
- Rows with records: 64,712

## V1 Metrics
- Indexed best record
- Season indexed best
- Latest valid mark
- Delta between first/latest comparable marks
- Count of indexed results
- Record trail chart points
- Season table position after athlete disambiguation

## Safety Rules
- Do not auto-open the first result for ambiguous name searches.
- Do not auto-merge athletes across teams/seasons without evidence.
- Show `동명이인 가능` or affiliation chips when confidence is low.
- Exclude suppressed/masked/removed records from every analytics surface.
- Do not use copy implying official rank, ability, potential, slump, injury, recruitment, or future performance.

## Technical Plan

### 1. Normalized Record Index
- Add a backend service that reads all result data and produces full indexed records.
- Canonical keys:
  - `athleteKey`
  - `athleteName`
  - `team`
  - `season`
  - `competitionId`
  - `eventKey`
  - `eventLabel`
  - `divisionKey`
  - `phase`
  - `recordValue`
  - `recordDisplay`
  - `direction`
  - `wind`
  - `windLegal`
  - `isComparable`
  - `source`
  - `suppressionState`
- Unmapped events remain visible in raw record history but are excluded from season tables.

### 2. Comparability Rules
- Track events: lower is better.
- Field events: higher is better.
- Season table includes only comparable records.
- Record trail can include all valid marks, but points with uncertain comparability must be labeled.
- DQ/DNS/DNF/NM/empty records are excluded from metrics.
- Wind-aware events require legal wind when wind data exists.

### 3. API Surface
- `GET /analytics/records/search?q=...`
  - Returns selectable athlete cards, not direct page redirects.
- `GET /analytics/athletes/:athleteKey`
  - Returns summary cards, record trail, events, provenance, ambiguity warnings.
- `GET /analytics/season-records?season=&eventKey=&divisionKey=&athleteKey=`
  - Returns season table rows, denominator, filters, tie-safe ranks, and optional highlighted athlete.

### 4. Frontend Surface
- Add `/records`.
- Search-first hero with two actions:
  - `내 기록 한눈에`
  - `시즌 기록표`
- Athlete result cards show name, team, years, events, and ambiguity warning.
- Athlete detail shows:
  - indexed best
  - season best
  - latest record
  - indexed result count
  - `기록 발자취` chart
  - source/disclaimer/correction link
- Season table shows:
  - season selector
  - event selector
  - division selector
  - indexed denominator
  - source/disclaimer
  - optional `내 위치 하이라이트`

## Acceptance Criteria
- A user can search an athlete name and choose from ambiguous matches.
- A selected athlete can see factual record stats without official-ranking wording.
- A selected athlete can see a simple `기록 발자취` graph.
- A user can open a season record table for one canonical event/division.
- Suppressed or removed results do not appear in search, charts, or tables.
- Every record-heavy surface links to correction/de-index request flow.
- Korean copy renders correctly and avoids banned implication words.

## Implementation Order
1. Build backend normalized analytics service.
2. Add analytics routes.
3. Add frontend API client.
4. Add `/records` page and route.
5. Add navigation entry if existing layout supports it.
6. Verify with build and smoke tests.

## Notes For Later
- Direct compare basket can return in phase 2 only with clear anti-harassment copy and max-three selection.
- All-time ranking can return later as `공개 기록표 beta`, never as `역대 랭킹` in V1.
- Logged-in personalization can later rename the experience from public search-first to true `내 기록`.
