const assert = require('node:assert/strict');
const test = require('node:test');
const {
  DEFAULT_POST_LIST_LIMIT,
  MAX_POST_LIST_LIMIT,
  MAX_POST_LIST_PAGE,
  normalizePostListPagination,
} = require('../utils/postListPagination');

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
