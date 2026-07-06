const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const PORT = String(5600 + Math.floor(Math.random() * 500));
const BASE_URL = `http://127.0.0.1:${PORT}`;
const REQUESTS_DIR = path.join(ROOT, 'data', 'requests');
const REQUESTS_FILE = path.join(REQUESTS_DIR, 'requests.json');
const SUPPRESSIONS_FILE = path.join(REQUESTS_DIR, 'suppressions.json');

let serverProcess;
let requestsBackup = null;
let suppressionsBackup = null;

function backupFile(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function restoreFile(file, backup) {
  if (backup === null) {
    if (fs.existsSync(file)) fs.rmSync(file);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, backup, 'utf8');
}

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
          resolve({
            status: res.statusCode,
            body: raw.length > 0 ? JSON.parse(raw) : null,
            raw,
          });
        });
      },
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function waitForHealth() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    try {
      const response = await request('GET', '/health');
      if (response.status === 200) return;
    } catch (error) {
      if (error.code !== 'ECONNREFUSED') throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('server did not become healthy');
}

function serialized(value) {
  return JSON.stringify(value);
}

test.before(async () => {
  requestsBackup = backupFile(REQUESTS_FILE);
  suppressionsBackup = backupFile(SUPPRESSIONS_FILE);

  serverProcess = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT,
      NODE_ENV: 'development',
      DATABASE_URL: '',
      JWT_SECRET: 'test-secret-for-data-rights-policy',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await waitForHealth();
});

test.after(async () => {
  restoreFile(REQUESTS_FILE, requestsBackup);
  restoreFile(SUPPRESSIONS_FILE, suppressionsBackup);

  if (!serverProcess || serverProcess.killed) return;
  serverProcess.kill('SIGINT');
  await new Promise((resolve) => {
    serverProcess.once('exit', resolve);
    setTimeout(resolve, 3000);
  });
});

test('data-policy endpoint describes public-record indexing with source tiers', async () => {
  const response = await request('GET', '/api/card-studio/data-policy');

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.positioning.kind, 'public_record_index');
  assert.equal(response.body.data.correction.requestPath, '/data-request');
  assert.deepEqual(
    response.body.data.sourceTiers.map((tier) => tier.key),
    ['A', 'B', 'C', 'L'],
  );

  const body = serialized(response.body);
  assert.equal(body.includes('창작 콘텐츠 제작 도구'), false);
  assert.equal(body.includes('2차 창작'), false);
  assert.equal(body.includes('AI 인사이트'), false);
});

test('record APIs expose public provenance and no restricted identifiers', async () => {
  const competitions = await request('GET', '/api/card-studio/results/competitions?year=2024');

  assert.equal(competitions.status, 200);
  assert.ok(competitions.body.data.length > 0, 'expected at least one 2024 result competition');

  const filename = encodeURIComponent(competitions.body.data[0].filename);
  const events = await request('GET', `/api/card-studio/results/${filename}/events`);
  const search = await request('GET', '/api/card-studio/analytics/records/search?q=김민');

  assert.equal(events.status, 200);
  assert.equal(search.status, 200);

  const body = serialized({ events: events.body, search: search.body });
  assert.match(body, /public_result/);
  assert.match(body, /dataRights|sourceScope|scopeNotice/);
  assert.equal(body.includes('official_result'), false);
  assert.equal(body.includes('person_no'), false);
  assert.equal(body.includes('birthdate'), false);
  assert.equal(body.includes('birthDate'), false);
});

test('public data request status redacts contact and reason', async () => {
  const created = await request('POST', '/api/card-studio/data-requests', {
    type: 'correction',
    athleteName: '테스트선수',
    reason: '연락처 비공개 확인',
    contact: 'private@example.com',
  });

  assert.equal(created.status, 201);
  const ticketId = created.body.data.ticketId;
  const lookup = await request('GET', `/api/card-studio/data-requests/${ticketId}`);

  assert.equal(lookup.status, 200);
  const body = serialized(lookup.body);
  assert.equal(body.includes('private@example.com'), false);
  assert.equal(body.includes('연락처 비공개 확인'), false);
});
