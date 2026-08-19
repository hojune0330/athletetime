const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const FRONTEND = path.join(ROOT, 'frontend');
const VITEST_PACKAGE = require.resolve('vitest/package.json', { paths: [FRONTEND] });
const VITEST_CLI = path.join(path.dirname(VITEST_PACKAGE), 'vitest.mjs');

test('Given workspace page contracts When focused Vitest runs Then review and reversible editing remain safe', () => {
  // Given review, persistence, and local editing behavior suites.
  // When Vitest executes them through the frontend transform boundary.
  const result = spawnSync(
    process.execPath,
    [
      VITEST_CLI,
      '--run',
      'src/features/record-workspace/pages/workspacePages.test.tsx',
      'src/features/record-workspace/workspaceMutations.test.ts',
      'src/features/record-workspace/workspaceEditor.test.ts',
    ],
    { cwd: FRONTEND, encoding: 'utf8' },
  );

  // Then mixed names, unavailable subjects, limits, hide, and undo all pass.
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('Given a records browse page When display modes change Then the address owns the visible mode', () => {
  // Given the records page's mounted season controller and browser history.
  const result = spawnSync(
    process.execPath,
    [
      VITEST_CLI,
      '--run',
      'src/features/record-workspace/season-navigation/useSeasonRecordsController.integration.test.tsx',
    ],
    { cwd: FRONTEND, encoding: 'utf8' },
  );

  // When mode and URL-backed tuple changes are replayed.
  // Then the mounted controller keeps the address as the visible mode source.
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
