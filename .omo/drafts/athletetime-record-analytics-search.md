# Draft: AthleteTime Record Analytics Search Planning

## Requirements (confirmed)
- User wants to assess and plan whether athletes can search their own or others' records with statistics, numeric changes, graphs, event grouping, season rankings, and all-time rankings.
- User asked to discuss with Claude twice and incorporate both perspectives.
- Use ulw-plan; planning only, no source-code implementation.

## Technical Decisions
- Treat as Architecture tier: data model, backend APIs, frontend UX, ranking math, privacy/legal guardrails, and QA all interact.
- Current repo already has `data/results/<year>.json`, `resultsStore`, `insightService`, `/insights/athlete/:id`, and `/competitions` search/result views.
- MVP should likely build a normalized record index first, not jump straight to UI charts.

## Research Findings
- Dataset: 2018-2026, 230 competitions, 9,578 events, 91,004 result rows, 64,712 rows with record values.
- Current athlete profile identity is `name|team`, producing many fragments when affiliation changes.
- Existing insight parsing handles basic lower/higher direction but event normalization and age/division classification are incomplete.
- Existing UI already has athlete detail and correction/de-index policy, so analytics must inherit `search_hidden` and provenance guardrails.
- Metis review: v1 must avoid misleading owner language if no verified login exists; use public search-first framing.
- Metis review: event/division/condition normalization is a v1 gate; unmapped events can remain in raw lists but must not enter rankings.
- Metis review: season tables need explicit denominator, tie handling, wind/legal badges, source metadata, and de-index exclusions.
- Metis review: current 12-record profile summaries cannot support full 2018-2026 trends; analytics needs a full normalized index plus compact UI summaries.

## Claude Exchanges
- Round 1 request sent through Genspark Chrome tab.
- Chrome/Genspark input workaround documented in `.omo/drafts/genspark-chrome-input-method.md`.
- Round 1 response received:
  - Main user is likely student athletes and their parents/coaches because school divisions dominate the dataset.
  - Strongest shareable content is not ranking but "my PB / my record change / my growth card".
  - Ranking should be narrowed by event + division + season + condition and named "record table" or "public record top", not "official ranking".
  - First screen should be one search box + three large buttons: my record, event view, season records.
  - Copy must say "collected public records, not official ranking"; avoid predictions/evaluations.
- Round 2 request sent: asked Claude to critique Codex's proposed MVP architecture and choose first release framing.
- Round 2 response received:
  - Codex architecture is sound, but exposing four screens at launch is too much for student athletes.
  - Keep the system broad internally, but expose it as a "1+3" structure: one main athlete record home with three internal sections.
  - First visible release should feel like only two menus: `내 기록 한눈에` and `시즌 기록표`.
  - Growth graph should not be a separate menu; embed it inside athlete record home as `기록 발자취`.
  - Season ranking/table should be called `시즌 기록표`, not official/national ranking.
  - Direct compare basket should be deferred to phase 2 because it has the highest minor-safety and teasing/misuse risk.
  - V1 can still provide indirect comparison through `시즌 기록표` with `내 위치 하이라이트`.
  - All-time ranking should be hidden in v1; later it may return as `공개 기록표 beta`.
  - Launch copy candidates: "내 기록, 1초가 어떻게 줄었는지 보여드려요.", "작년의 나 vs 올해의 나, 기록으로 확인하세요.", "전국 대회에 흩어진 내 기록, 한 곳에 모았어요."

## Open Questions
- Resolved: start with public search-first `내 기록 한눈에`; logged-in personalization can be layered later.
- Resolved: hide all-time rankings in v1; do not use official-looking naming.
- Resolved: do not aggressively auto-merge same-name athletes across affiliations in v1; show a chooser when names collide.

## Scope Boundaries
- INCLUDE: feasibility assessment, product UX, data model, API plan, analytics/ranking math, privacy/search_hidden, QA plan.
- EXCLUDE: source-code implementation during this planning turn.
- EXCLUDE V1: direct compare basket, official/national ranking language, all-time ranking UI, AI evaluation/prediction of athlete quality.

## Final Plan Target
- Plan file: `.omo/plans/athletetime-record-analytics-search.md`
- Decision: implement a v1 record analytics MVP with two visible menus only: `내 기록 한눈에` and `시즌 기록표`.
- Decision: `기록 발자취` is an embedded section, not a nav item.
- Decision: use `내 위치 하이라이트` as indirect comparison after athlete disambiguation, not a direct compare basket.
