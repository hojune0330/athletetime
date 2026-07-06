const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
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
  assert.equal(stored.includes('진짜없는이름'), false);
  assert.equal(stored.includes('records'), true);
  fs.rmSync(path.dirname(storePath), { recursive: true, force: true });
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
  const previous = {
    jwt: process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV,
    store: process.env.ZERO_RESULT_SEARCH_STORE,
    zeroSecret: process.env.ZERO_RESULT_SEARCH_SECRET,
  };
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
    if (previous.jwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous.jwt;
    if (previous.zeroSecret === undefined) delete process.env.ZERO_RESULT_SEARCH_SECRET;
    else process.env.ZERO_RESULT_SEARCH_SECRET = previous.zeroSecret;
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.store === undefined) delete process.env.ZERO_RESULT_SEARCH_STORE;
    else process.env.ZERO_RESULT_SEARCH_STORE = previous.store;
    fs.rmSync(path.dirname(storePath), { recursive: true, force: true });
    delete require.cache[require.resolve('../../card-studio/services/zeroResultSearchService')];
  }
});

test('P1-FRESH-001: Result competition metadata and schedule UI expose collection freshness without official wording', () => {
  const resultsStore = readSource('card-studio/services/resultsStore.js');
  const searchService = readSource('card-studio/services/searchService.js');
  const api = readSource('frontend/src/api/competitions.ts');
  const schedule = readSource('frontend/src/components/competitions/tabs/ScheduleTab.tsx');
  const badge = readSource('frontend/src/components/competitions/ResultFreshnessBadge.tsx');

  assert.match(resultsStore, /collectedAt: raw\.meta\.crawled_at/);
  assert.match(searchService, /collectedAt: c\.collectedAt/);
  assert.match(api, /collectedAt\?: string/);
  assert.match(schedule, /ResultFreshnessBadge/);
  assert.match(badge, /며칠 전 수집|오늘 수집|수집일 미상/);
  assert.equal(`${schedule}\n${badge}`.includes('공식 순위'), false);
});

test('P1-CHUNK-001: Frontend routing and Vite config split secondary pages out of the launch entry chunk', () => {
  const app = readSource('frontend/src/App.tsx');
  const vite = readSource('frontend/vite.config.ts');

  assert.match(app, /import \{ Suspense, lazy, useEffect \} from 'react'/);
  assert.match(app, /const RecordsPage = lazy\(\(\) => import\('\.\/pages\/RecordsPage'\)\)/);
  assert.match(app, /const ChatPage = lazy\(\(\) => import\('\.\/pages\/ChatPage'\)\)/);
  assert.equal(app.includes("import ChatPage from './pages/ChatPage'"), false);
  assert.equal(app.includes("import MarketplacePage from './pages/MarketplacePage'"), false);
  assert.match(vite, /manualChunks\(id\)/);
  assert.match(vite, /page-records/);
  assert.match(vite, /page-competitions/);
  assert.match(vite, /page-tools/);
});
