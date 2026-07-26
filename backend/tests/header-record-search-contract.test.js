const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

test('global record search submits one trimmed canonical navigation and protects IME composition', () => {
  const header = fs.readFileSync(
    path.join(ROOT, 'frontend/src/components/layout/Header.tsx'),
    'utf8',
  );

  assert.match(header, /import type \{ FormEvent, KeyboardEvent as ReactKeyboardEvent \} from 'react'/);
  assert.match(header, /const handleKeyDown = \(event: KeyboardEvent\)/);
  assert.match(header, /const handleRecordSearchKeyDown = \(event: ReactKeyboardEvent<HTMLInputElement>\)/);
  assert.match(header, /<form role="search" onSubmit=\{submitRecordSearch\}/);
  assert.match(header, /name="record-search"/);
  assert.match(header, /event\.currentTarget\.form\?\.requestSubmit\(\)/);
  const searchFormStart = header.indexOf('<form role="search"');
  const searchFormEnd = header.indexOf('</form>', searchFormStart);
  const searchForm = header.slice(searchFormStart, searchFormEnd);
  assert.match(searchForm, /type="submit"/);
  assert.match(searchForm, /aria-label="기록 검색"/);
  assert.match(searchForm, /<MagnifyingGlassIcon/);
  assert.match(header, /const trimmed = recordSearchQuery\.trim\(\)/);
  assert.match(header, /if \(!trimmed\) \{\s*recordSearchInputRef\.current\?\.focus\(\)/);
  assert.match(header, /navigate\(`\/records\?q=\$\{encodeURIComponent\(trimmed\)\}`\)/);
  assert.match(header, /event\.nativeEvent\.isComposing/);
  assert.equal(header.includes('recordSearchComposing'), false);

  const submitBlock = header.slice(
    header.indexOf('const submitRecordSearch'),
    header.indexOf('const handleRecordSearchKeyDown'),
  );
  assert.equal((submitBlock.match(/navigate\(/g) || []).length, 1);
  assert.equal(submitBlock.includes('/api/'), false);
  assert.equal(submitBlock.includes('isComposing'), false);
});
