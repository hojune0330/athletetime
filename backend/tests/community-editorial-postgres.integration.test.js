const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { listMigrationFiles } = require('../database/run-migrations');
const {
  connectionString,
  createExistingFixture,
  downMigrationPath,
  expectedTables,
  isolatedPool,
  migrationPath,
  root,
} = require('./helpers/communityEditorialPostgresHarness');

const ACTOR_ID = '00000000-0000-4000-8000-000000000001';

function issueFields(overrides = {}) {
  return {
    summary: '공개 결과를 출처와 함께 정리했습니다.',
    whyNow: '이번 주 대회 결과가 공개됐습니다.',
    discussionQuestion: '어떤 기록을 더 보고 싶나요?',
    relatedUrl: '/competitions',
    subjectAgeGroup: 'adult',
    actorUserId: ACTOR_ID,
    ...overrides,
  };
}

test('EDITORIAL-PG-000: Given the current community schema When characterized Then the posts API contract is unchanged', () => {
  // Given
  const schema = fs.readFileSync(path.join(root, 'backend', 'database', 'schema.sql'), 'utf8');
  const route = fs.readFileSync(path.join(root, 'backend', 'routes', 'posts.js'), 'utf8');

  // When
  const postsDefinition = schema.match(/CREATE TABLE posts \([\s\S]*?\n\);/u)?.[0] || '';
  const listProjection = route.match(/SELECT\s+p\.id,[\s\S]*?FROM posts p/u)?.[0] || '';

  // Then
  for (const column of ['title', 'content', 'author', 'password_hash', 'is_blinded', 'deleted_at']) {
    assert.match(postsDefinition, new RegExp(`\\b${column}\\b`, 'u'));
  }
  for (const publicField of ['p.id', 'p.title', 'p.content', 'p.author', 'p.created_at']) {
    assert.equal(listProjection.includes(publicField), true);
  }
  assert.equal(listProjection.includes('password_hash'), false);
  assert.match(route, /p\.deleted_at IS NULL/u);
  assert.match(route, /p\.is_blinded = FALSE/u);
});

test('EDITORIAL-PG-001: Given editorial states When validated Then only plan transitions are accepted', () => {
  // Given
  const {
    EditorialTransitionError,
    assertEditorialActor,
    assertEditorialTransition,
  } = require('../../card-studio/repositories/editorialStateMachine');

  // When / Then
  assert.doesNotThrow(() => assertEditorialTransition('draft', 'review_ready'));
  assert.doesNotThrow(() => assertEditorialTransition('review_ready', 'approved'));
  assert.doesNotThrow(() => assertEditorialTransition('approved', 'published'));
  assert.throws(
    () => assertEditorialTransition('draft', 'published'),
    (error) => error instanceof EditorialTransitionError
      && error.code === 'INVALID_EDITORIAL_TRANSITION'
      && error.status === 409,
  );
  assert.throws(
    () => assertEditorialTransition('malformed', 'approved'),
    (error) => error.code === 'INVALID_EDITORIAL_TRANSITION',
  );
  for (const actor of [undefined, null, '', 'editor', `${ACTOR_ID};DROP TABLE users`]) {
    assert.throws(() => assertEditorialActor(actor), /valid actor UUID/u);
  }
  assert.doesNotThrow(() => assertEditorialActor(ACTOR_ID));
});

test('EDITORIAL-PG-002: Given migration files When discovered Then down migrations are never run upward', (t) => {
  // Given
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-editorial-migrations-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, 'rollbacks'));
  fs.writeFileSync(path.join(directory, 'migration-006-community-editorial.sql'), 'SELECT 1;');
  fs.writeFileSync(path.join(directory, 'rollbacks', '006-community-editorial-down.sql'), 'SELECT 2;');

  // When
  const migrations = listMigrationFiles(directory);
  const projectMigrations = listMigrationFiles(path.join(root, 'backend', 'database'));

  // Then
  assert.deepEqual(migrations, ['migration-006-community-editorial.sql']);
  assert.equal(projectMigrations.includes('migration-006-community-editorial.sql'), true);
  assert.equal(projectMigrations.includes('006-community-editorial-down.sql'), false);
});

