const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const repoRoot = path.resolve(__dirname, '..', '..');
const contentPath = path.join(repoRoot, 'frontend', 'src', 'pages', 'aboutDataContent.ts');
const footerPath = path.join(repoRoot, 'frontend', 'src', 'components', 'layout', 'Footer.tsx');

test('AboutData content explains source ledger and KOGL type 4', () => {
  const content = fs.readFileSync(contentPath, 'utf8');

  assert.match(content, /SOURCE_LEDGER_FIELDS/);
  assert.match(content, /파일명/);
  assert.match(content, /다운로드 주소/);
  assert.match(content, /수집일/);
  assert.match(content, /해시/);
  assert.match(content, /공공누리 4유형/);
  assert.match(content, /상업적 이용금지/);
  assert.match(content, /변경금지/);
});

test('Footer links to the public data collection explanation', () => {
  const footer = fs.readFileSync(footerPath, 'utf8');

  assert.match(footer, /자료 수집 방식/);
  assert.match(footer, /\/about-data/);
});
