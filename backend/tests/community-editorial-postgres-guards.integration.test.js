const assert = require('node:assert/strict');
const test = require('node:test');
const {
  ACTOR_ID,
  applyEditorialMigrations,
  connectionString,
  createExistingFixture,
  issueFields,
  isolatedPool,
} = require('./helpers/communityEditorialPostgresHarness');
const { PostgresEditorialRepository } = require('../../card-studio/repositories/postgresEditorialRepository');

async function setup(t, prefix) {
  const pool = await isolatedPool(t, prefix);
  await createExistingFixture(pool);
  await applyEditorialMigrations(pool);
  return { pool, repository: new PostgresEditorialRepository(pool) };
}

async function draft(repository, overrides = {}) {
  return repository.createIssue(issueFields({
    seasonYear: 2026,
    sectionKey: 'record-story',
    slot: 1,
    title: 'Editorial draft',
    content: 'Verified result context.',
    author: 'AthleTime',
    ...overrides,
  }));
}

test('EDITORIAL-PG-006: skipped state transitions create no posts', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available', timeout: 30000,
}, async (t) => {
  const { pool, repository } = await setup(t, 'editorial_invalid');
  const issue = await draft(repository);
  const before = await pool.query('SELECT COUNT(*)::int AS count FROM posts');
  await assert.rejects(repository.transitionIssue({
    issueId: issue.id, nextStatus: 'published', expectedVersion: issue.version, actorUserId: ACTOR_ID,
  }), (error) => error.code === 'INVALID_EDITORIAL_TRANSITION');
  const after = await pool.query('SELECT COUNT(*)::int AS count FROM posts');
  assert.equal(after.rows[0].count, before.rows[0].count);
});

test('EDITORIAL-PG-007: duplicate packages and stale versions are rejected', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available', timeout: 30000,
}, async (t) => {
  const { pool, repository } = await setup(t, 'editorial_adversarial');
  const issue = await draft(repository, { competitionId: 1, packageRole: 'record_story' });
  await assert.rejects(draft(repository, {
    competitionId: 1, packageRole: 'record_story', slot: 2,
  }), /editorial_calendar_competition_package_role_uidx/u);
  await assert.rejects(repository.transitionIssue({
    issueId: issue.id, nextStatus: 'review_ready', expectedVersion: 99, actorUserId: ACTOR_ID,
  }), (error) => error.code === 'EDITORIAL_VERSION_CONFLICT');
  assert.deepEqual(
    (await pool.query('SELECT status, version FROM editorial_issues WHERE id=$1', [issue.id])).rows[0],
    { status: 'draft', version: 1 },
  );
});

test('EDITORIAL-PG-009: drafts without sources cannot become review-ready', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available', timeout: 30000,
}, async (t) => {
  const { pool, repository } = await setup(t, 'editorial_source_gate');
  const issue = await draft(repository);
  await assert.rejects(repository.transitionIssue({
    issueId: issue.id, nextStatus: 'review_ready', expectedVersion: issue.version, actorUserId: ACTOR_ID,
  }), (error) => error.code === 'EDITORIAL_POLICY_BLOCKED'
    && error.reasons.some((reason) => reason.code === 'source_required'));
  assert.deepEqual(
    (await pool.query('SELECT status, version FROM editorial_issues WHERE id=$1', [issue.id])).rows[0],
    { status: 'draft', version: 1 },
  );
});

test('EDITORIAL-PG-011: forbidden public copy cannot reach publication', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available', timeout: 30000,
}, async (t) => {
  const { pool, repository } = await setup(t, 'editorial_body_gate');
  const issue = await draft(repository, { content: '공식 AI 기자가 선수를 평가합니다.' });
  const source = await repository.addSource({
    issueId: issue.id, expectedVersion: issue.version, actorUserId: ACTOR_ID,
    sourceUrl: 'https://example.com/body-gate', sourceKind: 'primary', title: 'Public result',
  });
  await assert.rejects(repository.transitionIssue({
    issueId: issue.id, nextStatus: 'review_ready',
    expectedVersion: source.issueVersion, actorUserId: ACTOR_ID,
  }), (error) => error.code === 'EDITORIAL_POLICY_BLOCKED'
    && error.reasons.some((reason) => reason.code === 'forbidden_public_term'));
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM posts WHERE title=$1', [issue.title])).rows[0].count, 0);
});

test('EDITORIAL-PG-010: direct transitions require action context and audit the actor', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available', timeout: 30000,
}, async (t) => {
  const { pool, repository } = await setup(t, 'editorial_db_audit');
  const issue = await draft(repository);
  const source = await repository.addSource({
    issueId: issue.id, expectedVersion: issue.version, actorUserId: ACTOR_ID,
    sourceUrl: 'https://example.com/audit', sourceKind: 'primary', title: 'Audit source',
  });
  const ready = await repository.transitionIssue({
    issueId: issue.id, nextStatus: 'review_ready',
    expectedVersion: source.issueVersion, actorUserId: ACTOR_ID,
  });
  await assert.rejects(pool.query(`
    UPDATE editorial_issues SET status='approved', version=version+1,
      approved_by=$2, approved_at=NOW() WHERE id=$1
  `, [issue.id, ACTOR_ID]), /EDITORIAL_ACTION_CONTEXT_REQUIRED/u);
  await pool.query(`
    UPDATE editorial_issues SET status='approved', version=version+1,
      approved_by=$2, approved_at=NOW(), last_actor_user_id=$2, last_action_id=$3 WHERE id=$1
  `, [issue.id, ACTOR_ID, '00000000-0000-4000-8000-000000000002']);
  const audit = await pool.query(`
    SELECT to_status, actor_user_id FROM editorial_events WHERE issue_id=$1 AND issue_version=$2
  `, [issue.id, ready.version + 1]);
  assert.deepEqual(audit.rows, [{ to_status: 'approved', actor_user_id: ACTOR_ID }]);
});

test('EDITORIAL-PG-012: cancelled drafts cannot be revised', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available', timeout: 30000,
}, async (t) => {
  const { pool, repository } = await setup(t, 'editorial_cancelled_revision');
  const issue = await draft(repository);
  const cancelled = await repository.finishIssue({
    issueId: issue.id,
    expectedVersion: issue.version,
    calendarState: 'cancelled',
    eventType: 'cancelled',
    note: 'Topic withdrawn',
    actorUserId: ACTOR_ID,
  });

  await assert.rejects(repository.reviseIssue(issueFields({
    issueId: issue.id,
    expectedVersion: cancelled.version,
    title: 'Must not change',
    content: 'Must not change.',
    reviewNote: 'Attempt after cancellation',
  })), (error) => error.code === 'EDITORIAL_REVISION_NOT_ALLOWED');
  assert.equal((await pool.query(
    'SELECT COUNT(*)::int AS count FROM editorial_revisions WHERE issue_id=$1', [issue.id],
  )).rows[0].count, 1);
});
