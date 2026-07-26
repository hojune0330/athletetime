# Task 2 verification summary

## Result

- NAVER API HUB client uses the fixed API gateway endpoint and server-only credentials.
- The fixed v1 query profile rejects arbitrary queries and allows only pages 1 and 101.
- Daily 40-call and monthly 800-call budgets fail closed before transport.
- HTTP 401, 403, and 429 are not retried. Timeout and 5xx retry once.
- Parser output excludes `description`, raw response fields, credentials, and unknown fields.
- The normalizer keeps only canonical URL hash, safe URLs, sanitized title, and publication time.
- Relevance scoring uses all fixed query profile keys and a fixed tag allowlist.
- Empty titles and normalized URLs over 2048 characters are rejected before persistence.
- Frontend source contains no NAVER credential environment or header names.

## Verification

- Focused boundary suite: 28 passed, 0 failed.
- Community editorial suite: 165 passed, 29 skipped, 0 failed.
- Full repository suite, run alone: 424 passed, 35 skipped, 0 failed.
- Frontend type-check: passed.
- Frontend production build: passed.
- `git diff --check`: passed.
- Each production module remains below 250 pure lines.

The first full-suite run was incorrectly parallelized with another server-starting suite and
produced local port contention. The same full suite passed when rerun alone. This was an
execution-environment collision, not a product regression.

## Adversarial coverage

- Missing and malformed credentials fail before transport.
- Malformed, oversized, and hung responses are bounded.
- Prompt-like title and description text cannot alter query selection or relevance tags.
- Unsafe URL schemes, credentials, loopback literals, empty titles, invalid dates, and oversized
  URLs are rejected.
- Tracking parameters and fragments do not create duplicate hashes.
- Similar titles with different canonical URLs are never auto-merged.
- API secrets and article descriptions are absent from DTOs, persistence payloads, and frontend
  source.

## Cleanup

- No live API request was made.
- No credentials were created or stored.
- No local service or port remains open.
- The records-flow E2E evidence file modified by the full suite was restored byte-for-byte.

## Known deployment blocker outside Task 2

`npm audit --omit=dev` still reports 12 production dependency advisories: 5 high and 7 moderate.
They predate this task and require a separate security upgrade PR before public deployment.