test('EDITORIAL-PG-003: Given migration SQL When inspected Then all editorial contracts are present', () => {
  // Given / When
  const up = fs.readFileSync(migrationPath, 'utf8');
  const down = fs.readFileSync(downMigrationPath, 'utf8');

  // Then
  for (const table of expectedTables) {
    assert.match(up, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, 'u'));
    assert.match(down, new RegExp(`DROP TABLE IF EXISTS ${table}\\b`, 'u'));
  }
  assert.match(up, /planned.*candidate_linked.*drafting.*ready.*scheduled.*published.*skipped.*cancelled/su);
  assert.match(up, /draft.*review_ready.*approved.*scheduled.*published.*corrected.*unpublished/su);
  assert.match(up, /preview.*result_context.*record_story/su);
  assert.match(up, /INVALID_EDITORIAL_TRANSITION/u);
  assert.match(up, /created_by UUID NOT NULL/u);
  assert.match(up, /actor_user_id UUID NOT NULL/u);
  assert.match(up, /last_action_id UUID NOT NULL/u);
  assert.match(up, /EDITORIAL_ACTION_CONTEXT_REQUIRED/u);
  assert.match(up, /quarantined_by UUID NOT NULL/u);
  assert.match(up, /source_url ~ '\^https:\/\/'/u);
  const digestDefinition = up.match(/CREATE TABLE IF NOT EXISTS magazine_digest_preferences \([\s\S]*?\n\);/u)?.[0] || '';
  assert.match(digestDefinition, /cadence IN \('weekly', 'off'\)/u);
  assert.equal(digestDefinition.includes("'daily'"), false);
  assert.equal(/ALTER\s+TABLE\s+posts\b/iu.test(up), false);
  assert.equal(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?posts\b/iu.test(down), false);
});

test('EDITORIAL-PG-004: Given an empty PostgreSQL schema When migrated up/down twice Then it is repeatable', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  // Given
  const pool = await isolatedPool(t, 'editorial_empty');
  const up = fs.readFileSync(migrationPath, 'utf8');
  const down = fs.readFileSync(downMigrationPath, 'utf8');

  // When / Then
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await pool.query(up);
    const present = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = ANY($1::text[])
    `, [expectedTables]);
    assert.equal(present.rowCount, expectedTables.length);
    await pool.query(down);
    const removed = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = ANY($1::text[])
    `, [expectedTables]);
    assert.equal(removed.rowCount, 0);
  }
});

test('EDITORIAL-PG-005: Given an existing fixture When publishing once Then posts and events are atomic', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  // Given
  const pool = await isolatedPool(t, 'editorial_fixture');
  await createExistingFixture(pool);
  const postsBefore = await pool.query('SELECT * FROM posts ORDER BY id');
  await pool.query(fs.readFileSync(migrationPath, 'utf8'));
  const { PostgresEditorialRepository } = require('../../card-studio/repositories/postgresEditorialRepository');
  const repository = new PostgresEditorialRepository(pool);
  const issue = await repository.createIssue(issueFields({
    competitionId: 1,
    packageRole: 'preview',
    seasonYear: 2026,
    sectionKey: 'competition-preview',
    slot: 1,
    title: 'Editorial title',
    content: 'Editorial body',
    author: 'AthleTime',
  }));
  await repository.addSource({
    issueId: issue.id,
    sourceUrl: 'https://example.com/official-source',
    sourceKind: 'official',
    title: 'Official source',
    actorUserId: ACTOR_ID,
  });

  // When
  const ready = await repository.transitionIssue({
    issueId: issue.id,
    nextStatus: 'review_ready',
    expectedVersion: 1,
    actorUserId: ACTOR_ID,
  });
  const approved = await repository.transitionIssue({
    issueId: issue.id,
    nextStatus: 'approved',
    expectedVersion: ready.version,
    actorUserId: ACTOR_ID,
  });
  const published = await repository.transitionIssue({
    issueId: issue.id,
    nextStatus: 'published',
    expectedVersion: approved.version,
    actorUserId: ACTOR_ID,
  });

  // Then
  assert.equal(published.status, 'published');
  assert.equal(typeof published.postId, 'number');
  const linked = await pool.query('SELECT status, post_id FROM editorial_issues WHERE id = $1', [issue.id]);
  assert.deepEqual(linked.rows[0], { status: 'published', post_id: String(published.postId) });
  const postsAfter = await pool.query('SELECT * FROM posts ORDER BY id');
  assert.equal(postsAfter.rowCount, postsBefore.rowCount + 1);
  assert.deepEqual(postsAfter.rows[0], postsBefore.rows[0]);
  const events = await pool.query(`
    SELECT to_status FROM editorial_events
    WHERE issue_id = $1 AND to_status IS NOT NULL ORDER BY id
  `, [issue.id]);
  assert.deepEqual(events.rows.map((row) => row.to_status), [
    'draft', 'review_ready', 'approved', 'published',
  ]);
});

