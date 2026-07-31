const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const FRONTEND = path.join(ROOT, 'frontend');
const COMPONENTS = path.join(FRONTEND, 'src/features/record-workspace/components');
const VITEST_PACKAGE = require.resolve('vitest/package.json', { paths: [FRONTEND] });
const VITEST_CLI = path.join(path.dirname(VITEST_PACKAGE), 'vitest.mjs');

test('Given candidate browsing contracts When the focused Vitest suite runs Then browse and collect stay separate', () => {
  // Given the candidate list behavior suite.
  // When Vitest executes it through the frontend transform boundary.
  const result = spawnSync(
    process.execPath,
    [VITEST_CLI, '--run', 'src/features/record-workspace/components/candidateList.test.tsx'],
    { cwd: FRONTEND, encoding: 'utf8' },
  );

  // Then every user-visible candidate flow passes.
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('Given candidate component sources When ownership language is scanned Then self and comparison controls are absent', () => {
  // Given the three candidate browsing sources.
  const source = [
    'RecordCandidateCard.tsx',
    'RecordCandidateList.tsx',
    'WorkspaceDraftTray.tsx',
  ].map((file) => fs.readFileSync(path.join(COMPONENTS, file), 'utf8')).join('\n');

  // When old mixed-purpose ownership and decorative patterns are scanned.
  // Then the new surface remains a general browse or explicit workspace draft flow.
  assert.doesNotMatch(source, /onToggleMine|isMine|내가 모아 보는 기록|gradient|rounded-(?:xl|2xl|3xl)|animate-(?:bounce|pulse)/);
  assert.doesNotMatch(source, /비교에 담기|내 기록 지정/);
  assert.match(source, /min-h-11/);
  assert.match(source, /safe-area-inset-bottom/);
});
