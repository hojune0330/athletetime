const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const PORT = String(5200 + Math.floor(Math.random() * 500));
const BASE_URL = `http://127.0.0.1:${PORT}`;
const RESET_SENT_BODY = {
  success: true,
  message: '인증 코드가 발송되었습니다',
};

let serverProcess;
const serverLogs = [];

function request(method, requestPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      `${BASE_URL}${requestPath}`,
      {
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json' } : {}),
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
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
          resolve({ status: res.statusCode, body: parsed });
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

function rawRequest(method, requestPath, payload) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `${BASE_URL}${requestPath}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
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
          resolve({ status: res.statusCode, body: parsed });
        });
      },
    );

    req.on('error', reject);
    req.write(payload);
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

async function registerUser(label) {
  const unique = `${label}${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const email = `${unique}@example.com`;
  const response = await request('POST', '/api/auth/register', {
    email,
    password: 'Password123!',
    nickname: unique.slice(0, 10),
  });

  assert.equal(response.status, 201);
  return { email, response };
}

function allServerLogs() {
  return serverLogs.join('\n');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.before(async () => {
  serverProcess = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT,
      NODE_ENV: 'development',
      DATABASE_URL: '',
      JWT_SECRET: 'test-secret-for-auth-security-readiness',
      RESEND_API_KEY: '',
      ADMIN_SECRET_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (chunk) => {
    serverLogs.push(chunk.toString('utf8'));
  });
  serverProcess.stderr.on('data', (chunk) => {
    serverLogs.push(chunk.toString('utf8'));
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

test('startup logs do not expose the generated development admin password', () => {
  assert.doesNotMatch(
    allServerLogs(),
    /임시 관리자 비밀번호가 생성되었습니다\s*\([^)]*\):\s*\S+/,
  );
});

test('forgot password does not reveal whether an email is registered', async () => {
  const { email } = await registerUser('reset');
  const unknownEmail = `missing${Date.now()}${Math.floor(Math.random() * 10000)}@example.com`;

  const registered = await request('POST', '/api/auth/forgot-password', { email });
  const unknown = await request('POST', '/api/auth/forgot-password', { email: unknownEmail });

  assert.equal(registered.status, 200);
  assert.equal(unknown.status, 200);
  assert.deepEqual(registered.body, RESET_SENT_BODY);
  assert.deepEqual(unknown.body, RESET_SENT_BODY);
});

test('verification and reset requests do not print one-time codes to server logs', async () => {
  const verificationEmail = `verify${Date.now()}${Math.floor(Math.random() * 10000)}@example.com`;
  const { email: resetEmail } = await registerUser('code');

  const verification = await request('POST', '/api/auth/send-verification', {
    email: verificationEmail,
  });
  const reset = await request('POST', '/api/auth/forgot-password', {
    email: resetEmail,
  });

  assert.equal(verification.status, 200);
  assert.equal(reset.status, 200);

  const logs = allServerLogs();
  assert.doesNotMatch(logs, new RegExp(`${escapeRegExp(verificationEmail)}\\s*->\\s*\\d{6}`));
  assert.doesNotMatch(logs, new RegExp(`${escapeRegExp(resetEmail)}\\s*->\\s*\\d{6}`));
  assert.doesNotMatch(logs, /\b\d{6}\b/);
  assert.doesNotMatch(logs, /\[DEV\].*\b\d{6}\b/);
  assert.doesNotMatch(logs, /인증 코드:\s*\d{6}/);
});

test('malformed auth JSON does not leak raw request bodies or passwords to logs', async () => {
  const sentinelPassword = `SENTINEL_PASSWORD_DO_NOT_LOG_${Date.now()}`;
  const malformedBody = `{"email":"malformed@example.com","password":"${sentinelPassword}",`;

  const response = await rawRequest('POST', '/api/auth/register', malformedBody);

  assert.equal(response.status, 400);
  assert.doesNotMatch(JSON.stringify(response.body), new RegExp(escapeRegExp(sentinelPassword)));
  assert.doesNotMatch(allServerLogs(), new RegExp(escapeRegExp(sentinelPassword)));
  assert.doesNotMatch(allServerLogs(), /body:\s*['"]/);
});

test('set-admin is disabled unless ADMIN_SECRET_KEY is explicitly configured', async () => {
  const { email } = await registerUser('admin');

  const response = await request('POST', '/api/auth/set-admin', {
    email,
    secretKey: 'athletetime-admin-2024',
  });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
});

test('auth privacy contract documents launch-blocking guarantees', () => {
  const contractPath = path.join(ROOT, 'docs/athletetime-auth-privacy-security-contract.md');
  const contract = fs.readFileSync(contractPath, 'utf8');

  for (const required of [
    'HttpOnly',
    'Secure',
    'SameSite',
    'CSRF',
    'localStorage',
    '회원 탈퇴',
    '내보내기',
    '보관 기간',
    '삭제',
    '익명화',
    '인증 코드',
    '관리자 승격',
  ]) {
    assert.match(contract, new RegExp(required));
  }

  assert.doesNotMatch(contract, /무조건 합법/);
  assert.doesNotMatch(contract, /AI가 검증/);
  assert.doesNotMatch(contract, /2차 창작이라 책임 없음/);
});
