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

test('P1-FRESH-001(revised): freshness badge removed by owner decision — match results are immutable, collection date adds no user value', () => {
  // 결정 근거: PR #5 리뷰 스레드. 확정된 경기결과에 "수집일" 라벨은 정보가 아니라 노이즈다.
  // collectedAt 데이터 플럼빙(resultsStore/searchService/api)은 무해하므로 남긴다(현재 데이터에 값 없음, UI 미사용).
  const schedule = readSource('frontend/src/components/competitions/tabs/ScheduleTab.tsx');

  assert.equal(schedule.includes('ResultFreshnessBadge'), false);
  assert.equal(
    fs.existsSync(path.join(ROOT, 'frontend/src/components/competitions/ResultFreshnessBadge.tsx')),
    false,
  );
  assert.equal(schedule.includes('공식 순위'), false);
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

test('P1-FIX-W4: Migration execution plan exists before migration code and covers launch transition risks', () => {
  const plan = readSource('docs/athletetime-migration-execution-plan.md');

  assert.match(plan, /legacy PostgreSQL|레거시 PostgreSQL/);
  assert.match(plan, /community posts|커뮤니티 글/);
  assert.match(plan, /comments|댓글/);
  assert.match(plan, /market|마켓/);
  assert.match(plan, /new schema|신규 스키마/);
  assert.match(plan, /P2-SHARE-001/);
  assert.match(plan, /redirect map|리다이렉트 맵/);
  assert.match(plan, /legacy ws chat|레거시 ws 채팅/);
  assert.match(plan, /VITE_WS_URL/);
  assert.match(plan, /검증[\s\S]*도메인 전환[\s\S]*레거시 백엔드 종료/);
  assert.match(plan, /rollback|롤백/i);
  for (const secretName of ['JWT_SECRET', 'ZERO_RESULT_SEARCH_SECRET', 'DATABASE_URL', 'Cloudinary']) {
    assert.match(plan, new RegExp(secretName));
  }
  assert.match(plan, /No migration code before this document|이 문서 전에는 마이그레이션 코드를 작성하지 않는다/);
});
