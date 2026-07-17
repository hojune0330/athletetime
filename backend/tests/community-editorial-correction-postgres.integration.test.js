const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const {
  connectionString,
  createExistingFixture,
  isolatedPool,
  migrationPath,
} = require('./helpers/communityEditorialPostgresHarness');

const ACTOR_ID = '00000000-0000-4000-8000-000000000001';

test('EDITORIAL-PG-008: Given a corrected issue When republished Then its existing post is updated once', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  // Given
  const pool = await isolatedPool(t, 'editorial_correction');
  await createExistingFixture(pool);
  await pool.query(fs.readFileSync(migrationPath, 'utf8'));
  const { PostgresEditorialRepository } = require('../../card-studio/repositories/postgresEditorialRepository');
  const repository = new PostgresEditorialRepository(pool);
  const draft = await repository.createIssue({
    seasonYear: 2026,
    sectionKey: 'correction-republish',
    slot: 1,
    title: 'Original title',
    content: 'Original content',
    author: 'AthleTime',
    summary: '공개 결과를 출처와 함께 정리했습니다.',
    whyNow: '이번 주 대회 결과가 공개됐습니다.',
    discussionQuestion: '어떤 기록을 더 보고 싶나요?',
    relatedUrl: '/competitions',
    subjectAgeGroup: 'adult',
    actorUserId: ACTOR_ID,
  });
  await repository.addSource({
    issueId: draft.id,
    sourceUrl: 'https://example.com/result',
    sourceKind: 'primary',
    title: '대회 결과',
    actorUserId: ACTOR_ID,
  });
  const ready = await repository.transitionIssue({
    issueId: draft.id,
    nextStatus: 'review_ready',
    expectedVersion: draft.version,
    actorUserId: ACTOR_ID,
  });
  const approved = await repository.transitionIssue({
    issueId: draft.id,
    nextStatus: 'approved',
    expectedVersion: ready.version,
    actorUserId: ACTOR_ID,
  });
  const firstPublish = await repository.transitionIssue({
    issueId: draft.id,
    nextStatus: 'published',
    expectedVersion: approved.version,
    actorUserId: ACTOR_ID,
  });
  const corrected = await repository.transitionIssue({
    issueId: draft.id,
    nextStatus: 'corrected',
    expectedVersion: firstPublish.version,
    actorUserId: ACTOR_ID,
  });
  await assert.rejects(repository.transitionIssue({
    issueId: draft.id,
    nextStatus: 'published',
    expectedVersion: corrected.version,
    actorUserId: ACTOR_ID,
  }), (error) => error.code === 'EDITORIAL_POLICY_CHECK_REQUIRED');
  const revised = await repository.reviseIssue({
    issueId: draft.id,
    expectedVersion: corrected.version,
    title: 'Corrected title',
    content: 'Corrected content',
    summary: '정정한 공개 결과를 출처와 함께 정리했습니다.',
    whyNow: '기존 설명에서 오류를 확인해 바로잡았습니다.',
    discussionQuestion: '정정된 기록을 확인하셨나요?',
    relatedUrl: '/competitions',
    subjectAgeGroup: 'adult',
    reviewNote: '원출처와 대조해 기록 설명을 정정함',
    actorUserId: ACTOR_ID,
  });
  const postsBeforeRepublish = await pool.query('SELECT COUNT(*)::int AS count FROM posts');

  // When
  const republished = await repository.transitionIssue({
    issueId: draft.id,
    nextStatus: 'published',
    expectedVersion: revised.version,
    actorUserId: ACTOR_ID,
  });

  // Then
  assert.equal(republished.postId, firstPublish.postId);
  const postsAfterRepublish = await pool.query('SELECT COUNT(*)::int AS count FROM posts');
  assert.equal(postsAfterRepublish.rows[0].count, postsBeforeRepublish.rows[0].count);
  const publicPost = await pool.query(
    'SELECT title, content, deleted_at FROM posts WHERE id = $1',
    [firstPublish.postId],
  );
  assert.deepEqual(publicPost.rows[0], {
    title: 'Corrected title',
    content: 'Corrected content',
    deleted_at: null,
  });
  const revisions = await pool.query(
    'SELECT revision_number, review_note FROM editorial_revisions WHERE issue_id = $1 ORDER BY revision_number',
    [draft.id],
  );
  assert.deepEqual(revisions.rows.map((row) => row.revision_number), [1, 2]);
  assert.equal(revisions.rows[1].review_note, '원출처와 대조해 기록 설명을 정정함');
  const revisedEvents = await pool.query(
    "SELECT COUNT(*)::int AS count FROM editorial_events WHERE issue_id = $1 AND event_type = 'revised'",
    [draft.id],
  );
  assert.equal(revisedEvents.rows[0].count, 1);
});
