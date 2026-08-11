const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const test = require('node:test');
const { createEmailRateLimiter } = require('../middleware/authRateLimit');

const PORT = String(5800 + Math.floor(Math.random() * 500));
const BASE_URL = `http://127.0.0.1:${PORT}`;
const GENERIC_RATE_LIMIT_MESSAGE = '보안을 위해 잠시 후 다시 시도해 주세요.';

let serverProcess;
const serverLogs = [];

function request(method, requestPath, body, ip) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      `${BASE_URL}${requestPath}`,
      {
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json' } : {}),
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(ip ? { 'X-Forwarded-For': ip } : {}),
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
    if (payload) req.write(payload);
    req.end();
  });
}

function register(body, ip) {
  return request('POST', '/api/auth/register', body, ip);
}

function registrationBody(email, nickname) {
  return {
    email,
    password: 'Password123!',
    nickname,
  };
}

function createResponse() {
  return {
    statusCode: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json() {
      return this;
    },
    setHeader() {},
  };
}

function waitForServerStartup() {
  return new Promise((resolve, reject) => {
    const expectedStartupLine = `Port: ${PORT}`;
    const timeout = setTimeout(() => {
      serverProcess.off('exit', onExit);
      reject(new Error(`server did not start: ${serverLogs.join('\n')}`));
    }, 30000);

    function onOutput(chunk) {
      serverLogs.push(chunk.toString('utf8'));
      if (serverLogs.join('').includes(expectedStartupLine)) {
        clearTimeout(timeout);
        serverProcess.off('exit', onExit);
        resolve();
      }
    }

    function onExit(code, signal) {
      clearTimeout(timeout);
      reject(new Error(`server exited before startup (code ${code}, signal ${signal}): ${serverLogs.join('\n')}`));
    }

    serverProcess.stdout.on('data', onOutput);
    serverProcess.stderr.on('data', onOutput);
    serverProcess.once('exit', onExit);
  });
}

function stopServer() {
  if (!serverProcess || serverProcess.exitCode !== null) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      serverProcess.kill('SIGKILL');
      reject(new Error('server did not stop after SIGINT'));
    }, 3000);

    serverProcess.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    serverProcess.kill('SIGINT');
  });
}

function assertGenericRateLimit(response, identifier) {
  assert.equal(response.status, 429);
  assert.deepEqual(Object.keys(response.body).sort(), ['error', 'retryAfter', 'success']);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error, GENERIC_RATE_LIMIT_MESSAGE);
  assert.equal(typeof response.body.retryAfter, 'number');
  assert.ok(response.body.retryAfter > 0);
  assert.equal(response.headers['retry-after'], String(response.body.retryAfter));
  assert.doesNotMatch(JSON.stringify(response.body), new RegExp(identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(JSON.stringify(response.body), /(stack|nickname|user|email|id)/i);
}

test.before(async () => {
  serverProcess = spawn(process.execPath, ['src/server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT,
      NODE_ENV: 'development',
      DATABASE_URL: '',
      JWT_SECRET: 'test-secret-for-auth-registration-rate-limit',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await waitForServerStartup();
});

test.after(async () => {
  await stopServer();
});

test('Given an exhausted email limiter When its window expires Then the next registration attempt starts a fresh window', () => {
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;

  try {
    const limit = createEmailRateLimiter({ windowMs: 60_000, max: 1, message: GENERIC_RATE_LIMIT_MESSAGE });
    const request = { body: { email: 'lifecycle@example.com' } };
    let nextCount = 0;

    limit(request, createResponse(), () => { nextCount += 1; });
    limit(request, createResponse(), () => { nextCount += 1; });
    now += 60_000;
    limit(request, createResponse(), () => { nextCount += 1; });

    assert.equal(nextCount, 2);
  } finally {
    Date.now = originalNow;
  }
});

test('Given a normal registration payload When it is below the threshold Then registration behavior remains unchanged', async () => {
  const response = await register(
    registrationBody('registration-normal@example.com', 'normaluser'),
    '198.51.100.10',
  );

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.user.email, 'registration-normal@example.com');
});

test('Given repeated equivalent emails When registration exceeds three attempts Then the fourth response is generic 429', async () => {
  const email = 'registration-retry@example.com';
  const ip = '198.51.100.11';

  const first = await register(registrationBody(email, 'retryuser'), ip);
  const second = await register(registrationBody(email.toUpperCase(), 'retryuser'), ip);
  const third = await register(registrationBody(email, 'retryuser'), ip);
  const blocked = await register(registrationBody(email.toUpperCase(), 'retryuser'), ip);

  assert.equal(first.status, 201);
  assert.equal(second.status, 400);
  assert.equal(third.status, 400);
  assertGenericRateLimit(blocked, email);
});

test('Given one IP and varying emails When registration exceeds twenty attempts Then the twenty-first response is generic 429', async () => {
  const ip = '198.51.100.12';
  const accepted = await Promise.all(
    Array.from({ length: 20 }, (_, index) => register(
      registrationBody(`registration-ip-${index}@example.com`, `ipuser${index}`),
      ip,
    )),
  );
  const blocked = await register(
    registrationBody('registration-ip-over-limit@example.com', 'iplimit'),
    ip,
  );

  assert.ok(accepted.every((response) => response.status === 201));
  assertGenericRateLimit(blocked, 'registration-ip-over-limit@example.com');
});

test('Given an invalid registration payload When it is below the threshold Then validation remains a 400 response', async () => {
  const response = await register({ email: 'not-an-email', password: 'Password123!', nickname: 'invaliduser' }, '198.51.100.13');

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});
