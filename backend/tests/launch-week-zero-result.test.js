const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function snapshotZeroResultEnv() {
  return {
    jwt: process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV,
    store: process.env.ZERO_RESULT_SEARCH_STORE,
    zeroSecret: process.env.ZERO_RESULT_SEARCH_SECRET,
  };
}

function restoreZeroResultEnv(previous) {
  if (previous.jwt === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previous.jwt;
  if (previous.zeroSecret === undefined) delete process.env.ZERO_RESULT_SEARCH_SECRET;
  else process.env.ZERO_RESULT_SEARCH_SECRET = previous.zeroSecret;
  if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previous.nodeEnv;
  if (previous.store === undefined) delete process.env.ZERO_RESULT_SEARCH_STORE;
  else process.env.ZERO_RESULT_SEARCH_STORE = previous.store;
  delete require.cache[require.resolve('../../card-studio/services/zeroResultSearchService')];
}

function request(baseUrl, requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${baseUrl}${requestPath}`, { method: 'GET' }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: raw.length > 0 ? JSON.parse(raw) : null,
          raw,
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function waitForHealth(baseUrl) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    try {
      const response = await request(baseUrl, '/health');
      if (response.status === 200) return;
    } catch (error) {
      if (error.code !== 'ECONNREFUSED') throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('server did not become healthy');
}

test('P1-ZERO-001: Given a /records zero-result query When searched Then only anonymous aggregate data is stored', async () => {
  const port = String(6200 + Math.floor(Math.random() * 500));
  const baseUrl = `http://127.0.0.1:${port}`;
  const storePath = path.join(tempDir('athletetime-zero-search-'), 'zero-result-searches.json');
  const rawQuery = '없는선수김민지';
  const serverProcess = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: port,
      NODE_ENV: 'development',
      DATABASE_URL: '',
      JWT_SECRET: 'test-secret-for-launch-week-p1',
      ZERO_RESULT_SEARCH_STORE: storePath,
      ZERO_RESULT_SEARCH_SECRET: 'test-zero-result-secret',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForHealth(baseUrl);
    const search = await request(baseUrl, `/api/card-studio/analytics/records/search?q=${encodeURIComponent(rawQuery)}`);
    const summary = await request(baseUrl, '/api/card-studio/analytics/records/zero-result-summary');

    assert.equal(search.status, 200);
    assert.equal(search.body.success, true);
    assert.equal(search.body.total, 0);
    assert.equal(summary.status, 200);
    assert.equal(summary.body.success, true);
    assert.equal(summary.body.data.totalEvents, 1);
    assert.equal(summary.body.data.items[0].count, 1);
    assert.match(summary.body.data.items[0].fingerprint, /^[a-f0-9]{16}$/);
    assert.match(summary.body.data.items[0].lastSeenDate, /^\d{4}-\d{2}-\d{2}$/);

    const serialized = JSON.stringify({ stored: fs.readFileSync(storePath, 'utf8'), summary: summary.body });
    assert.equal(serialized.includes(rawQuery), false);
    assert.equal(serialized.includes('lastSeenAt'), false);
    assert.equal(serialized.includes('firstSeenAt'), false);
    assert.equal(/"userAgent"\s*:/.test(serialized), false);
    assert.equal(/"ip"\s*:/.test(serialized), false);
  } finally {
    serverProcess.kill('SIGINT');
    await new Promise((resolve) => {
      serverProcess.once('exit', resolve);
      setTimeout(resolve, 3000);
    });
    fs.rmSync(path.dirname(storePath), { recursive: true, force: true });
  }
});

test('P1-ZERO-002: Given direct aggregate recording When repeated Then counts merge without retaining raw query text', () => {
  const storePath = path.join(tempDir('athletetime-zero-search-unit-'), 'zero-result-searches.json');
  const previous = snapshotZeroResultEnv();

  try {
    process.env.ZERO_RESULT_SEARCH_STORE = storePath;
    process.env.ZERO_RESULT_SEARCH_SECRET = 'test-zero-result-secret';
    delete require.cache[require.resolve('../../card-studio/services/zeroResultSearchService')];
    const zeroResultSearchService = require('../../card-studio/services/zeroResultSearchService');

    zeroResultSearchService.recordZeroResultSearch({ query: '진짜없는이름', surface: 'records' });
    zeroResultSearchService.recordZeroResultSearch({ query: ' 진짜없는이름 ', surface: 'records' });
    const summary = zeroResultSearchService.getZeroResultSearchSummary();
    const stored = fs.readFileSync(storePath, 'utf8');

    assert.equal(summary.totalEvents, 2);
    assert.equal(summary.items.length, 1);
    assert.equal(summary.items[0].count, 2);
    assert.equal(summary.privacy.rawQueryStored, false);
    assert.equal(summary.items[0].rawQueryStored, false);
    assert.equal(summary.items[0].distinctSeenDays, 1);
    assert.equal(stored.includes('진짜없는이름'), false);
    assert.equal(stored.includes('records'), true);
  } finally {
    restoreZeroResultEnv(previous);
    fs.rmSync(path.dirname(storePath), { recursive: true, force: true });
  }
});

