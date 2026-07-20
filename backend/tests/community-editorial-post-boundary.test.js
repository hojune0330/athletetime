const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');

test('EDITORIAL-POST-BOUNDARY-001: linked posts are rejected before legacy mutation', async () => {
  const { rejectEditorialPostMutation } = require('../middleware/editorialPostBoundary');
  const queries = [];
  const req = {
    params: { id: '41' },
    app: { locals: { pool: { query: async (sql, values) => {
      queries.push([sql, values]);
      return { rowCount: 1, rows: [{ id: 'issue-id' }] };
    } } } },
  };
  const response = { statusCode: 200, body: null };
  const res = {
    status(code) { response.statusCode = code; return this; },
    json(body) { response.body = body; return this; },
  };
  let calledNext = false;

  await rejectEditorialPostMutation(req, res, () => { calledNext = true; });

  assert.equal(response.statusCode, 409);
  assert.equal(response.body.code, 'EDITORIAL_POST_MANAGED');
  assert.equal(calledNext, false);
  assert.deepEqual(queries[0][1], ['41']);
});

test('EDITORIAL-POST-BOUNDARY-002: ordinary posts continue through legacy routes', async () => {
  const { rejectEditorialPostMutation } = require('../middleware/editorialPostBoundary');
  const req = {
    params: { id: '42' },
    app: { locals: { pool: { query: async () => ({ rowCount: 0, rows: [] }) } } },
  };
  const res = { status() { return this; }, json() { return this; } };
  let calledNext = false;

  await rejectEditorialPostMutation(req, res, () => { calledNext = true; });

  assert.equal(calledNext, true);
});

test('EDITORIAL-POST-BOUNDARY-003: legacy update and delete routes install the guard', () => {
  const route = fs.readFileSync(path.join(root, 'backend/routes/posts.js'), 'utf8');
  assert.match(route, /router\.put\('\/:id',\s*rejectEditorialPostMutation/u);
  assert.match(route, /router\.delete\('\/:id',\s*optionalAuth,\s*rejectEditorialPostMutation/u);
});
