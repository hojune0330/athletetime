const assert = require('node:assert/strict');
const test = require('node:test');

const { requestLogPath } = require('../../src/requestLogPath');

test('REQUEST-LOG-PATH-001 Given a public record search When it is logged Then the raw name and affiliation query are absent', () => {
  const path = requestLogPath({
    originalUrl: '/api/card-studio/analytics/records/search?q=%EA%B9%80%EA%B5%AD%EC%98%81&affiliation=%EA%B4%91%EC%A3%BC%EC%8B%9C%EC%B2%AD',
  });

  assert.equal(path, '/api/card-studio/analytics/records/search');
  assert.doesNotMatch(path, /q=|affiliation=|%EA%B9%80/u);
});

test('REQUEST-LOG-PATH-002 Given a data-rights receipt lookup When it is logged Then its opaque ticket is redacted', () => {
  const path = requestLogPath({
    originalUrl: '/api/card-studio/data-requests/DR-2026-secret-ticket?retry=1',
  });

  assert.equal(path, '/api/card-studio/data-requests/[redacted]');
  assert.doesNotMatch(path, /DR-2026-secret-ticket|retry/u);
});

test('REQUEST-LOG-PATH-003 Given a public athlete detail request When it is logged Then its internal key is redacted', () => {
  const path = requestLogPath({
    originalUrl: '/api/card-studio/analytics/athletes/athlete_internal_key?from=records',
  });

  assert.equal(path, '/api/card-studio/analytics/athletes/[redacted]');
  assert.doesNotMatch(path, /athlete_internal_key|from=/u);
});

test('REQUEST-LOG-PATH-004 Given a request has no original URL When it is logged Then the fallback path still omits a query', () => {
  const path = requestLogPath({
    baseUrl: '/api/card-studio',
    path: '/analytics/records/search',
  });

  assert.equal(path, '/api/card-studio/analytics/records/search');
});
