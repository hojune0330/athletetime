const assert = require('node:assert/strict');
const express = require('express');
const test = require('node:test');
const postsRouter = require('../routes/posts');
const {
  DEFAULT_POST_LIST_LIMIT,
  MAX_POST_LIST_LIMIT,
  MAX_POST_LIST_PAGE,
  normalizePostListPagination,
} = require('../utils/postListPagination');

async function startPostsServer(t) {
  const calls = [];
  const app = express();
  app.locals.pool = {
    query: async (sql, parameters = []) => {
      calls.push({ parameters, sql });
      if (/SELECT COUNT\(\*\) as total/i.test(sql)) return { rows: [{ total: '0' }] };
      return { rows: [] };
    },
  };
  app.use('/api/posts', postsRouter);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { baseUrl: `http://127.0.0.1:${server.address().port}`, calls };
}

test('POST-LIST-PAGINATION-001: caps an oversized public list request before it reaches the database', () => {
  const pagination = normalizePostListPagination({ limit: '100000', page: '999999' });

  assert.deepEqual(pagination, {
    limit: MAX_POST_LIST_LIMIT,
    offset: (MAX_POST_LIST_PAGE - 1) * MAX_POST_LIST_LIMIT,
    page: MAX_POST_LIST_PAGE,
  });
});

test('POST-LIST-PAGINATION-002: falls back for malformed or non-positive public pagination input', () => {
  const pagination = normalizePostListPagination({ limit: '20records', page: '-4' });

  assert.deepEqual(pagination, {
    limit: DEFAULT_POST_LIST_LIMIT,
    offset: 0,
    page: 1,
  });
});

test('POST-LIST-PAGINATION-003: caps a public GET request before its SQL parameters are bound', async (t) => {
  const { baseUrl, calls } = await startPostsServer(t);

  const response = await fetch(`${baseUrl}/api/posts?limit=100000&page=999999`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.limit, MAX_POST_LIST_LIMIT);
  assert.equal(body.page, MAX_POST_LIST_PAGE);
  const listQuery = calls.find(({ sql }) => /\bLIMIT \$\d+\s+OFFSET \$\d+/i.test(sql));
  assert.deepEqual(listQuery?.parameters.slice(-2), [
    MAX_POST_LIST_LIMIT,
    (MAX_POST_LIST_PAGE - 1) * MAX_POST_LIST_LIMIT,
  ]);
});
