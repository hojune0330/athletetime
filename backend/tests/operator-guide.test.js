const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const test = require('node:test');

const PORT = String(5200 + Math.floor(Math.random() * 500));
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ADMIN_EMAIL = `operator-admin-${Date.now()}@example.com`;
const ADMIN_PASSWORD = 'Password123!';

let serverProcess;

const REQUIRED_SCENARIOS = [
  'athlete_guardian_request',
  'same_name_identity_complaint',
  'full_deletion_demand',
  'source_owner_complaint',
  'legal_notice',
  'media_inquiry',
  'community_harassment',
  'security_abuse',
];

const REQUIRED_STATES = [
  'routine',
  'rights_request',
  'source_legal_complaint',
  'security_abuse',
  'breach_suspicion',
];

const FORBIDDEN_GUIDE_TERMS = [
  'person_no',
  'birthdate',
  'admin_token',
  'ADMIN_TOKEN',
  '무조건 합법',
  'AI 검증',
  '2차 창작',
];

const PUBLIC_LEAK_TERMS = [
  'source_legal_complaint',
  'breach_suspicion',
  '법적 통지',
  '보안 사고 등급',
  '공격 대응',
  '관리자 계정',
  '증거 보존 체크리스트',
  '침해 의심',
];

function request(method, requestPath, options = {}) {
  return new Promise((resolve, reject) => {
    const payload = options.body ? JSON.stringify(options.body) : null;
    const req = http.request(
      `${BASE_URL}${requestPath}`,
      {
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json' } : {}),
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          ...(options.cookieHeader ? { Cookie: options.cookieHeader } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let body = null;
          try {
            body = raw.length > 0 ? JSON.parse(raw) : null;
          } catch {
            body = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, body, raw });
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

function setCookies(response) {
  const value = response.headers['set-cookie'];
  return Array.isArray(value) ? value : value ? [value] : [];
}

function cookieHeaderFrom(setCookieHeaders) {
  return setCookieHeaders.map((cookie) => cookie.split(';')[0]).join('; ');
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
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
  const response = await request('POST', '/api/auth/register', {
    body: {
      email: `${unique}@example.com`,
      password: 'Password123!',
      nickname: unique.slice(0, 10),
    },
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assertNoSessionTokensInBody(response);
  return cookieHeaderFrom(setCookies(response));
}

async function loginAdmin() {
  const response = await request('POST', '/api/auth/login', {
    body: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.user.isAdmin, true);
  assertNoSessionTokensInBody(response);
  return cookieHeaderFrom(setCookies(response));
}

test.before(async () => {
  serverProcess = spawn(process.execPath, ['src/server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT,
      NODE_ENV: 'development',
      DATABASE_URL: '',
      JWT_SECRET: 'test-secret-for-operator-guide',
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
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

test('operator guide admin API enforces 401, 403, and admin-only 200', async () => {
  const unauthenticated = await request('GET', '/api/card-studio/admin/operator-guide');
  assert.equal(unauthenticated.status, 401);

  const legacyAliasUnauthenticated = await request('GET', '/api/operator-guide');
  assert.equal(legacyAliasUnauthenticated.status, 401);
  assert.equal(legacyAliasUnauthenticated.raw.includes('internal_operator'), false);

  const normalUserCookieHeader = await registerUser('opuser');
  const forbidden = await request('GET', '/api/card-studio/admin/operator-guide', {
    cookieHeader: normalUserCookieHeader,
  });
  assert.equal(forbidden.status, 403);

  const adminCookieHeader = await loginAdmin();
  const allowed = await request('GET', '/api/card-studio/admin/operator-guide', {
    cookieHeader: adminCookieHeader,
  });

  assert.equal(allowed.status, 200);
  assert.match(allowed.headers['cache-control'] || '', /no-store/);
  assert.equal(allowed.body.success, true);

  const guide = allowed.body.data;
  assert.equal(guide.audience, 'internal_operator');
  assert.equal(typeof guide.version, 'string');
  assert.match(guide.disclaimer, /법률 자문이 아니/);
  assert.ok(Array.isArray(guide.scenarios));
  assert.ok(Array.isArray(guide.escalationStates));
  assert.ok(guide.publicBoundary);

  const scenarioIds = guide.scenarios.map((scenario) => scenario.id);
  for (const required of REQUIRED_SCENARIOS) {
    assert.ok(scenarioIds.includes(required), `missing scenario: ${required}`);
  }

  const stateIds = guide.escalationStates.map((state) => state.id);
  for (const required of REQUIRED_STATES) {
    assert.ok(stateIds.includes(required), `missing escalation state: ${required}`);
  }

  const guideText = JSON.stringify(guide);
  for (const forbiddenTerm of FORBIDDEN_GUIDE_TERMS) {
    assert.equal(
      guideText.includes(forbiddenTerm),
      false,
      `operator guide must not contain forbidden term: ${forbiddenTerm}`,
    );
  }
});

test('public data policy API does not leak internal operator runbook details', async () => {
  const response = await request('GET', '/api/card-studio/data-policy');

  assert.equal(response.status, 200);
  const responseText = JSON.stringify(response.body);

  for (const leakTerm of PUBLIC_LEAK_TERMS) {
    assert.equal(
      responseText.includes(leakTerm),
      false,
      `public data policy leaked internal term: ${leakTerm}`,
    );
  }
});