test('EDITORIAL-PG-006: Given a draft When publish is skipped ahead Then no post is created', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  // Given
  const pool = await isolatedPool(t, 'editorial_invalid');
  await createExistingFixture(pool);
  await pool.query(fs.readFileSync(migrationPath, 'utf8'));
  const { PostgresEditorialRepository } = require('../../card-studio/repositories/postgresEditorialRepository');
  const repository = new PostgresEditorialRepository(pool);
  const issue = await repository.createIssue(issueFields({
    seasonYear: 2026,
    sectionKey: 'invalid-transition',
    slot: 1,
    title: 'Never public',
    content: 'Draft content',
    author: 'AthleTime',
  }));
  const before = await pool.query('SELECT COUNT(*)::int AS count FROM posts');

  // When / Then
  await assert.rejects(
    repository.transitionIssue({
      issueId: issue.id,
      nextStatus: 'published',
      expectedVersion: issue.version,
      actorUserId: ACTOR_ID,
    }),
    (error) => error.code === 'INVALID_EDITORIAL_TRANSITION' && error.status === 409,
  );
  const after = await pool.query('SELECT COUNT(*)::int AS count FROM posts');
  assert.equal(after.rows[0].count - before.rows[0].count, 0);
  await assert.rejects(
    pool.query("UPDATE editorial_issues SET status = 'published', post_id = 1 WHERE id = $1", [issue.id]),
    /INVALID_EDITORIAL_TRANSITION/u,
  );
});

test('EDITORIAL-PG-007: Given duplicate package roles and stale versions When written Then both are rejected', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  // Given
  const pool = await isolatedPool(t, 'editorial_adversarial');
  await createExistingFixture(pool);
  await pool.query(fs.readFileSync(migrationPath, 'utf8'));
  const {
    EditorialVersionConflictError,
    PostgresEditorialRepository,
  } = require('../../card-studio/repositories/postgresEditorialRepository');
  const repository = new PostgresEditorialRepository(pool);
  const issue = await repository.createIssue(issueFields({
    competitionId: 1,
    packageRole: 'record_story',
    seasonYear: 2026,
    sectionKey: 'record-story',
    slot: 1,
    title: 'Record story',
    content: 'Body',
    author: 'AthleTime',
  }));

  // When / Then
  await assert.rejects(repository.createIssue(issueFields({
    competitionId: 1,
    packageRole: 'record_story',
    seasonYear: 2026,
    sectionKey: 'record-story-duplicate',
    slot: 2,
    title: 'Duplicate',
    content: 'Body',
    author: 'AthleTime',
  })), /editorial_calendar_competition_package_role_uidx/u);
  await assert.rejects(
    repository.transitionIssue({
      issueId: issue.id,
      nextStatus: 'review_ready',
      expectedVersion: 99,
      actorUserId: ACTOR_ID,
    }),
    (error) => error instanceof EditorialVersionConflictError
      && error.code === 'EDITORIAL_VERSION_CONFLICT',
  );
  const persisted = await pool.query('SELECT status, version FROM editorial_issues WHERE id = $1', [issue.id]);
  assert.deepEqual(persisted.rows[0], { status: 'draft', version: 1 });
});

