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

  assert.ok(app.includes('path="content/magazine"'));
  assert.ok(app.includes('AdminIssueEditorPage'));
  assert.ok(layout.includes('/admin/content/magazine'));
  assert.ok(layout.includes('매거진 편집실'));
});

test('EDITORIAL-ROOM-002: editor exposes the full human review workflow', () => {
  const page = [
    read('frontend/src/pages/admin/AdminIssueEditorPage.tsx'),
    read('frontend/src/components/admin/editorial/editorialLabels.ts'),
  ].join(String.fromCharCode(10));
  const editor = [
    read('frontend/src/components/admin/editorial/IssueEditorPanel.tsx'),
    read('frontend/src/components/admin/editorial/PublicPreview.tsx'),
  ].join(String.fromCharCode(10));
  const sources = read('frontend/src/components/admin/editorial/SourceChecklist.tsx');

  for (const label of ['후보', '초안', '검토 대기', '예약', '발행', '정정']) {
    assert.ok(page.includes(label));
  }
  for (const label of ['공개 화면 미리보기', '왜 지금인가', '대화 질문']) {
    assert.ok(editor.includes(label));
  }
  assert.ok(sources.includes('출처를 1개 이상 확인해 주세요'));
  assert.ok(sources.includes('승인할 수 없'));
});

test('EDITORIAL-ROOM-003: API client persists versions, sources, checks, and KST schedules', () => {
  const api = read('frontend/src/api/editorialAdmin.ts');

  for (const value of [
    "EDITORIAL_ADMIN_BASE = '/api/admin/editorial'",
    'EDITORIAL_ADMIN_BASE}/calendar',
    'EDITORIAL_ADMIN_BASE}/issues',
    'expectedVersion',
    '/sources',
    "'check' | 'approve'",
    '/schedule',
    '+09:00',
  ]) {
    assert.ok(api.includes(value));
  }
});

test('EDITORIAL-ROOM-004: editor has no fake story, provider control, or automatic publish control', () => {
  const source = [
    read('frontend/src/pages/admin/AdminIssueEditorPage.tsx'),
    read('frontend/src/components/admin/editorial/IssueEditorPanel.tsx'),
    read('frontend/src/api/editorialAdmin.ts'),
  ].join(String.fromCharCode(10));

  for (const forbidden of ['심종섭', '김국영', '홍길동', '예시 선수', 'provider', '모델 선택', '자동 발행', 'AI 초안']) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

test('EDITORIAL-SCHEDULER-UI-001: Given scheduler jobs When an administrator opens an issue Then only safe retry details are shown', () => {
  // Given
  const page = read('frontend/src/pages/admin/AdminIssueEditorPage.tsx');
  const api = read('frontend/src/api/editorialAdmin.ts');
  const panel = read('frontend/src/components/admin/editorial/PublishJobStatusPanel.tsx');

  // When
  const surface = [page, api, panel].join(String.fromCharCode(10));

  // Then
  for (const value of ['publish-jobs', 'retry-publish', 'expectedVersion: issue.version']) {
    assert.ok(api.includes(value));
  }
  for (const label of ['재시도 중', '실패', '시도 횟수', '다음 시도', '문제 코드', '다시 예약']) {
    assert.ok(panel.includes(label));
  }
  for (const forbidden of ['rawError', 'actorUserId', 'accessToken', 'refreshToken']) {
    assert.equal(surface.includes(forbidden), false, forbidden);
  }
});

test('EDITORIAL-SCHEDULER-UI-002: the selected issue shows queued, retrying, failed, and completed publication states', () => {
  const page = read('frontend/src/pages/admin/AdminIssueEditorPage.tsx');
  const api = read('frontend/src/api/editorialAdmin.ts');
  const panel = read('frontend/src/components/admin/editorial/PublishJobStatusPanel.tsx');
  const surface = [page, api, panel].join(String.fromCharCode(10));

  assert.ok(api.includes('listEditorialPublishJobs'));
  assert.ok(api.includes('`${EDITORIAL_ADMIN_BASE}/publish-jobs`'));
  assert.ok(api.includes('`${EDITORIAL_ADMIN_BASE}/publish-jobs/warnings`'));
  assert.ok(api.includes("error.response?.status !== 404"));
  for (const status of ['queued', 'retrying', 'failed', 'completed']) {
    assert.ok(surface.includes(`'${status}'`), status);
  }
  for (const forbidden of ['rawError', 'actorUserId', 'accessToken', 'refreshToken']) {
    assert.equal(surface.includes(forbidden), false, forbidden);
  }
});
