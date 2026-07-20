const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');
const { createEditorialAdminRouter, createEditorialPublicRouter } = require('../routes/editorialAdmin');
const { requireCsrfForCookieAuth } = require('../utils/authCookies');
const { PostgresEditorialRepository } = require('../../card-studio/repositories/postgresEditorialRepository');
const { EditorialIssueService } = require('../../card-studio/services/editorialIssueService');
const {
  applyEditorialMigrations,
  connectionString,
  createExistingFixture,
  isolatedPool,
} = require('./helpers/communityEditorialPostgresHarness');

const ACTOR_ID = '00000000-0000-4000-8000-000000000001';
const TEST_RESOLVER = async () => [{ address: '93.184.216.34', family: 4 }];

function issueBody(slot = 1) {
  return {
    seasonYear: 2026,
    slot,
    sectionKey: 'competition-preview',
    title: `이번 대회에서 볼 기록 ${slot}`,
    content: '확인한 경기 결과를 출처와 함께 정리했습니다.',
    author: '애타 편집팀',
    summary: '이번 주 경기에서 볼 기록을 정리했어요.',
    whyNow: '이번 주에 경기가 열려요.',
    discussionQuestion: '어떤 종목이 가장 궁금한가요?',
    relatedUrl: '/competitions',
    subjectAgeGroup: 'adult',
  };
}

function auth(req, res, next) {
  const role = req.get('X-Test-Role');
  if (!role) return res.status(401).json({ success: false, error: '로그인이 필요합니다' });
  req.user = { id: ACTOR_ID, isAdmin: role === 'admin' };
  return next();
}

function admin(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ success: false, error: '관리자 권한이 필요합니다' });
  return next();
}

