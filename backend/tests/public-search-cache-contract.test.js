const assert = require('node:assert/strict');
const test = require('node:test');

const { searchLimiter } = require('../../card-studio/middleware/rateLimiter');

function invokeSearchLimiter(ip) {
  const headers = {};
  let nextCalled = false;
  searchLimiter(
    { ip, headers: {}, socket: {} },
    {
      setHeader(name, value) {
        headers[name.toLowerCase()] = String(value);
      },
      status() {
        return this;
      },
      json() {},
    },
    () => {
      nextCalled = true;
    },
  );
  return { headers, nextCalled };
}

test('PUBLIC-SEARCH-CACHE-001: name and team search responses are never stored in a shared cache', () => {
  const result = invokeSearchLimiter(`search-cache-contract-${process.pid}-${Date.now()}`);

  assert.equal(result.nextCalled, true);
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.equal(result.headers['x-ratelimit-limit'], '30');
});
