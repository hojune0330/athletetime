const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  ISSUE_ID,
  assertNoPrivateFields,
  createFakeService,
  request,
  startApi,
} = require('./helpers/communityEditorialApiHarness');
const {
  getMagazineIssueByPostId,
  listPublicCorrections,
} = require('../../card-studio/repositories/editorialRepositoryReads');

const ROOT = path.join(__dirname, '..', '..');
const INTERNAL_MARKER = 'INTERNAL_ONLY_52';

function detailService() {
  const service = createFakeService();
  service.getMagazineIssueByPostId = async (postId) => ({
    ...(await service.getMagazineIssue(`magazine-${ISSUE_ID}`)),
    postId,
    relatedUrl: '/records/42',
    publishedAt: '2026-07-21T00:00:00.000Z',
  });
  service.listPublicCorrections = async () => [
    {
      id: 2,
      revisionNumber: 2,
      publicSummary: 'Corrected the result source.',
      reviewNote: INTERNAL_MARKER,
      createdAt: '2026-07-21T01:00:00.000Z',
    },
    {
      id: 1,
      revisionNumber: 1,
      publicSummary: null,
      reviewNote: INTERNAL_MARKER,
      createdAt: '2026-07-20T01:00:00.000Z',
    },
  ];
  return service;
}

test('EDITORIAL-DETAIL-001: Given a published editorial post When by-post is read Then public context is allowlisted', async (t) => {
  // Given
  const api = await startApi(detailService());
  t.after(api.close);

  // When
  const response = await request(api.baseUrl, 'GET', '/api/editorial/magazine/by-post/73');

  // Then
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.body.issue.postId, 73);
  assert.equal(response.body.issue.relatedUrl, '/records/42');
  assert.deepEqual(response.body.issue.corrections.map((correction) => correction.publicSummary), [
    'Corrected the result source.',
    '내용을 바로잡았어요.',
  ]);
  assertNoPrivateFields(response.body);
  assert.equal(JSON.stringify(response.body).includes(INTERNAL_MARKER), false);
});

test('EDITORIAL-DETAIL-002: Given an ordinary post When by-post is read Then the API returns 404', async (t) => {
  // Given
  const service = detailService();
  service.getMagazineIssueByPostId = async () => {
    const error = new Error('Editorial issue not found');
    error.code = 'EDITORIAL_ISSUE_NOT_FOUND';
    error.status = 404;
    throw error;
  };
  const api = await startApi(service);
  t.after(api.close);

  // When
  const response = await request(api.baseUrl, 'GET', '/api/editorial/magazine/by-post/74');

  // Then
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('EDITORIAL-DETAIL-003: Given a malformed post id When by-post is read Then it is rejected before lookup', async (t) => {
  // Given
  const service = detailService();
  let lookups = 0;
  service.getMagazineIssueByPostId = async () => { lookups += 1; };
  const api = await startApi(service);
  t.after(api.close);

  // When
  const response = await request(api.baseUrl, 'GET', '/api/editorial/magazine/by-post/not-a-post');

  // Then
  assert.equal(response.status, 400);
  assert.equal(lookups, 0);
});

test('EDITORIAL-DETAIL-004: Given repository rows When public detail is read Then unpublished issues and private notes stay unavailable', async () => {
  // Given
  const calls = [];
  const pool = {
    async query(sql, values) {
      calls.push({ sql, values });
      return { rowCount: 0, rows: [] };
    },
  };

  // When / Then
  await assert.rejects(getMagazineIssueByPostId(pool, 73), (error) => error.status === 404);
  assert.match(calls[0].sql, /status = 'published'/u);
  assert.match(calls[0].sql, /policy_checked_at IS NOT NULL/u);
  assert.match(calls[0].sql, /p\.deleted_at IS NULL/u);
  assert.match(calls[0].sql, /p\.is_blinded = FALSE/u);

  await listPublicCorrections(pool, ISSUE_ID);
  assert.doesNotMatch(calls[1].sql, /review_note/u);
  assert.match(calls[1].sql, /public_summary/u);
});

test('EDITORIAL-DETAIL-005: migration-009 adds a bounded public summary and has a rollback', () => {
  // Given
  const upPath = path.join(ROOT, 'backend/database/migration-009-editorial-public-corrections.sql');
  const downPath = path.join(ROOT, 'backend/database/rollbacks/009-editorial-public-corrections-down.sql');

  // When
  const up = fs.readFileSync(upPath, 'utf8');
  const down = fs.readFileSync(downPath, 'utf8');

  // Then
  assert.match(up, /ADD COLUMN IF NOT EXISTS public_summary/u);
  assert.match(up, /char_length\(public_summary\) <= 300/u);
  assert.match(down, /DROP COLUMN IF EXISTS public_summary/u);
});

test('EDITORIAL-DETAIL-006: magazine posts do not offer legacy edit or delete actions', () => {
  const page = fs.readFileSync(
    path.join(ROOT, 'frontend/src/pages/PostDetailPage.tsx'),
    'utf8',
  );
  const actions = fs.readFileSync(
    path.join(ROOT, 'frontend/src/components/community/post-detail/PostActions.tsx'),
    'utf8',
  );

  assert.match(page, /showManagementActions=\{magazineContext\.data === null\}/u);
  assert.match(actions, /\{showManagementActions && \(/u);
});
