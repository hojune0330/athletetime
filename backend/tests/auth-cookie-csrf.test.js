const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const PORT = String(5800 + Math.floor(Math.random() * 500));
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ROOT = path.resolve(__dirname, '../..');

let serverProcess;

function request(method, path, options = {}) {
  return new Promise((resolve, reject) => {
    const payload = options.body ? JSON.stringify(options.body) : null;
    const req = http.request(
      `${BASE_URL}${path}`,
      {
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json' } : {}),
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(options.headers || {}),
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
      },
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
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

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function assertNoSessionTokensInBody(response) {
  const body = response.body || {};
  assert.equal(hasOwn(body, 'accessToken'), false);
  assert.equal(hasOwn(body, 'refreshToken'), false);
}

async function registerAndLogin(label) {
  const unique = `${label}${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const email = `${unique}@example.com`;
  const password = 'Password123!';
  const register = await request('POST', '/api/auth/register', {
    body: {
      email,
      password,
      nickname: unique.slice(0, 10),
    },
  });
  assert.equal(register.status, 201);
  assertNoSessionTokensInBody(register);

  const login = await request('POST', '/api/auth/login', {
    body: { email, password },
  });
  assert.equal(login.status, 200);
  assertNoSessionTokensInBody(login);

  return { email, register, login };
}

async function csrfFor(cookieHeader) {
  const response = await request('GET', '/api/auth/csrf-token', {
    headers: { Cookie: cookieHeader },
  });
  assert.equal(response.status, 200);
  assert.equal(typeof response.body.csrfToken, 'string');
  return {
    token: response.body.csrfToken,
    cookieHeader: appendCookieHeader(cookieHeader, setCookies(response)),
  };
}

test.before(async () => {
  serverProcess = spawn(process.execPath, ['src/server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT,
      NODE_ENV: 'development',
      DATABASE_URL: '',
      JWT_SECRET: 'test-secret-for-auth-cookie-csrf',
      RESEND_API_KEY: '',
      ADMIN_SECRET_KEY: '',
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

test('login issues HttpOnly session cookies and /me accepts cookie auth without Authorization', async () => {
  const { email, login } = await registerAndLogin('cookie');
  const cookies = setCookies(login);

  const accessCookie = findCookie(cookies, 'athletetime_access');
  const refreshCookie = findCookie(cookies, 'athletetime_refresh');

  assert.match(accessCookie, /HttpOnly/i);
  assert.match(accessCookie, /SameSite=Lax/i);
  assert.match(refreshCookie, /HttpOnly/i);
  assert.match(refreshCookie, /SameSite=Lax/i);

  const me = await request('GET', '/api/auth/me', {
    headers: { Cookie: cookieHeaderFrom(cookies) },
  });

  assert.equal(me.status, 200);
  assert.equal(me.body.success, true);
  assert.equal(me.body.user.email, email);
});

test('auth session JSON bodies omit access and refresh tokens', async () => {
  const { register, login } = await registerAndLogin('bodytokens');
  const cookieHeader = cookieHeaderFrom(setCookies(login));
  const csrf = await csrfFor(cookieHeader);

  const refresh = await request('POST', '/api/auth/refresh', {
    headers: {
      Cookie: csrf.cookieHeader,
      'X-CSRF-Token': csrf.token,
    },
  });

  assertNoSessionTokensInBody(register);
  assertNoSessionTokensInBody(login);
  assertNoSessionTokensInBody(refresh);
});

test('auth route source never serializes session tokens into JSON response bodies', () => {
  const source = fs.readFileSync(path.join(ROOT, 'backend/auth/routes.js'), 'utf8');
  const leakingLines = source
    .split(/\r?\n/)
    .filter((line) => /^\s*(accessToken|refreshToken)\s*(?:,|:)/.test(line));

  assert.deepEqual(leakingLines, []);
});

test('csrf hint cookie lasts as long as the refresh session cookie', async () => {
  const { login } = await registerAndLogin('csrfmaxage');
  const cookies = setCookies(login);

  assert.match(findCookie(cookies, 'athletetime_csrf'), /Max-Age=2592000/i);
  assert.match(findCookie(cookies, 'athletetime_refresh'), /Max-Age=2592000/i);
});

test('standalone csrf endpoint issues the long-lived session hint', async () => {
  const response = await request('GET', '/api/auth/csrf-token');
  const cookies = setCookies(response);

  assert.equal(response.status, 200);
  assert.match(findCookie(cookies, 'athletetime_csrf'), /Max-Age=2592000/i);
});

test('cookie authenticated unsafe auth writes require a valid CSRF token', async () => {
  const { login } = await registerAndLogin('csrf');
  const cookieHeader = cookieHeaderFrom(setCookies(login));

  const missingCsrf = await request('POST', '/api/auth/logout', {
    headers: { Cookie: cookieHeader },
  });
  assert.equal(missingCsrf.status, 403);
  assert.equal(missingCsrf.body.code, 'CSRF_REQUIRED');

  const csrf = await csrfFor(cookieHeader);
  const logout = await request('POST', '/api/auth/logout', {
    headers: {
      Cookie: csrf.cookieHeader,
      'X-CSRF-Token': csrf.token,
    },
  });

  assert.equal(logout.status, 200);
  assert.equal(logout.body.success, true);
  assert.match(findCookie(setCookies(logout), 'athletetime_access'), /Max-Age=0/i);
  assert.match(findCookie(setCookies(logout), 'athletetime_refresh'), /Max-Age=0/i);
});

test('malformed cookie encoding is rejected without a server error', async () => {
  const response = await request('POST', '/api/auth/logout', {
    headers: { Cookie: 'athletetime_access=%E0%A4%A' },
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.code, 'CSRF_REQUIRED');
});

test('global unsafe cookie-auth routes require CSRF before route authorization', async () => {
  const { login } = await registerAndLogin('globalcsrf');
  const cookieHeader = cookieHeaderFrom(setCookies(login));

  const missingCsrf = await request('POST', '/api/card-studio/admin/admin/notice/generate', {
    headers: { Cookie: cookieHeader },
    body: { title: 'test', content: 'test' },
  });

  assert.equal(missingCsrf.status, 403);
  assert.equal(missingCsrf.body.code, 'CSRF_REQUIRED');

  const csrf = await csrfFor(cookieHeader);
  const withCsrf = await request('POST', '/api/card-studio/admin/admin/notice/generate', {
    headers: {
      Cookie: csrf.cookieHeader,
      'X-CSRF-Token': csrf.token,
    },
    body: { title: 'test', content: 'test' },
  });

  assert.equal(withCsrf.status, 403);
  assert.notEqual(withCsrf.body.code, 'CSRF_REQUIRED');
});

test('refresh rotates session cookies using refresh cookie without request body token', async () => {
  const { login } = await registerAndLogin('refresh');
  const cookieHeader = cookieHeaderFrom(setCookies(login));
  const csrf = await csrfFor(cookieHeader);

  const refresh = await request('POST', '/api/auth/refresh', {
    headers: {
      Cookie: csrf.cookieHeader,
      'X-CSRF-Token': csrf.token,
    },
  });

  assert.equal(refresh.status, 200);
  assert.equal(refresh.body.success, true);
  assertNoSessionTokensInBody(refresh);
  assert.match(findCookie(setCookies(refresh), 'athletetime_access'), /HttpOnly/i);
  assert.match(findCookie(setCookies(refresh), 'athletetime_refresh'), /HttpOnly/i);
});
