const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');

const { PostgresEditorialRepository } = require('../../card-studio/repositories/postgresEditorialRepository');
const { EditorialIssueService } = require('../../card-studio/services/editorialIssueService');
const {
  applyEditorialMigrations,
  connectionString,
  createExistingFixture,
  isolatedPool,
} = require('./helpers/communityEditorialPostgresHarness');

const ACTOR_ID = '00000000-0000-4000-8000-000000000001';

function draft() {
  return {
    seasonYear: 2026,
    slot: 9,
    sectionKey: 'record-story',
    title: 'Protected magazine post',
    content: 'Public result context with source attribution.',
    author: '애타 편집팀',
    summary: 'A protected editorial summary.',
    whyNow: 'The competition result was published this week.',
    discussionQuestion: 'Which result stood out?',
    relatedUrl: '/competitions',
    subjectAgeGroup: 'adult',
    actorUserId: ACTOR_ID,
  };
}

async function publish(service) {
  let issue = await service.createIssue(draft());
  const source = await service.addSource({
    issueId: issue.id,
    expectedVersion: issue.version,
    actorUserId: ACTOR_ID,
    sourceUrl: 'https://example.com/results.pdf',
    sourceKind: 'official',
    title: 'Official results',
  });
  issue = await service.act('check', {
    issueId: issue.id, expectedVersion: source.issueVersion, actorUserId: ACTOR_ID,
  });
  issue = await service.act('approve', {
    issueId: issue.id, expectedVersion: issue.version, actorUserId: ACTOR_ID,
  });
  return service.act('publish', {
    issueId: issue.id, expectedVersion: issue.version, actorUserId: ACTOR_ID,
  });
}

async function startPostsApi(pool) {
  const app = express();
  app.locals.pool = pool;
  app.use(express.json());
  app.use('/api/posts/:postId/poll', require('../routes/polls'));
  app.use('/api/posts', require('../routes/posts'));
  app.use('/api/legacy-posts', require('../routes/posts'));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function mutate(baseUrl, method, postId, body) {
  const response = await fetch(`${baseUrl}/api/posts/${postId}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

test('EDITORIAL-POST-BOUNDARY-PG-001: legacy update and delete cannot alter a magazine post', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  const pool = await isolatedPool(t, 'editorial_post_boundary');
  await createExistingFixture(pool);
  await applyEditorialMigrations(pool);
  const service = new EditorialIssueService(new PostgresEditorialRepository(pool), {
    resolveHostname: async () => [{ address: '93.184.216.34', family: 4 }],
  });
  const published = await publish(service);
  const beforeIssue = await pool.query(
    'SELECT status, version FROM editorial_issues WHERE id=$1', [published.id],
  );
  const beforeEvents = await pool.query(
    'SELECT COUNT(*)::int AS count FROM editorial_events WHERE issue_id=$1', [published.id],
  );
  const api = await startPostsApi(pool);
  t.after(api.close);

  const updated = await mutate(api.baseUrl, 'PUT', published.postId, {
    title: 'Tampered', content: 'Tampered', password: 'guess',
  });
  const deleted = await mutate(api.baseUrl, 'DELETE', published.postId, {
    password: 'guess', deleteReason: 'bypass',
  });
  const pollVote = await fetch(`${api.baseUrl}/api/posts/${published.postId}/poll/vote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ user_id: ACTOR_ID, option_ids: [1] }),
  });
  const pollDelete = await fetch(`${api.baseUrl}/api/posts/${published.postId}/poll/vote`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ user_id: ACTOR_ID }),
  });
  const inlinePoll = await fetch(`${api.baseUrl}/api/legacy-posts/${published.postId}/poll/vote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ visitorId: 'visitor', optionId: 1 }),
  });

  assert.equal(updated.status, 409);
  assert.equal(deleted.status, 409);
  assert.deepEqual([pollVote.status, pollDelete.status, inlinePoll.status], [409, 409, 409]);
  assert.equal(updated.body.code, 'EDITORIAL_POST_MANAGED');
  const post = await pool.query('SELECT title, deleted_at FROM posts WHERE id=$1', [published.postId]);
  assert.deepEqual(post.rows, [{ title: draft().title, deleted_at: null }]);
  assert.deepEqual(
    (await pool.query('SELECT status, version FROM editorial_issues WHERE id=$1', [published.id])).rows,
    beforeIssue.rows,
  );
  assert.deepEqual(
    (await pool.query('SELECT COUNT(*)::int AS count FROM editorial_events WHERE issue_id=$1', [published.id])).rows,
    beforeEvents.rows,
  );
});
