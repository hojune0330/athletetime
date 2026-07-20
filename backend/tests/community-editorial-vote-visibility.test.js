const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');

const NOW = '2026-07-21T02:00:00.000Z';

function postRow(editorialPublishedAt) {
  return {
    id: '73',
    title: 'Editorial post',
    content: 'Published content',
    author: 'AthleTime',
    views: 10,
    likes_count: 9,
    dislikes_count: 3,
    comments_count: 2,
    is_notice: false,
    is_pinned: false,
    is_blinded: false,
    poll: { question: 'Keep totals?', options: [], total_votes: 11, voters: [] },
    created_at: editorialPublishedAt || '2026-07-20T00:00:00.000Z',
    updated_at: '2026-07-21T00:00:00.000Z',
    images: [],
    comments: [],
    ...(editorialPublishedAt ? { editorial_published_at: editorialPublishedAt } : {}),
  };
}

async function startApi({ editorialPublishedAt, withVotes = false }) {
  const row = postRow(editorialPublishedAt);
  const client = {
    async query(sql) {
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return { rows: [], rowCount: 0 };
      if (sql.includes('SELECT id FROM users')) return { rows: [{ id: 'user-1' }], rowCount: 1 };
      if (sql.includes('SELECT vote_type FROM votes')) return { rows: [], rowCount: 0 };
      if (sql.includes('INSERT INTO votes')) return { rows: [], rowCount: 1 };
      if (sql.includes('FROM posts p')) return { rows: [row], rowCount: 1 };
      throw new Error(`Unexpected client query: ${sql}`);
    },
    release() {},
  };
  const pool = {
    async query(sql) {
      if (sql.includes('UPDATE posts SET views = views + 1')) return { rows: [], rowCount: 1 };
      if (sql.includes('FROM posts p')) return { rows: [row], rowCount: 1 };
      if (sql.includes('SELECT vote_type FROM votes')) {
        return { rows: [{ vote_type: 'like' }], rowCount: 1 };
      }
      throw new Error(`Unexpected pool query: ${sql}`);
    },
    connect: async () => client,
  };
  const app = express();
  app.locals.pool = pool;
  app.locals.now = () => new Date(NOW);
  app.use(express.json());
  app.use('/api/posts', require('../routes/posts'));
  if (withVotes) app.use('/api/posts/:postId/vote', require('../routes/votes'));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function readPost(baseUrl) {
  const response = await fetch(`${baseUrl}/api/posts/73`);
  return response.json();
}

async function votePost(baseUrl) {
  const response = await fetch(`${baseUrl}/api/posts/73/vote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'like', anonymousId: 'reader-1' }),
  });
  return response.json();
}

for (const operation of [
  { name: 'GET', run: readPost, withVotes: false },
  { name: 'vote', run: votePost, withVotes: true },
]) {
  test(`VOTE-VISIBILITY-001-${operation.name}: Given 1:59:59 elapsed When ${operation.name} responds Then like counts are hidden`, async (t) => {
    // Given
    const api = await startApi({
      editorialPublishedAt: '2026-07-21T00:00:01.000Z',
      withVotes: operation.withVotes,
    });
    t.after(api.close);

    // When
    const body = await operation.run(api.baseUrl);

    // Then
    assert.equal(body.post.countsVisible, false);
    assert.equal(body.post.likes_count, null);
    assert.equal(body.post.dislikes_count, null);
    if (operation.name === 'GET') assert.equal(body.post.poll.total_votes, 11);
  });

  test(`VOTE-VISIBILITY-002-${operation.name}: Given 2:00:00 elapsed When ${operation.name} responds Then like counts are visible`, async (t) => {
    // Given
    const api = await startApi({
      editorialPublishedAt: '2026-07-21T00:00:00.000Z',
      withVotes: operation.withVotes,
    });
    t.after(api.close);

    // When
    const body = await operation.run(api.baseUrl);

    // Then
    assert.equal(body.post.countsVisible, true);
    assert.equal(body.post.likes_count, 9);
    assert.equal(body.post.dislikes_count, 3);
  });
}

test('VOTE-VISIBILITY-003: Given an ordinary post When it is read Then the legacy count shape remains unchanged', async (t) => {
  // Given
  const api = await startApi({ editorialPublishedAt: null });
  t.after(api.close);

  // When
  const body = await readPost(api.baseUrl);

  // Then
  assert.equal(body.post.likes_count, 9);
  assert.equal(body.post.dislikes_count, 3);
  assert.equal(Object.hasOwn(body.post, 'countsVisible'), false);
});
