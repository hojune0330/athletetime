# Task 4 source confirmation and calendar link evidence

## Pinned policy

The existing editorial source-security and publication-policy suites were run before final verification. Confirmed discovery metadata is not inserted into `editorial_sources`; a secondary source remains contextual until the existing issue workflow adds qualifying evidence.

## Boundary and HTTP QA

`backend/tests/editorial-news-discovery-api.test.js` starts a real local HTTP server. It verifies unauthenticated and missing-CSRF denials, exact confirmation payloads, private-IP rejection, successful confirmation, and successful planned-calendar link responses with `Cache-Control: no-store`.

## PostgreSQL coverage

`NEWS-SOURCE-LINK-PG-001` applies migrations in an isolated PostgreSQL schema and verifies confirmation metadata persistence, source-confirmed-only linking, duplicate-calendar rejection, audit events, unchanged `planned` calendar state, and zero automatic `editorial_sources` writes. It is ready for CI but skipped locally when no `TEST_DATABASE_URL` or `DATABASE_URL` is configured.
