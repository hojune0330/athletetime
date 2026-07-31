const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const FRONTEND = path.join(ROOT, 'frontend');
const VITEST_PACKAGE = require.resolve('vitest/package.json', { paths: [FRONTEND] });
const VITEST_CLI = path.join(path.dirname(VITEST_PACKAGE), 'vitest.mjs');
const COMPONENTS = path.join(FRONTEND, 'src/features/record-workspace/components');

test('Given 125 mixed records When grouped browsing contracts run Then disclosure stays bounded and deterministic', () => {
  // Given the frontend grouping and rendering behavior suite.
  // When Vitest executes it through the Vite transform boundary.
  const result = spawnSync(
    process.execPath,
    [VITEST_CLI, '--run', 'src/features/record-workspace/grouping.test.tsx'],
    { cwd: FRONTEND, encoding: 'utf8' },
  );

  // Then every grouping and progressive-disclosure scenario passes.
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('Given the record detail sheet When its source is inspected Then secondary metadata stays out of the row', () => {
  // Given the detail sheet and compact row sources.
  const detail = fs.readFileSync(path.join(COMPONENTS, 'RecordDetailSheet.tsx'), 'utf8');
  const row = fs.readFileSync(path.join(COMPONENTS, 'RecordRow.tsx'), 'utf8');

  // When visible metadata labels and source fields are inspected.
  // Then secondary fields exist in the sheet and not in the compact row.
  assert.match(detail, /풍속/);
  assert.match(detail, /경기 단계/);
  assert.match(detail, /부문/);
  assert.match(detail, /출처/);
  assert.match(detail, /sourceUrl/);
  assert.doesNotMatch(row, /풍속|경기 단계|sourceUrl/);
});

test('Given record browsing components When action surfaces are scanned Then selection remains one explicit mode', () => {
  // Given all Task 5 record browsing component sources.
  const files = [
    'RecordEventFilter.tsx',
    'RecordGroupList.tsx',
    'RecordRow.tsx',
    'RecordDetailSheet.tsx',
    'RecordSelectionBar.tsx',
  ];
  const source = files
    .map((file) => fs.readFileSync(path.join(COMPONENTS, file), 'utf8'))
    .join('\n');

  // When prohibited legacy ownership actions and decorative patterns are scanned.
  // Then the new surfaces remain neutral, bounded, and non-decorative.
  assert.doesNotMatch(source, /onToggleMine|isMine|내가 모아 보는 기록/);
  assert.doesNotMatch(source, /gradient|rounded-(?:xl|2xl|3xl)|animate-(?:bounce|pulse)/);
  assert.match(source, /min-h-11/);
  assert.match(source, /safe-area-inset-bottom/);
});
