const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readViteProxyTarget(viteSource, route) {
  const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const proxyBlock = viteSource.match(new RegExp(`'${escapedRoute}':\\s*\\{([^}]*)\\}`));
  assert.ok(proxyBlock, `${route} proxy block exists`);

  const target = proxyBlock[1].match(/target:\s*'([^']+)'/);
  assert.ok(target, `${route} proxy target exists`);
  return target[1];
}

test('P1-FRESH-001(revised): freshness badge removed by owner decision — match results are immutable, collection date adds no user value', () => {
  const schedule = readSource('frontend/src/components/competitions/tabs/ScheduleTab.tsx');
  const resultSourceSummary = readSource('frontend/src/components/competitions/ResultSourceSummary.tsx');

  assert.equal(schedule.includes('ResultFreshnessBadge'), false);
  assert.equal(
    fs.existsSync(path.join(ROOT, 'frontend/src/components/competitions/ResultFreshnessBadge.tsx')),
    false,
  );
  assert.equal(schedule.includes('공식 순위'), false);
  assert.equal(resultSourceSummary.includes('수집일 미상'), false);
  assert.equal(resultSourceSummary.includes('meta.collectedAt'), false);
});

test('P1-CHUNK-001: Frontend routing and Vite config split secondary pages out of the launch entry chunk', () => {
  const app = readSource('frontend/src/App.tsx');
  const vite = readSource('frontend/vite.config.ts');

  assert.match(app, /import \{ Suspense, lazy, useEffect \} from 'react'/);
  assert.match(app, /const RecordsPage = lazy\(\(\) => import\('\.\/pages\/RecordsPage'\)\)/);
  // 채팅「자유수다」는 라이브 — ChatPage가 lazy-chunk로 분할되어 메인 번들에 포함된다.
  assert.match(app, /const ChatPage = lazy\(\(\) => import\('\.\/pages\/ChatPage'\)\)/);
  assert.equal(app.includes("import ChatPage from './pages/ChatPage'"), false);
  assert.equal(app.includes('오픈 채팅은 준비 중이에요'), false);
  // 커뮤니티/마켓 등 미완 기능은 여전히 준비 중 — 진입점 번들에 실려서는 안 된다.
  assert.equal(app.includes("import CommunityPage from './pages/CommunityPage'"), false);
  assert.equal(app.includes("import MarketplacePage from './pages/MarketplacePage'"), false);
  assert.match(vite, /manualChunks\(id\)/);
  assert.match(vite, /page-records/);
  assert.match(vite, /page-competitions/);
  assert.match(vite, /page-tools/);
});

test('LOCAL-PROXY-001: Given the default local server When Vite proxies API requests Then both use port 3000', () => {
  const server = readSource('src/server.js');
  const vite = readSource('frontend/vite.config.ts');

  assert.match(server, /const PORT = process\.env\.PORT \|\| 3000/);
  assert.equal(readViteProxyTarget(vite, '/api'), 'http://localhost:3000');
  assert.equal(readViteProxyTarget(vite, '/health'), 'http://localhost:3000');
  assert.equal(readViteProxyTarget(vite, '/ws'), 'ws://localhost:3000');
  assert.doesNotMatch(vite, /localhost:3005/);
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
  assert.match(plan, /WebSocket Chat Integration \(deferred\)/);
  assert.match(plan, /\/api\/chat\/\*.*503/);
  assert.match(plan, /검증[\s\S]*도메인 전환[\s\S]*레거시 백엔드 종료/);
  assert.match(plan, /rollback|롤백/i);
  for (const secretName of ['JWT_SECRET', 'ZERO_RESULT_SEARCH_SECRET', 'DATABASE_URL', 'Cloudinary']) {
    assert.match(plan, new RegExp(secretName));
  }
  assert.match(plan, /No migration code before this document|이 문서 전에는 마이그레이션 코드를 작성하지 않는다/);
});
