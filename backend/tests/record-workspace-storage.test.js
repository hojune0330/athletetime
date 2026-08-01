const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const FRONTEND = path.join(ROOT, 'frontend');
const VITEST_PACKAGE = require.resolve('vitest/package.json', { paths: [FRONTEND] });
const VITEST_CLI = path.join(path.dirname(VITEST_PACKAGE), 'vitest.mjs');

test('Given isolated browser storage contracts When the focused Vitest suite runs Then every context boundary passes', () => {
  // Given the frontend storage and migration behavior suites.
  // When Vitest executes both modules through the Vite transform boundary.
  const result = spawnSync(
    process.execPath,
    [VITEST_CLI, '--run', 'src/features/record-workspace/storage.test.ts', 'src/features/record-workspace/legacyMigration.test.ts'],
    { cwd: FRONTEND, encoding: 'utf8' },
  );

  // Then the browser-facing storage contracts complete without a failed scenario.
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
