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
  app.use('/api/posts', require('../routes/posts'));
  app.use('/api/posts/:postId/comments', require('../routes/comments'));
  app.use('/api/posts/:postId/vote', require('../routes/votes'));
  app.use('/api/posts/:postId/poll', require('../routes/polls'));
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

async function waitForBlockedBoundaryQueries(pool, expected) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const result = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM pg_locks
      WHERE locktype = 'advisory'
        AND database = (SELECT oid FROM pg_database WHERE datname = current_database())
        AND granted = FALSE
    `);
    if (result.rows[0].count >= expected) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Expected ${expected} blocked quarantine boundary queries`);
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

test('EDITORIAL-POST-QUARANTINE-PG-001: active quarantine hides list, detail, comments, votes, and polls until release', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  const pool = await isolatedPool(t, 'editorial_post_quarantine');
  await createExistingFixture(pool);
  await applyEditorialMigrations(pool);
  await pool.query(`
    ALTER TABLE categories ADD COLUMN icon VARCHAR(20), ADD COLUMN color VARCHAR(20);
    ALTER TABLE posts ADD COLUMN poll JSONB;
    CREATE TABLE images (
      id BIGSERIAL PRIMARY KEY,
      post_id BIGINT NOT NULL,
      cloudinary_id TEXT,
      cloudinary_url TEXT,
      thumbnail_url TEXT,
      width INTEGER,
      height INTEGER,
      format TEXT,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE comments (
      id BIGSERIAL PRIMARY KEY,
      post_id BIGINT NOT NULL,
      content TEXT,
      author TEXT,
      instagram TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      is_blinded BOOLEAN DEFAULT FALSE,
      deleted_at TIMESTAMPTZ
    );
  `);
  await pool.query(`
    INSERT INTO post_quarantines (
      id, post_id, status, reason_code, reason_detail, quarantined_by, quarantined_at
    ) VALUES (
      '30000000-0000-4000-8000-000000000001',
      1,
      'active',
      'approved_qa_test_post',
      'approved fixture',
      $1,
      NOW()
    )
  `, [ACTOR_ID]);
  const api = await startPostsApi(pool);
  t.after(api.close);

  const list = await fetch(`${api.baseUrl}/api/posts`);
  const detail = await fetch(`${api.baseUrl}/api/posts/1`);
  const comment = await fetch(`${api.baseUrl}/api/posts/1/comments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: 'hidden reply', author: 'Runner' }),
  });
  const vote = await fetch(`${api.baseUrl}/api/posts/1/vote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'like', anonymousId: 'hidden-voter' }),
  });
  const poll = await fetch(`${api.baseUrl}/api/posts/1/poll`);

  assert.equal((await list.json()).posts.length, 0);
  assert.deepEqual([detail.status, comment.status, vote.status, poll.status], [404, 404, 404, 404]);
  assert.equal((await pool.query('SELECT views FROM posts WHERE id=1')).rows[0].views, 0);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM comments')).rows[0].count, 0);

  await pool.query(`
    UPDATE post_quarantines
    SET status='released', released_by=$1, released_at=NOW()
    WHERE post_id=1 AND status='active'
  `, [ACTOR_ID]);
  const releasedList = await fetch(`${api.baseUrl}/api/posts`);
  const releasedDetail = await fetch(`${api.baseUrl}/api/posts/1`);
  assert.equal((await releasedList.json()).posts.length, 1);
  assert.equal(releasedDetail.status, 200);

  const beforeRace = {
    views: (await pool.query('SELECT views FROM posts WHERE id=1')).rows[0].views,
    comments: (await pool.query('SELECT COUNT(*)::int AS count FROM comments')).rows[0].count,
  };
  const quarantineClient = await pool.connect();
  await quarantineClient.query('BEGIN');
  await quarantineClient.query(
    "SELECT pg_advisory_xact_lock(hashtextextended('community-post-quarantine-list', 7319))",
  );
  await quarantineClient.query(
    "SELECT pg_advisory_xact_lock(hashtextextended('1', 7319))",
  );

  const racedRequests = [
    fetch(`${api.baseUrl}/api/posts`),
    fetch(`${api.baseUrl}/api/posts/01`),
    fetch(`${api.baseUrl}/api/posts/1/comments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'raced reply', author: 'Runner' }),
    }),
    fetch(`${api.baseUrl}/api/posts/1/vote`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'like', anonymousId: 'raced-voter' }),
    }),
    fetch(`${api.baseUrl}/api/posts/1/poll`),
  ];
  try {
    await waitForBlockedBoundaryQueries(quarantineClient, 5);
    await quarantineClient.query(`
      INSERT INTO post_quarantines (
        id, post_id, status, reason_code, reason_detail, quarantined_by, quarantined_at
      ) VALUES (
        '30000000-0000-4000-8000-000000000002',
        1,
        'active',
        'approved_qa_test_post',
        'race fixture',
        $1,
        NOW()
      )
    `, [ACTOR_ID]);
    await quarantineClient.query('COMMIT');
  } catch (error) {
    await quarantineClient.query('ROLLBACK');
    throw error;
  } finally {
    quarantineClient.release();
  }

  const racedResponses = await Promise.all(racedRequests);
  assert.deepEqual(racedResponses.map((response) => response.status), [200, 404, 404, 404, 404]);
  assert.equal((await racedResponses[0].json()).posts.length, 0);
  assert.ok(racedResponses.every((response) => response.headers.get('cache-control') === 'no-store'));
  assert.equal((await pool.query('SELECT views FROM posts WHERE id=1')).rows[0].views, beforeRace.views);
  assert.equal(
    (await pool.query('SELECT COUNT(*)::int AS count FROM comments')).rows[0].count,
    beforeRace.comments,
  );

  await pool.query(`
    UPDATE post_quarantines
    SET status='released', released_by=$1, released_at=NOW()
    WHERE post_id=1 AND status='active'
  `, [ACTOR_ID]);
  assert.equal((await fetch(`${api.baseUrl}/api/posts/1`)).status, 200);

  const saturatedResponses = await Promise.all(
    Array.from({ length: 20 }, () => fetch(`${api.baseUrl}/api/posts/1`)),
  );
  assert.ok(saturatedResponses.every((response) => response.status === 200));
});
