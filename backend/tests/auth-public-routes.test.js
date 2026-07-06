const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const test = require('node:test');

const PORT = String(4700 + Math.floor(Math.random() * 500));
const BASE_URL = `http://127.0.0.1:${PORT}`;

let serverProcess;

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function request(method, path, options = {}) {
  return new Promise((resolve, reject) => {
    const normalized = hasOwn(options, 'body') || hasOwn(options, 'headers')
      ? options
      : { body: options };
    const payload = normalized.body ? JSON.stringify(normalized.body) : null;
    const req = http.request(
      `${BASE_URL}${path}`,
      {
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json' } : {}),
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(normalized.headers || {}),
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          const parsed = raw.length > 0 ? JSON.parse(raw) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function setCookies(response) {
  const value = response.headers['set-cookie'];
  return Array.isArray(value) ? value : value ? [value] : [];
}

function cookieHeaderFrom(setCookieHeaders) {
  return setCookieHeaders.map((cookie) => cookie.split(';')[0]).join('; ');
}

function appendCookieHeader(existingHeader, setCookieHeaders) {
  const next = cookieHeaderFrom(setCookieHeaders);
  return [existingHeader, next].filter(Boolean).join('; ');
}

function findCookie(setCookieHeaders, name) {
  return setCookieHeaders.find((cookie) => cookie.startsWith(`${name}=`)) || '';
}

function assertNoSessionTokensInBody(response) {
  const body = response.body || {};
  assert.equal(hasOwn(body, 'accessToken'), false);
  assert.equal(hasOwn(body, 'refreshToken'), false);
}

async function waitForHealth() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    try {
      const response = await request('GET', '/health');
      if (response.status === 200) {
        return;
      }
    } catch (error) {
      if (error.code !== 'ECONNREFUSED') {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('server did not become healthy');
}

async function registerUser(label) {
  const unique = `${label}${Date.now()}${Math.floor(Math.random() * 10000)}`;
  return request('POST', '/api/auth/register', {
    email: `${unique}@example.com`,
    password: 'Password123!',
    nickname: unique.slice(0, 10),
  });
}

test.before(async () => {
  serverProcess = spawn(process.execPath, ['src/server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT,
      NODE_ENV: 'development',
      DATABASE_URL: '',
      JWT_SECRET: 'test-secret-for-auth-public-routes',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await waitForHealth();
});

test.after(async () => {
  if (!serverProcess || serverProcess.killed) {
    return;
  }

  serverProcess.kill('SIGINT');
  await new Promise((resolve) => {
    serverProcess.once('exit', resolve);
    setTimeout(resolve, 3000);
  });
});

test('register keeps normal users non-admin', async () => {
  const response = await registerUser('reg');

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.user.isAdmin, false);
  assertNoSessionTokensInBody(response);
});

test('refresh rotates valid tokens and rejects malformed tokens', async () => {
  const registered = await registerUser('ref');

  assert.equal(registered.status, 201);
  assertNoSessionTokensInBody(registered);

  const cookieHeader = cookieHeaderFrom(setCookies(registered));
  const csrf = await request('GET', '/api/auth/csrf-token', {
    headers: { Cookie: cookieHeader },
  });
  const refreshed = await request('POST', '/api/auth/refresh', {
    headers: {
      Cookie: appendCookieHeader(cookieHeader, setCookies(csrf)),
      'X-CSRF-Token': csrf.body.csrfToken,
    },
  });
  const malformed = await request('POST', '/api/auth/refresh', {
    body: { refreshToken: 'not-a-jwt' },
  });

  assert.equal(refreshed.status, 200);
  assert.equal(refreshed.body.success, true);
  assertNoSessionTokensInBody(refreshed);
  assert.match(findCookie(setCookies(refreshed), 'athletetime_access'), /HttpOnly/i);
  assert.match(findCookie(setCookies(refreshed), 'athletetime_refresh'), /HttpOnly/i);
  assert.equal(malformed.status, 401);
});

test('serves public categories and marketplace without DATABASE_URL', async () => {
  const categories = await request('GET', '/api/categories');
  const marketplace = await request('GET', '/api/marketplace');

  assert.equal(categories.status, 200);
  assert.ok(Array.isArray(categories.body));
  assert.ok(categories.body.length > 0);
  assert.equal(marketplace.status, 200);
  assert.equal(marketplace.body.success, true);
  assert.ok(Array.isArray(marketplace.body.items));
});
