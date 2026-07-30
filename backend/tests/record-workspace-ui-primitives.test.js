const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');
const FRONTEND = path.join(ROOT, 'frontend');
const VITEST_PACKAGE = require.resolve('vitest/package.json', { paths: [FRONTEND] });
const VITEST_CLI = path.join(path.dirname(VITEST_PACKAGE), 'vitest.mjs');
const SHEET = path.join(FRONTEND, 'src/components/ui/sheet.tsx');
const COMPONENTS = path.join(FRONTEND, 'src/features/record-workspace/components');

test('Given workspace trust primitives When their component contracts run Then copy and context boundaries pass', () => {
  // Given the frontend trust primitive behavior suite.
  // When Vitest renders the public component output.
  const result = spawnSync(
    process.execPath,
    [VITEST_CLI, '--run', 'src/features/record-workspace/components/primitives.test.tsx'],
    { cwd: FRONTEND, encoding: 'utf8' },
  );

  // Then the component behavior completes without a failed scenario.
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('Given the mobile Sheet When its source contract is inspected Then accessibility and motion guards are present', () => {
  // Given the shadcn-compatible Sheet implementation.
  const source = fs.readFileSync(SHEET, 'utf8');

  // When accessibility, touch, safe-area, and reduced-motion contracts are inspected.
  // Then all guards exist without decorative motion or excessive radius.
  assert.ok(source.includes('@radix-ui/react-dialog'));
  assert.match(source, /SheetTitle/);
  assert.match(source, /SheetDescription/);
  assert.match(source, /h-11 w-11/);
  assert.match(source, /safe-area-inset-bottom/);
  assert.match(source, /motion-reduce:duration-0/);
  assert.doesNotMatch(source, /gradient|rounded-(?:xl|2xl|3xl)|animate-(?:bounce|pulse)/);
});

test('Given record workspace component sources When trust copy is scanned Then prohibited claims and decoration are absent', () => {
  // Given every shared record workspace component source file.
  const source = fs.readdirSync(COMPONENTS)
    .filter((file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx'))
    .map((file) => fs.readFileSync(path.join(COMPONENTS, file), 'utf8'))
    .join('\n');

  // When product language and visual constraints are scanned.
  // Then the shared primitives contain no prohibited claim or decorative pattern.
  assert.doesNotMatch(source, /현 소속|전체 기록|gradient|rounded-(?:xl|2xl|3xl)|animate-(?:bounce|pulse)/);
  assert.match(source, /text-body-sm/);
  assert.match(source, /min-h-11/);
});
