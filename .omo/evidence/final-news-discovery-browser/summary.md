# F3 Administrator UX QA: NAVER News Discovery

- Date: 2026-07-26
- Branch: `codex/naver-news-discovery`
- Verdict: **PASS**

## Responsive Retest

The initial 390x844 run found horizontal overflow because the administrator
layout's main flex child could not shrink. The fix adds `min-w-0` at
`frontend/src/components/layout/AdminLayout.tsx:166`.

Mobile, 390x844:

- Document: `clientWidth=382`, `scrollWidth=382`
- Main: `left=0`, `right=382.4`, `clientWidth=382`, `scrollWidth=382`
- News inbox: `left=16`, `right=366.4`, `clientWidth=349`, `scrollWidth=349`
- Long headline: `clientWidth=216`, `scrollWidth=216`, `height=340`
- Result: no page or headline horizontal overflow

Desktop, 1440x900:

- Document: `clientWidth=1432`, `scrollWidth=1432`
- Main: `left=240`, `right=1432`, `clientWidth=1192`, `scrollWidth=1192`
- News inbox: `left=264`, `right=1408`, `width=1144`
- Long headline: `clientWidth=993`, `scrollWidth=993`, `height=80`
- Result: no horizontal overflow

The red-first responsive contract passed 13/13, including
`NEWS-INBOX-UI-007`.

## Interactive Workflow

The protected React administrator page ran at
`http://127.0.0.1:5199/admin/content/magazine` with a stateful local API
fixture. No real administrator account, PostgreSQL data, NAVER key, or live
provider call was used.

1. Opened the protected editor through a local session fixture.
2. Confirmed the missing-credentials state is displayed safely.
3. Confirmed a filter with no matches displays the empty state.
4. Returned HTTP 200 with a failed `quota_exceeded` run and verified the UI
   displayed failure rather than success.
5. Injected a delayed provider failure and verified the run action stayed
   single-flight and displayed partial failure.
6. Completed review, original-source confirmation, and calendar linking for a
   long-title discovery. Calendar linking remained disabled before source
   confirmation.
7. Confirmed an empty dismissal reason made no API request, while a valid
   reason completed dismissal.
8. Repeated an invalid transition and received HTTP 409.
9. Submitted a manual run with an arbitrary `query` field and received HTTP
   400.

Final fixture state:

```json
{"RunClicks":2,"ActionCalls":4,"LongStatus":"calendar_linked","ExcludedStatus":"dismissed","RepeatStatus":409,"MalformedRunStatus":400}
```

## Automated Verification

Focused browser-adjacent and discovery suite:

- 62 passed
- 0 failed
- 0 skipped

`npm.cmd run test:editorial-news-discovery`:

- 30 passed
- 0 failed
- 9 PostgreSQL-only skips

PostgreSQL atomicity/runtime/migration group:

- 3 passed
- 0 failed
- 9 PostgreSQL-only skips

The focused coverage included malformed input, missing credentials, disabled
collector, 401/403/429, provider retry/failure, oversized and malformed
responses, bounded timeout, long titles, quota exhaustion, stale quota reset,
idempotent runs, source-input bounds, fail-closed response parsing, and
single-flight UI behavior.

## Screenshots

- `admin-news-mobile-390x844.png`
- `admin-news-mobile-final-390x844.png`
- `admin-news-desktop-1440x900.png`

## Limitations

- No local PostgreSQL URL was available. The real concurrency, retention,
  optimistic stale-calendar, and migration cases are covered by the green PR
  PostgreSQL CI rather than this browser fixture.
- No real NAVER credentials or live provider call was used, and no live pilot
  is claimed.
- No real administrator account was used. Authentication, authorization,
  CSRF, and no-store behavior were covered by executable HTTP tests.
- Temporary fixture files were removed. QA processes stopped and ports 5199
  and 3005 were verified released.
