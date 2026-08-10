const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const UTF8 = new TextDecoder('utf-8', { fatal: true });
const TRUST_SURFACES = [
  ['frontend/src/pages/RecordsPage.tsx', 1_000],
  ['frontend/src/pages/DataRequestPage.tsx', 500],
  ['frontend/src/features/team-performance/TeamPerformancePage.tsx', 300],
  ['frontend/src/config/dataPolicy.ts', 2_000],
];

function readUtf8(relativePath) {
  return UTF8.decode(fs.readFileSync(path.join(ROOT, relativePath)));
}

test('Given trust surfaces When their source is read Then Korean copy remains valid UTF-8', () => {
  for (const [relativePath, minimumHangulCount] of TRUST_SURFACES) {
    const source = readUtf8(relativePath);
    const hangulCount = (source.match(/[\uAC00-\uD7A3]/gu) || []).length;

    assert.equal(source.includes('\uFFFD'), false, `${relativePath} must not contain replacement characters`);
    assert.equal(/[\x00-\x08\x0B\x0C\x0E-\x1F]/u.test(source), false, `${relativePath} must not contain control characters`);
    assert.ok(hangulCount >= minimumHangulCount, `${relativePath} must retain readable Korean copy`);
  }
});