test('EDITORIAL-PG-009: Given a draft without sources When checked Then policy blocks review readiness', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  const pool = await isolatedPool(t, 'editorial_source_gate');
  await createExistingFixture(pool);
  await pool.query(fs.readFileSync(migrationPath, 'utf8'));
  const { PostgresEditorialRepository } = require('../../card-studio/repositories/postgresEditorialRepository');
  const repository = new PostgresEditorialRepository(pool);
  const issue = await repository.createIssue(issueFields({
    seasonYear: 2026,
    sectionKey: 'source-gate',
    slot: 1,
    title: '출처 없는 초안',
    content: '아직 공개할 수 없는 내용',
    author: 'AthleTime',
  }));

  await assert.rejects(repository.transitionIssue({
    issueId: issue.id,
    nextStatus: 'review_ready',
    expectedVersion: issue.version,
    actorUserId: ACTOR_ID,
  }), (error) => error.code === 'EDITORIAL_POLICY_BLOCKED'
    && error.reasons.some((reason) => reason.code === 'source_required'));
  const persisted = await pool.query('SELECT status, version FROM editorial_issues WHERE id = $1', [issue.id]);
  assert.deepEqual(persisted.rows[0], { status: 'draft', version: 1 });
});

test('EDITORIAL-PG-011: Given forbidden copy hidden in content When checked Then no post can be published', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  const pool = await isolatedPool(t, 'editorial_body_gate');
  await createExistingFixture(pool);
  await pool.query(fs.readFileSync(migrationPath, 'utf8'));
  const { PostgresEditorialRepository } = require('../../card-studio/repositories/postgresEditorialRepository');
  const repository = new PostgresEditorialRepository(pool);
  const issue = await repository.createIssue(issueFields({
    seasonYear: 2026,
    sectionKey: 'body-gate',
    slot: 1,
    title: '안전해 보이는 제목',
    content: '공식 AI 기자가 미성년 선수의 부상과 잠재력을 평가합니다.',
    author: 'AthleTime',
  }));
  await repository.addSource({
    issueId: issue.id,
    sourceUrl: 'https://example.com/body-gate',
    sourceKind: 'primary',
    title: '공개 결과',
    actorUserId: ACTOR_ID,
  });

  await assert.rejects(repository.transitionIssue({
    issueId: issue.id,
    nextStatus: 'review_ready',
    expectedVersion: issue.version,
    actorUserId: ACTOR_ID,
  }), (error) => error.code === 'EDITORIAL_POLICY_BLOCKED'
    && error.reasons.some((reason) => reason.code === 'forbidden_public_term'));
  const posts = await pool.query("SELECT COUNT(*)::int AS count FROM posts WHERE title='안전해 보이는 제목'");
  assert.equal(posts.rows[0].count, 0);
});

test('EDITORIAL-PG-010: Given a direct valid transition When action context is missing Then DB rejects it', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  const pool = await isolatedPool(t, 'editorial_db_audit');
  await createExistingFixture(pool);
  await pool.query(fs.readFileSync(migrationPath, 'utf8'));
  const { PostgresEditorialRepository } = require('../../card-studio/repositories/postgresEditorialRepository');
  const repository = new PostgresEditorialRepository(pool);
  const issue = await repository.createIssue(issueFields({
    seasonYear: 2026,
    sectionKey: 'db-audit',
    slot: 1,
    title: '감사 경계 확인',
    content: 'DB 상태 전환도 담당자 문맥을 남깁니다.',
    author: 'AthleTime',
  }));
  await repository.addSource({
    issueId: issue.id,
    sourceUrl: 'https://example.com/audit-source',
    sourceKind: 'primary',
    title: '감사 테스트 출처',
    actorUserId: ACTOR_ID,
  });
  const ready = await repository.transitionIssue({
    issueId: issue.id,
    nextStatus: 'review_ready',
    expectedVersion: issue.version,
    actorUserId: ACTOR_ID,
  });

  await assert.rejects(pool.query(`
    UPDATE editorial_issues SET
      status='approved', version=version+1, approved_by=$2, approved_at=NOW()
    WHERE id=$1
  `, [issue.id, ACTOR_ID]), /EDITORIAL_ACTION_CONTEXT_REQUIRED/u);
  await pool.query(`
    UPDATE editorial_issues SET
      status='approved', version=version+1, approved_by=$2, approved_at=NOW(),
      last_actor_user_id=$2, last_action_id=$3
    WHERE id=$1
  `, [issue.id, ACTOR_ID, '00000000-0000-4000-8000-000000000002']);
  const audit = await pool.query(`
    SELECT to_status, actor_user_id FROM editorial_events
    WHERE issue_id=$1 AND issue_version=$2
  `, [issue.id, ready.version + 1]);
  assert.deepEqual(audit.rows, [{ to_status: 'approved', actor_user_id: ACTOR_ID }]);
});
