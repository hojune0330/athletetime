const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('COMM-LAUNCH-001: community shows a prepared state and does not fetch posts or render publishing controls', () => {
  const source = readSource('frontend/src/pages/CommunityPage.tsx');

  assert.match(source, /FeaturePreparingPage/);
  assert.match(source, /커뮤니티는 준비 중이에요/);
  assert.doesNotMatch(source, /usePosts|CommunityQuickPostForm|PostList|글쓰기/);
});

test('COMM-LAUNCH-002: all former community writing and reading routes resolve to the prepared page', () => {
  const source = readSource('frontend/src/App.tsx');

  for (const route of ['best', 'board/:boardId', 'post/:postId']) {
    assert.ok(source.includes(`<Route path="${route}" element={lazyPage(<CommunityPage />)} />`));
  }

  assert.ok(source.includes('<Route path="/write" element={<Layout />}>\n              <Route index element={lazyPage(<CommunityPage />)} />'));
  assert.ok(source.includes('<Route path="/edit/:postId" element={<Layout />}>\n              <Route index element={lazyPage(<CommunityPage />)} />'));
});

test('COMM-LAUNCH-003: prepared-state copy stays factual and avoids false opening promises', () => {
  const source = readSource('frontend/src/components/common/FeaturePreparingPage.tsx');

  assert.match(source, /안전한 운영 기준과 신고·검토 절차/);
  assert.doesNotMatch(source, /곧|출시|오픈 예정|AI 검증/);
});
