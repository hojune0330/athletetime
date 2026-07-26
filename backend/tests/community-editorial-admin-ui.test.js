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

test('NEWS-INBOX-UI-001: Given the protected editor When an administrator opens it Then news discovery is a human review inbox', () => {
  // Given
  const page = read('frontend/src/pages/admin/AdminIssueEditorPage.tsx');
  const inbox = read('frontend/src/components/admin/editorial/NewsDiscoveryInbox.tsx');
  const hook = read('frontend/src/hooks/useNewsDiscoveries.ts');
  const api = read('frontend/src/api/editorialNewsDiscoveries.ts');

  // When
  const surface = [page, inbox, hook, api].join(String.fromCharCode(10));

  // Then
  for (const label of ['오늘 소식 가져오기', '오늘', '이번 달', '원문 출처 확인', '일정 연결', '제외']) {
    assert.ok(surface.includes(label), label);
  }
  for (const status of ['discovered', 'reviewing', 'source_confirmed', 'calendar_linked', 'dismissed']) {
    assert.ok(surface.includes(`'${status}'`), status);
  }
  assert.ok(page.includes('NewsDiscoveryInbox'));
  assert.ok(api.includes("'/api/admin/editorial/news-discoveries'"));
});

test('NEWS-INBOX-UI-002: Given a discovery When it has no confirmed original source Then calendar linking is unavailable', () => {
  // Given
  const inbox = read('frontend/src/components/admin/editorial/NewsDiscoveryInbox.tsx');
  const api = read('frontend/src/api/editorialNewsDiscoveries.ts');

  // When
  const surface = [inbox, api].join(String.fromCharCode(10));

  // Then
  assert.ok(inbox.includes("discovery.status !== 'source_confirmed'"));
  assert.ok(api.includes('expectedCalendarVersion'));
  assert.equal(surface.includes('자동 발행'), false);
  assert.equal(surface.includes('AI 초안'), false);
  assert.equal(surface.includes('NAVER 공식'), false);
});

test('NEWS-INBOX-UI-003: Given untrusted discovery data When the inbox renders it Then parsing fails closed and actions remain single-flight', () => {
  // Given
  const api = read('frontend/src/api/editorialNewsDiscoveries.ts');
  const hook = read('frontend/src/hooks/useNewsDiscoveries.ts');
  const inbox = read('frontend/src/components/admin/editorial/NewsDiscoveryInbox.tsx');

  // When
  const surface = [api, hook, inbox].join(String.fromCharCode(10));

  // Then
  for (const guard of ['소식 응답 형식이 올바르지 않습니다.', 'body.discoveries.map(discovery)', 'body.runs.map(run)', 'busyId: id']) {
    assert.ok(surface.includes(guard), guard);
  }
  assert.ok(inbox.includes('disabled={isBusy(discovery.id, busyId)}'));
  assert.ok(inbox.includes('{discovery.title}'));
  assert.equal(surface.includes('dangerouslySetInnerHTML'), false);
});

test('NEWS-INBOX-UI-004: Given discovery workflow states When reviewing sources Then only backend-valid controls and safe links are rendered', () => {
  // Given
  const inbox = read('frontend/src/components/admin/editorial/NewsDiscoveryInbox.tsx');
  const api = read('frontend/src/api/editorialNewsDiscoveries.ts');

  // When
  const surface = [inbox, api].join(String.fromCharCode(10));

  // Then
  assert.ok(inbox.includes("discovery.status === 'reviewing'"));
  assert.ok(inbox.includes('target="_blank" rel="noopener noreferrer"'));
  assert.ok(inbox.includes('credentials_missing'));
  assert.ok(inbox.includes('provider_quota'));
  assert.equal(surface.includes("'internal'"), false);
  assert.equal(surface.includes('자동 재시도'), false);
});

test('NEWS-INBOX-UI-005: Given more discovery pages When filters change Then cursor paging is explicit and the first page replaces stale results', () => {
  // Given
  const api = read('frontend/src/api/editorialNewsDiscoveries.ts');
  const hook = read('frontend/src/hooks/useNewsDiscoveries.ts');
  const inbox = read('frontend/src/components/admin/editorial/NewsDiscoveryInbox.tsx');

  // When
  const surface = [api, hook, inbox].join(String.fromCharCode(10));

  // Then
  for (const contract of ['nextCursor', 'loadMore', 'loadingMore', 'cursor', '더 보기', '수집 중', '완료']) {
    assert.ok(surface.includes(contract), contract);
  }
  assert.ok(hook.includes('nextCursor: page.nextCursor'));
  assert.ok(hook.includes('discoveries: [], nextCursor: null'));
  assert.ok(hook.includes('discoveries: [...current.discoveries, ...page.discoveries]'));
});
