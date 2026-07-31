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

test('Given the public athlete route When source contracts are scanned Then self ownership stays outside the page', () => {
  // Given the app route and dedicated athlete page sources.
  const app = fs.readFileSync(path.join(FRONTEND, 'src/App.tsx'), 'utf8');
  const page = fs.readFileSync(
    path.join(FRONTEND, 'src/features/record-workspace/pages/RecordAthletePage.tsx'),
    'utf8',
  );

  // When route, comparison setup, and ownership language are inspected.
  // Then the route is public, comparison starts with one subject, and no self card is injected.
  assert.match(app, /path="athletes\/:athleteKey"/);
  assert.match(page, /saveComparison/);
  assert.match(page, /focusSearch:\s*true/);
  assert.match(page, /useSearchParams/);
  assert.match(page, /pageParams\.get\('event'\)/);
  assert.match(page, /pageParams\.get\('record'\)/);
  assert.match(page, /pageParams\.get\('tab'\)/);
  assert.match(page, /athlete\.refetch/);
  assert.doesNotMatch(page, /내 기록|selfClaim|MyRecords|onToggleMine|isMine/);
});
