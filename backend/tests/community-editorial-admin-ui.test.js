const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('EDITORIAL-ROOM-001: magazine editor stays inside the protected admin route', () => {
  const app = read('frontend/src/App.tsx');
  const layout = read('frontend/src/components/layout/AdminLayout.tsx');

  assert.match(app, /path="content\/magazine"/u);
  assert.match(app, /AdminIssueEditorPage/u);
  assert.match(layout, /\/admin\/content\/magazine/u);
  assert.match(layout, /매거진 편집실/u);
});

test('EDITORIAL-ROOM-002: editor exposes the full human review workflow', () => {
  const page = [
    read('frontend/src/pages/admin/AdminIssueEditorPage.tsx'),
    read('frontend/src/components/admin/editorial/editorialLabels.ts'),
  ].join('\n');
  const editor = [
    read('frontend/src/components/admin/editorial/IssueEditorPanel.tsx'),
    read('frontend/src/components/admin/editorial/PublicPreview.tsx'),
  ].join('\n');
  const sources = read('frontend/src/components/admin/editorial/SourceChecklist.tsx');

  for (const label of ['후보', '초안', '검토 대기', '예약', '발행', '정정']) {
    assert.match(page, new RegExp(label, 'u'));
  }
  assert.match(editor, /공개 화면 미리보기/u);
  assert.match(editor, /왜 지금인가/u);
  assert.match(editor, /대화 질문/u);
  assert.match(sources, /출처를 1개 이상 확인해 주세요/u);
  assert.match(sources, /승인할 수 없/u);
});

test('EDITORIAL-ROOM-003: API client persists versions, sources, checks, and KST schedules', () => {
  const api = read('frontend/src/api/editorialAdmin.ts');

  assert.match(api, /EDITORIAL_ADMIN_BASE = '\/api\/admin\/editorial'/u);
  assert.match(api, /EDITORIAL_ADMIN_BASE\}\/calendar/u);
  assert.match(api, /EDITORIAL_ADMIN_BASE\}\/issues/u);
  assert.match(api, /expectedVersion/u);
  assert.match(api, /\/sources/u);
  assert.match(api, /'check' \| 'approve'/u);
  assert.match(api, /\/schedule/u);
  assert.match(api, /\+09:00/u);
});

test('EDITORIAL-ROOM-004: editor has no fake story, provider control, or automatic publish control', () => {
  const source = [
    read('frontend/src/pages/admin/AdminIssueEditorPage.tsx'),
    read('frontend/src/components/admin/editorial/IssueEditorPanel.tsx'),
    read('frontend/src/api/editorialAdmin.ts'),
  ].join('\n');

  assert.doesNotMatch(source, /심종섭|김국영|홍길동|예시 선수/u);
  assert.doesNotMatch(source, /provider|모델 선택|자동 발행|AI 초안/u);
});
