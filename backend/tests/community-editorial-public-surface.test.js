const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('MAGAZINE-SURFACE-001: community keeps people posts and adds a magazine entry', () => {
  const page = read('frontend/src/pages/CommunityPage.tsx');
  const tabs = read('frontend/src/components/community/CommunityBoardTabs.tsx');

  assert.match(page, /CommunityMagazineShelf/);
  assert.match(page, /CommunityBestStrip/);
  assert.match(page, /PostList/);
  assert.match(tabs, /전체글/);
  assert.match(tabs, /매거진/);
  assert.match(tabs, /\/community\/magazine/);
});

test('MAGAZINE-SURFACE-002: published issues have a dedicated filterable list', () => {
  const page = read('frontend/src/pages/CommunityMagazinePage.tsx');
  const card = read('frontend/src/components/community/MagazineCard.tsx');

  for (const label of ['전체', '이번 대회', '기록 이야기', '국제', '로드·마라톤', '실내', '아카이브']) {
    assert.match(page, new RegExp(label));
  }
  assert.match(card, /commentsCount/);
  assert.match(card, /readingMinutes/);
  assert.match(card, /formatPublishedDate/);
  assert.doesNotMatch(card, /방금|오늘/);
});

test('MAGAZINE-SURFACE-003: empty or failed magazine data never replaces the community', () => {
  const shelf = read('frontend/src/components/community/CommunityMagazineShelf.tsx');
  const page = read('frontend/src/pages/CommunityPage.tsx');

  assert.match(shelf, /isError/);
  assert.match(shelf, /issues\.length === 0/);
  assert.match(shelf, /return null/);
  assert.match(page, /CommunityBestStrip/);
  assert.match(page, /CommunityQuickPostForm/);
});

test('MAGAZINE-SURFACE-004: public magazine API carries post comment counts', () => {
  const reads = read('card-studio/repositories/editorialRepositoryReads.js');
  const views = read('card-studio/repositories/editorialRepositoryViews.js');

  assert.match(reads, /p\.comments_count/);
  assert.match(views, /commentsCount/);
});

test('MAGAZINE-SURFACE-005: public magazine copy avoids authority claims', () => {
  const files = [
    'frontend/src/pages/CommunityMagazinePage.tsx',
    'frontend/src/components/community/CommunityMagazineShelf.tsx',
    'frontend/src/components/community/MagazineCard.tsx',
  ];

  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /공식|AI 검증|랭킹/, `${file} contains a forbidden public claim`);
  }
});
