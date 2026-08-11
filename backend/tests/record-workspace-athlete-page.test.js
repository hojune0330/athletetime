const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const FRONTEND = path.join(ROOT, 'frontend');
const VITEST_PACKAGE = require.resolve('vitest/package.json', { paths: [FRONTEND] });
const VITEST_CLI = path.join(path.dirname(VITEST_PACKAGE), 'vitest.mjs');

test('Given athlete page contracts When the focused Vitest suite runs Then pagination and disclosure stay truthful', () => {
  // Given the dedicated athlete page behavior suite.
  // When Vitest executes it through the frontend transform boundary.
  const result = spawnSync(
    process.execPath,
    [VITEST_CLI, '--run', 'src/features/record-workspace/pages/recordAthletePage.test.tsx'],
    { cwd: FRONTEND, encoding: 'utf8' },
  );

  // Then pagination and grouped disclosure complete without failure.
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('Given the public athlete route When source contracts are scanned Then self ownership and incomplete comparison setup stay outside the page', () => {
  // Given the app route and dedicated athlete page sources.
  const app = fs.readFileSync(path.join(FRONTEND, 'src/App.tsx'), 'utf8');
  const page = fs.readFileSync(
    path.join(FRONTEND, 'src/features/record-workspace/pages/RecordAthletePage.tsx'),
    'utf8',
  );

  // When route, search continuation, and ownership language are inspected.
  // Then the route is public, incomplete comparison state is not stored, and no self card is injected.
  assert.match(app, /path="athletes\/:athleteKey"/);
  assert.match(page, /focusSearch:\s*true/);
  assert.match(page, />\s*다른 선수 찾기\s*</);
  assert.match(page, /useSearchParams/);
  assert.match(page, /pageParams\.get\('event'\)/);
  assert.match(page, /pageParams\.get\('record'\)/);
  assert.match(page, /pageParams\.get\('tab'\)/);
  assert.match(page, /athlete\.refetch/);
  assert.match(page, /subject\.note\.trim\(\)/);
  assert.match(page, /같은 이름의 다른 선수일 수 있어요/);
  assert.match(page, /소속·연도·종목을 확인해 주세요/);
  assert.match(page, />\s*이 선수 담기\s*</);
  assert.ok((page.match(/focus-visible:ring-2/g) || []).length >= 2);
  assert.ok((page.match(/min-h-11/g) || []).length >= 2);
  assert.doesNotMatch(page, /saveComparison|다른 선수와 비교/);
  assert.doesNotMatch(page, /이 선수 후보 담기/);
  assert.doesNotMatch(page, /내 기록|selfClaim|MyRecords|onToggleMine|isMine/);
});

test('Given the athlete share contract When RecordAthletePage is scanned Then sharing stays public and truthful', () => {
  // Given the dedicated athlete page source that now owns the share action.
  const page = fs.readFileSync(
    path.join(FRONTEND, 'src/features/record-workspace/pages/RecordAthletePage.tsx'),
    'utf8',
  );

  // When the share button, Web Share first, and clipboard fallback are inspected.
  // Then the page exposes a public share entry and never claims ownership of the record.
  assert.match(page, /ShareIcon/);
  assert.match(page, />\s*공유\s*</);
  assert.match(page, /navigator\.share/);
  assert.match(page, /navigator\.clipboard\.writeText/);
  assert.match(page, /링크를 복사했어요/);
  assert.match(page, /AbortError/);
  assert.doesNotMatch(page, /내 기록|내 공유|소유|selfClaim/);
});
