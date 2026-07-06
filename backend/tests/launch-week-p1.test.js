const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
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
