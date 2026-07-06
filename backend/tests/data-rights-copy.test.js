const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('frontend trust surfaces use public-record indexing copy instead of workaround framing', () => {
  const sources = [
    'frontend/src/components/common/DataNotice.tsx',
    'frontend/src/components/layout/Footer.tsx',
    'frontend/src/config/dataPolicy.ts',
    'frontend/src/pages/CompetitionsPage.tsx',
    'frontend/src/pages/ProfileCardPage.tsx',
  ].map(readSource).join('\n');

  assert.match(sources, /공개 경기기록을 모아 정리했어요/);
  assert.match(sources, /공식 기록 서비스는 아니에요/);
  assert.equal(sources.includes('2차 창작물'), false);
  assert.equal(sources.includes('2차 창작 자료'), false);
  assert.equal(sources.includes('AI 인사이트'), false);
  assert.equal(sources.includes('창작 콘텐츠 제작 도구'), false);
});

test('active docs point to data-request and avoid legal loophole positioning', () => {
  const sources = [
    'docs/athletetime-data-strategy-master.md',
    'docs/athletetime-current-copy-source.md',
    'docs/athletetime-records-microcopy.md',
    'docs/athletetime-agent-coordination.md',
  ].map(readSource).join('\n');

  assert.match(sources, /\/data-request/);
  assert.equal(sources.includes('GitHub Issues'), false);
  assert.equal(sources.includes('법적 회피'), false);
  assert.equal(sources.includes('창작 콘텐츠 제작 도구'), false);
});
