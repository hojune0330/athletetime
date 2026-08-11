const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function invoke(limiter, ip) {
  const headers = {};
  let body = null;
  let statusCode = 200;
  let nextCalled = false;
  const response = {
    setHeader(name, value) {
      headers[name.toLowerCase()] = String(value);
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };

  limiter({ ip, headers: {}, socket: {} }, response, () => {
    nextCalled = true;
  });

  return { body, headers, nextCalled, statusCode };
}

test('Given a data-rights submission route When its middleware is read Then only POST uses the dedicated limiter', () => {
  const source = fs.readFileSync(path.join(ROOT, 'card-studio/routes/publicRoutes.js'), 'utf8');

  // Given the public routes expose both write and read ticket paths.
  // When the route declarations are inspected.
  // Then a write uses its dedicated limiter and a status read remains generally readable.
  assert.match(source, /\{[^}]*dataRequestLimiter[^}]*\}\s*=\s*require\('\.\.\/middleware\/rateLimiter'\)/s);
  assert.match(source, /router\.post\('\/data-requests', dataRequestLimiter, async \(req, res\)/);
  assert.match(source, /dataRequestService\.submitPublicRequest\(req\.body \|\| \{\}\)/);
  assert.doesNotMatch(source, /dataRequestService\.submitRequest\(req\.body \|\| \{\}\)/);
  assert.match(source, /router\.get\('\/data-requests\/:ticketId', publicLimiter, async \(req, res\)/);
});

test('Given repeated data-rights submissions When the sixth request arrives Then it is stopped before validation', () => {
  const { dataRequestLimiter, publicLimiter } = require('../../card-studio/middleware/rateLimiter');
  const ip = `203.0.113.${(process.pid % 200) + 1}`;

  // Given five prior requests from the same public address.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const allowed = invoke(dataRequestLimiter, ip);
    assert.equal(allowed.nextCalled, true);
  }

  // When a sixth request is made in the same hour.
  const denied = invoke(dataRequestLimiter, ip);

  // Then the write is rate limited with the established JSON error shape and no-store header.
  assert.equal(denied.nextCalled, false);
  assert.equal(denied.statusCode, 429);
  assert.equal(denied.body.success, false);
  assert.equal(typeof denied.body.error, 'string');
  assert.equal(Number(denied.body.retryAfter) > 0, true);
  assert.equal(denied.headers['cache-control'], 'no-store');
  assert.equal(denied.headers['x-ratelimit-limit'], '5');

  // And the status lookup limiter remains the less restrictive public-read policy.
  const publicRead = invoke(publicLimiter, ip);
  assert.equal(publicRead.nextCalled, true);
  assert.equal(publicRead.headers['x-ratelimit-limit'], '60');
});
