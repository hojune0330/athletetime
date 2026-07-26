# Task 3 red/green evidence

## Red

`NEWS-API-001` initially failed because the test harness parsed an unauthenticated plain-text `401 Unauthorized` response as JSON. The failing error was `Unexpected token 'U'`.

`NEWS-RUNTIME-005` and `NEWS-RUNTIME-006` then failed because quota exhaustion and missing credentials were both collapsed into `partial_failure`.

The route contract tests failed with `404` after pinning the planned singular run endpoint, run-history endpoint, and dedicated review actions. The arbitrary-input test also showed that the original route had no exact-body boundary.

## Green

The helper now parses response bodies only when their content type is JSON. Provider failures use bounded safe codes without persisting raw messages. The administrator API now matches the plan contract and rejects arbitrary run input.

The final focused suite passed on 2026-07-26:

```text
tests 49
pass 45
fail 0
skipped 4 (TEST_DATABASE_URL/DATABASE_URL unavailable)
```

The skipped PostgreSQL cases are retained as integration coverage and exercise isolated schema application, two-worker locking, idempotent completion, state transitions, 90-day discovery purge, 13-month run retention, audit ordering, and rollback when a test database URL is supplied.
