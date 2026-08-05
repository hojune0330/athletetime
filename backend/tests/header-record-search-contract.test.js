const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

// 2C-4에서 Header.tsx의 기록 검색바가 HeaderSearchBar.tsx로 분리되었다.
// 테스트는 구현 위치가 아니라 동작 계약을 검증해야 하므로,
// 대상 파일을 HeaderSearchBar.tsx로 정합한다 (3D).
test('global record search submits one trimmed canonical navigation and protects IME composition', () => {
  const searchBar = fs.readFileSync(
    path.join(ROOT, 'frontend/src/components/layout/HeaderSearchBar.tsx'),
    'utf8',
  );

  assert.match(searchBar, /import type \{ FormEvent, KeyboardEvent as ReactKeyboardEvent \} from 'react'/);
  assert.match(searchBar, /const handleSearchKeyDown = \(event: ReactKeyboardEvent<HTMLInputElement>\)/);
  assert.match(searchBar, /<form role="search" onSubmit=\{submitSearch\}/);
  assert.match(searchBar, /name="record-search"/);
  assert.match(searchBar, /event\.currentTarget\.form\?\.requestSubmit\(\)/);
  const searchFormStart = searchBar.indexOf('<form role="search"');
  const searchFormEnd = searchBar.indexOf('</form>', searchFormStart);
  const searchForm = searchBar.slice(searchFormStart, searchFormEnd);
  assert.match(searchForm, /type="submit"/);
  assert.match(searchForm, /aria-label="기록 검색"/);
  assert.match(searchForm, /<MagnifyingGlassIcon/);
  assert.match(searchBar, /const trimmed = query\.trim\(\)/);
  assert.match(searchBar, /if \(!trimmed\) \{\s*inputRef\.current\?\.focus\(\)/);
  assert.match(searchBar, /navigate\(`\/records\?q=\$\{encodeURIComponent\(trimmed\)\}`\)/);
  assert.match(searchBar, /event\.nativeEvent\.isComposing/);
  assert.equal(searchBar.includes('recordSearchComposing'), false);

  const submitBlock = searchBar.slice(
    searchBar.indexOf('const submitSearch'),
    searchBar.indexOf('const handleSearchKeyDown'),
  );
  assert.equal((submitBlock.match(/navigate\(/g) || []).length, 1);
  assert.equal(submitBlock.includes('/api/'), false);
  assert.equal(submitBlock.includes('isComposing'), false);
});
