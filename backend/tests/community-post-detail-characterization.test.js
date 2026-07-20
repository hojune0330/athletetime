const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');

const ORDINARY_POST = Object.freeze({
  id: '42',
  title: 'Ordinary community post',
  content: 'Existing content',
  author: 'Runner',
  views: 8,
  likes_count: 5,
  dislikes_count: 2,
  comments_count: 1,
  is_notice: false,
  is_pinned: false,
  is_blinded: false,
  poll: {
    question: 'Race distance?',
    options: [{ id: 1, text: '5K', votes: 7 }],
    total_votes: 7,
    voters: [],
  },
  created_at: '2026-07-21T00:00:00.000Z',
  updated_at: '2026-07-21T00:00:00.000Z',
  category_name: 'free',
  category_icon: 'run',
  category_color: '#123456',
  images: null,
  comments: null,
});

async function startPostApi() {
  const queries = [];
  const pool = {
    async query(sql, values) {
      queries.push({ sql, values });
      if (sql.includes('UPDATE posts SET views = views + 1')) return { rows: [], rowCount: 1 };
      if (sql.includes('FROM posts p') && sql.includes('p.poll')) {
        return { rows: [{ ...ORDINARY_POST }], rowCount: 1 };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
  const app = express();
  app.locals.pool = pool;
  app.use('/api/posts', require('../routes/posts'));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
    queries,
  };
}

test('POST-DETAIL-BASELINE-001: Given an ordinary post When detail is read Then its existing contract is unchanged', async (t) => {
  // Given
  const api = await startPostApi();
  t.after(api.close);

  // When
  const response = await fetch(`${api.baseUrl}/api/posts/42`);
  const body = await response.json();

  // Then
  assert.equal(response.status, 200);
  assert.equal(body.post.likes_count, 5);
  assert.equal(body.post.dislikes_count, 2);
  assert.equal(body.post.poll.total_votes, 7);
  assert.deepEqual(body.post.images, []);
  assert.deepEqual(body.post.comments, []);
  assert.equal(Object.hasOwn(body.post, 'countsVisible'), false);
  assert.equal(api.queries[0].values[0], '42');
});
