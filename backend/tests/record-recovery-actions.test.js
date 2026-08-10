const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('RECORD-RECOVERY-001 Given a public record search fails When the error card renders Then one retry action keeps the current search context', () => {
  // Given the public record search surface is the first recovery point.
  const page = readSource('frontend/src/pages/RecordsPage.tsx');

  // When the page renders search and season retrieval failures.
  // Then each failure offers an explicit retry instead of only passive copy.
  assert.match(page, /title="검색을 불러오지 못했습니다"[\s\S]{0,420}action=\{[\s\S]{0,240}navigate\(0\)[\s\S]{0,80}다시 시도/);
  assert.match(page, /onRetry=\{\(\) => navigate\(0\)\}/);
  assert.match(page, /state === 'error'[\s\S]{0,360}action=\{<Button[\s\S]{0,200}onClick=\{onRetry\}[\s\S]{0,80}다시 시도/);
});

test('RECORD-RECOVERY-002 Given an old athlete link fails When the source distinguishes not-found from transport failure Then the next action matches that state', () => {
  // Given the older athlete route still receives shared and bookmarked visits.
  const page = readSource('frontend/src/pages/AthleteDetailPage.tsx');

  // When the profile request returns a known 404 or an unknown failure.
  // Then known absence returns to search, while unknown failure retries without calling the athlete absent.
  assert.match(page, /state === 'not-found'/);
  assert.match(page, /state === 'error'/);
  assert.doesNotMatch(page, /if \(!profile \|\| state === 'not-found'\)/);
  assert.match(page, /기록 다시 찾기/);
  assert.match(page, /navigate\(0\)/);
  assert.match(page, /다시 시도/);
});

test('RECORD-RECOVERY-003 Given a competition result route cannot load When it renders Then it offers one context-preserving recovery path', () => {
  // Given result-list and result-detail routes can be reached from older competition links.
  const listPage = readSource('frontend/src/pages/MatchResultListPage.tsx');
  const detailPage = readSource('frontend/src/pages/MatchResultDetailPage.tsx');

  // When their retrieval state is unavailable.
  // Then the list returns to competitions and detail returns only to its result list.
  assert.match(listPage, /isError[\s\S]{0,520}to="\/competitions"/);
  assert.match(detailPage, /경기 결과를 불러오지 못했습니다/);
  assert.match(detailPage, /to=\{`\/matchResult\/\$\{competitionId\}`\}/);
});
