const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

test('LEGACY-FIXTURE-GUARD-001 Given private originals are unavailable When normalization tests run Then original-dependent cases skip instead of failing', () => {
  const missingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-missing-originals-'));
  fs.rmSync(missingRoot, { recursive: true, force: true });
  const childEnv = {
    ...process.env,
    ATHLETETIME_LEGACY_ORIGINAL_FIXTURE_ROOT: missingRoot,
  };
  delete childEnv.NODE_TEST_CONTEXT;

  const result = spawnSync(
    process.execPath,
    ['--test', 'backend/tests/legacy-result-normalization.test.js'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: childEnv,
    },
  );

  const output = `${result.stdout}\n${result.stderr}`;
  assert.equal(result.status, 0, output);
  assert.match(output, /# skipped 3/u);
  assert.match(output, /private original workbook not present/u);
});
