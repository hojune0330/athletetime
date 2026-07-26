const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('record share and community handoff stay unavailable until both policies explicitly enable them', () => {
  const records = readSource('frontend/src/pages/RecordsPage.tsx');
  const policy = readSource('frontend/src/config/dataPolicy.ts');
  const community = readSource('frontend/src/pages/CommunityPage.tsx');

  assert.match(records, /SHARE_POLICY\.status === 'enabled'/);
  assert.match(policy, /status: 'disabled'/);
  assert.match(community, /커뮤니티는 준비 중이에요/);
  assert.doesNotMatch(community, /자동으로 글을 만들지 않아요|CommunityQuickPostForm/);
});
