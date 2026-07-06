const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('Given a selected athlete name When opening profile card static builders Then the name query is preserved in the handoff UI', () => {
  const wizardPath = path.join(ROOT, 'frontend/public/profile-card-wizard.html');
  const modularPath = path.join(ROOT, 'frontend/public/profile-card-modular.html');

  assert.equal(fs.existsSync(wizardPath), true);
  assert.equal(fs.existsSync(modularPath), true);

  const combined = [readSource('frontend/public/profile-card-wizard.html'), readSource('frontend/public/profile-card-modular.html')].join('\n');
  assert.match(combined, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(combined, /selected-athlete-name/);
  assert.match(combined, /records\?q=\$\{encodeURIComponent\(selectedName\)\}/);
  assert.match(combined, /직접 확인한 뒤 공유해 주세요/);
  assert.doesNotMatch(combined, /공식 인증|내 기록 인증|자동 작성|AI 검증/);
});

test('Given a record query When opening community Then it shows a discussion prompt without auto-post wording', () => {
  const source = [
    readSource('frontend/src/pages/CommunityPage.tsx'),
    readSource('frontend/src/components/community/RecordContextPrompt.tsx'),
    readSource('frontend/src/components/community/CommunityQuickPostForm.tsx'),
    readSource('frontend/src/components/community/CommunityImagePicker.tsx'),
    readSource('frontend/src/components/community/CommunityPollBuilder.tsx'),
  ].join('\n');

  assert.match(source, /const recordContext = cleanRecordContext\(searchParams\.get\('record'\) \|\| ''\)/);
  assert.match(source, /handleStartRecordDiscussion/);
  assert.match(source, /이 기록 이야기하기/);
  assert.match(source, /자동으로 글을 만들지 않아요/);
  assert.match(source, /initialTitle/);
  assert.match(source, /setNewPost\(\(prev\) => \(\{/);
  assert.doesNotMatch(source, /공식 인증|내 기록 인증|자동 작성|AI 검증/);
});