test('P1-ZERO-005: Given a failed query seen on fewer than 3 days When aggregated Then raw text stays fingerprint-only', () => {
  const storePath = path.join(tempDir('athletetime-zero-search-kanon-low-'), 'zero-result-searches.json');
  const rawQuery = '제천고 기록 없음';
  const previous = snapshotZeroResultEnv();

  try {
    process.env.ZERO_RESULT_SEARCH_STORE = storePath;
    process.env.ZERO_RESULT_SEARCH_SECRET = 'test-zero-result-secret';
    delete require.cache[require.resolve('../../card-studio/services/zeroResultSearchService')];
    const zeroResultSearchService = require('../../card-studio/services/zeroResultSearchService');

    zeroResultSearchService.recordZeroResultSearch({ query: rawQuery, surface: 'records', observedDate: '2026-07-01' });
    zeroResultSearchService.recordZeroResultSearch({ query: rawQuery, surface: 'records', observedDate: '2026-07-01' });
    zeroResultSearchService.recordZeroResultSearch({ query: rawQuery, surface: 'records', observedDate: '2026-07-02' });
    const summary = zeroResultSearchService.getZeroResultSearchSummary({ includeRawQuery: true });
    const stored = fs.readFileSync(storePath, 'utf8');

    assert.equal(summary.totalEvents, 3);
    assert.equal(summary.privacy.rawQueryStored, false);
    assert.equal(summary.items[0].count, 3);
    assert.equal(summary.items[0].distinctSeenDays, 2);
    assert.equal(summary.items[0].rawQueryStored, false);
    assert.equal(summary.items[0].rawQuery, undefined);
    assert.equal(stored.includes(rawQuery), false);
  } finally {
    restoreZeroResultEnv(previous);
    fs.rmSync(path.dirname(storePath), { recursive: true, force: true });
  }
});

test('P1-ZERO-006: Given the same failed query on 3 different days When aggregated Then operator raw text is stored but public summary masks it', () => {
  const storePath = path.join(tempDir('athletetime-zero-search-kanon-pass-'), 'zero-result-searches.json');
  const rawQuery = '춘천오픈 여자 1500m 결과';
  const previous = snapshotZeroResultEnv();

  try {
    process.env.ZERO_RESULT_SEARCH_STORE = storePath;
    process.env.ZERO_RESULT_SEARCH_SECRET = 'test-zero-result-secret';
    delete require.cache[require.resolve('../../card-studio/services/zeroResultSearchService')];
    const zeroResultSearchService = require('../../card-studio/services/zeroResultSearchService');

    zeroResultSearchService.recordZeroResultSearch({ query: rawQuery, surface: 'records', observedDate: '2026-07-01' });
    zeroResultSearchService.recordZeroResultSearch({ query: rawQuery, surface: 'records', observedDate: '2026-07-02' });
    zeroResultSearchService.recordZeroResultSearch({ query: rawQuery, surface: 'records', observedDate: '2026-07-03' });
    const publicSummary = zeroResultSearchService.getZeroResultSearchSummary();
    const operatorSummary = zeroResultSearchService.getZeroResultSearchSummary({ includeRawQuery: true });
    const stored = fs.readFileSync(storePath, 'utf8');

    assert.equal(publicSummary.privacy.rawQueryStored, true);
    assert.equal(publicSummary.items[0].rawQueryStored, true);
    assert.equal(publicSummary.items[0].distinctSeenDays, 3);
    assert.equal(publicSummary.items[0].rawQuery, undefined);
    assert.equal(operatorSummary.items[0].rawQuery, rawQuery);
    assert.equal(stored.includes(rawQuery), true);
  } finally {
    restoreZeroResultEnv(previous);
    fs.rmSync(path.dirname(storePath), { recursive: true, force: true });
  }
});

test('P1-ZERO-003: Given analytics storage failure When records search has no result Then search still succeeds', async () => {
  const port = String(6700 + Math.floor(Math.random() * 500));
  const baseUrl = `http://127.0.0.1:${port}`;
  const blockedStorePath = tempDir('athletetime-zero-search-blocked-');
  const serverProcess = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: port,
      NODE_ENV: 'development',
      DATABASE_URL: '',
      JWT_SECRET: 'test-secret-for-launch-week-p1',
      ZERO_RESULT_SEARCH_STORE: blockedStorePath,
      ZERO_RESULT_SEARCH_SECRET: 'test-zero-result-secret',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForHealth(baseUrl);
    const search = await request(baseUrl, `/api/card-studio/analytics/records/search?q=${encodeURIComponent('없는선수박민수')}`);

    assert.equal(search.status, 200);
    assert.equal(search.body.success, true);
    assert.equal(search.body.total, 0);
  } finally {
    serverProcess.kill('SIGINT');
    await new Promise((resolve) => {
      serverProcess.once('exit', resolve);
      setTimeout(resolve, 3000);
    });
    fs.rmSync(blockedStorePath, { recursive: true, force: true });
  }
});

test('P1-ZERO-004: Given production without an aggregation secret When recording Then default salt is not used', () => {
  const previous = snapshotZeroResultEnv();
  const storePath = path.join(tempDir('athletetime-zero-search-prod-'), 'zero-result-searches.json');

  try {
    delete process.env.JWT_SECRET;
    delete process.env.ZERO_RESULT_SEARCH_SECRET;
    process.env.NODE_ENV = 'production';
    process.env.ZERO_RESULT_SEARCH_STORE = storePath;
    delete require.cache[require.resolve('../../card-studio/services/zeroResultSearchService')];
    const zeroResultSearchService = require('../../card-studio/services/zeroResultSearchService');

    assert.equal(zeroResultSearchService.recordZeroResultSearch({ query: '운영비밀없음', surface: 'records' }), null);
    assert.equal(fs.existsSync(storePath), false);
  } finally {
    restoreZeroResultEnv(previous);
    fs.rmSync(path.dirname(storePath), { recursive: true, force: true });
  }
});