async function startApi(service) {
  const app = express();
  app.use(express.json());
  app.use(requireCsrfForCookieAuth);
  app.use('/api/editorial', createEditorialPublicRouter({ service }));
  app.use('/api/admin/editorial', auth, admin, createEditorialAdminRouter({ service }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function request(baseUrl, method, pathname, body, headers = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

test('EDITORIAL-API-PG-001: HTTP workflow is versioned, audited, and published once', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  const pool = await isolatedPool(t, 'editorial_api');
  await createExistingFixture(pool);
  await applyEditorialMigrations(pool);
  const service = new EditorialIssueService(new PostgresEditorialRepository(pool), {
    resolveHostname: TEST_RESOLVER,
  });
  const api = await startApi(service);
  t.after(api.close);
  const headers = { 'X-Test-Role': 'admin' };

  const created = await request(api.baseUrl, 'POST', '/api/admin/editorial/issues', issueBody(), headers);
  assert.equal(created.status, 201);
  assert.equal(created.body.issue.version, 1);
  assert.equal(created.body.issue.sectionKey, 'competition-preview');
  assert.equal(created.body.issue.calendarState, 'drafting');
  const issueId = created.body.issue.id;

  const revisions = await request(
    api.baseUrl, 'GET', `/api/admin/editorial/issues/${issueId}/revisions`, undefined, headers,
  );
  assert.equal(revisions.status, 200);
  assert.equal(revisions.body.revisions.length, 1);
  assert.equal(revisions.body.revisions[0].revisionNumber, 1);

  const source = await request(api.baseUrl, 'POST', `/api/admin/editorial/issues/${issueId}/sources`, {
    expectedVersion: 1,
    sourceUrl: 'https://example.com/results.pdf',
    sourceKind: 'official',
    title: '대회 결과',
    publisher: '대회 주최 측',
  }, headers);
  assert.equal(source.status, 201);
  assert.equal(source.body.source.issueVersion, 2);

  const checked = await request(api.baseUrl, 'POST', `/api/admin/editorial/issues/${issueId}/check`, {
    expectedVersion: 2,
  }, headers);
  assert.equal(checked.status, 200);
  assert.equal(checked.body.issue.version, 3);
  assert.equal(checked.body.issue.sectionKey, 'competition-preview');
  assert.equal(checked.body.issue.calendarState, 'ready');

  const approved = await request(api.baseUrl, 'POST', `/api/admin/editorial/issues/${issueId}/approve`, {
    expectedVersion: 3,
  }, headers);
  assert.equal(approved.status, 200);
  assert.equal(approved.body.issue.version, 4);
  const audit = await pool.query('SELECT event_type FROM editorial_events WHERE issue_id=$1 ORDER BY id', [issueId]);
  assert.deepEqual(audit.rows.map((row) => row.event_type), [
    'created', 'source_added', 'status_changed', 'status_changed',
  ]);

  const beforeConflict = await pool.query('SELECT version FROM editorial_issues WHERE id=$1', [issueId]);
  const conflict = await request(api.baseUrl, 'POST', `/api/admin/editorial/issues/${issueId}/publish`, {
    expectedVersion: 3,
  }, headers);
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.code, 'EDITORIAL_VERSION_CONFLICT');
  const afterConflict = await pool.query('SELECT version FROM editorial_issues WHERE id=$1', [issueId]);
  assert.deepEqual(afterConflict.rows, beforeConflict.rows);

  const published = await request(api.baseUrl, 'POST', `/api/admin/editorial/issues/${issueId}/publish`, {
    expectedVersion: 4,
  }, headers);
  assert.equal(published.status, 200);
  assert.equal(published.body.issue.version, 5);
  const posts = await pool.query('SELECT COUNT(*)::int AS count FROM posts WHERE id=$1', [published.body.issue.postId]);
  assert.equal(posts.rows[0].count, 1);
  await pool.query('UPDATE posts SET comments_count=7 WHERE id=$1', [published.body.issue.postId]);

  const magazine = await request(api.baseUrl, 'GET', '/api/editorial/magazine');
  assert.equal(magazine.status, 200);
  assert.equal(magazine.body.issues.length, 1);
  assert.equal(magazine.body.issues[0].title, issueBody().title);
  assert.equal(magazine.body.issues[0].commentsCount, 7);
  for (const privateField of ['lastActorUserId', 'policyFingerprint', 'internalPrompt', 'auditIp']) {
    assert.equal(JSON.stringify(magazine.body).includes(privateField), false);
  }

  const corrected = await request(api.baseUrl, 'POST', `/api/admin/editorial/issues/${issueId}/correct`, {
    expectedVersion: 5,
    title: '바로잡은 대회 기록',
    content: '원출처를 다시 확인해 수치를 바로잡았습니다.',
    summary: '확인한 수치로 내용을 바로잡았어요.',
    whyNow: '잘못 적힌 수치를 확인했어요.',
    discussionQuestion: '바뀐 기록을 확인하셨나요?',
    relatedUrl: '/competitions',
    subjectAgeGroup: 'adult',
    reviewNote: '원출처 수치와 다시 대조함',
  }, headers);
  assert.equal(corrected.status, 200);
  assert.equal(corrected.body.issue.status, 'corrected');
  assert.equal(corrected.body.issue.version, 6);
  const correctedPost = await pool.query('SELECT title, content FROM posts WHERE id=$1', [published.body.issue.postId]);
  assert.deepEqual(correctedPost.rows[0], {
    title: '바로잡은 대회 기록',
    content: '원출처를 다시 확인해 수치를 바로잡았습니다.',
  });
  const publicCorrection = await request(
    api.baseUrl, 'GET', `/api/editorial/magazine/${created.body.issue.slug}`,
  );
  assert.equal(publicCorrection.status, 200);
  assert.equal(publicCorrection.body.issue.status, 'corrected');
  assert.equal(publicCorrection.body.issue.title, '바로잡은 대회 기록');
});

test('EDITORIAL-API-PG-003: source create, read, update, and delete each use a fresh version', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  const pool = await isolatedPool(t, 'editorial_source_crud');
  await createExistingFixture(pool);
  await applyEditorialMigrations(pool);
  const service = new EditorialIssueService(new PostgresEditorialRepository(pool), {
    resolveHostname: TEST_RESOLVER,
  });
  const issue = await service.createIssue({ ...issueBody(3), actorUserId: ACTOR_ID });
  const added = await service.addSource({
    issueId: issue.id, expectedVersion: 1, actorUserId: ACTOR_ID,
    sourceUrl: 'https://example.com/original', sourceKind: 'official', title: '원본 결과',
  });
  assert.equal(added.issueVersion, 2);
  const updated = await service.updateSource({
    issueId: issue.id, sourceId: added.id, expectedVersion: 2, actorUserId: ACTOR_ID,
    sourceUrl: 'https://example.com/revised', sourceKind: 'primary', title: '수정된 결과',
  });
  assert.equal(updated.issueVersion, 3);
  const listed = await service.listSources(issue.id);
  assert.deepEqual(listed.map((source) => source.sourceUrl), ['https://example.com/revised']);
  await assert.rejects(service.deleteSource({
    issueId: issue.id, sourceId: added.id, expectedVersion: 2, actorUserId: ACTOR_ID,
  }), (error) => error.code === 'EDITORIAL_VERSION_CONFLICT');
  const removed = await service.deleteSource({
    issueId: issue.id, sourceId: added.id, expectedVersion: 3, actorUserId: ACTOR_ID,
  });
  assert.equal(removed.issueVersion, 4);
  assert.deepEqual(await service.listSources(issue.id), []);
  const events = await pool.query(
    "SELECT event_type FROM editorial_events WHERE issue_id=$1 AND event_type LIKE 'source_%' ORDER BY id",
    [issue.id],
  );
  assert.deepEqual(events.rows.map((row) => row.event_type), [
    'source_added', 'source_updated', 'source_deleted',
  ]);
});

test('EDITORIAL-API-PG-002: reject and cancel are calendar outcomes, not invented issue states', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  const pool = await isolatedPool(t, 'editorial_finish');
  await createExistingFixture(pool);
  await applyEditorialMigrations(pool);
  const repository = new PostgresEditorialRepository(pool);
  const service = new EditorialIssueService(repository, { resolveHostname: TEST_RESOLVER });
  const first = await service.createIssue({ ...issueBody(1), actorUserId: ACTOR_ID });
  const cancelled = await service.act('cancel', {
    issueId: first.id, expectedVersion: 1, actorUserId: ACTOR_ID, note: '대회 일정 취소',
  });
  assert.equal(cancelled.status, 'draft');
  assert.equal(cancelled.calendarState, 'cancelled');
  assert.equal(cancelled.version, 2);

  const second = await service.createIssue({ ...issueBody(2), actorUserId: ACTOR_ID });
  const withSource = await service.addSource({
    issueId: second.id,
    expectedVersion: 1,
    actorUserId: ACTOR_ID,
    sourceUrl: 'https://example.com/result-2',
    sourceKind: 'official',
    title: '대회 결과',
  });
  const ready = await service.act('check', {
    issueId: second.id, expectedVersion: withSource.issueVersion, actorUserId: ACTOR_ID,
  });
  const rejected = await service.act('reject', {
    issueId: second.id, expectedVersion: ready.version, actorUserId: ACTOR_ID, note: '출처 보완 필요',
  });
  assert.equal(rejected.status, 'review_ready');
  assert.equal(rejected.calendarState, 'skipped');
  const publicPosts = await pool.query('SELECT COUNT(*)::int AS count FROM posts WHERE id > 1');
  assert.equal(publicPosts.rows[0].count, 0);
  const events = await pool.query(
    "SELECT event_type, note FROM editorial_events WHERE issue_id=$1 AND event_type IN ('rejected','cancelled')",
    [second.id],
  );
  assert.deepEqual(events.rows, [{ event_type: 'rejected', note: '출처 보완 필요' }]);
});
