const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { listMigrationFiles } = require('../database/run-migrations');
const {
  ACTOR_ID,
  applyEditorialMigrations,
  connectionString,
  createExistingFixture,
  downMigrationPath,
  expectedTables,
  isolatedPool,
  issueFields,
  migrationPath,
  rollbackEditorialMigrations,
  root,
} = require('./helpers/communityEditorialPostgresHarness');

test('EDITORIAL-PG-000: posts public contract remains unchanged', () => {
  const schema = fs.readFileSync(path.join(root, 'backend/database/schema.sql'), 'utf8');
  const route = fs.readFileSync(path.join(root, 'backend/routes/posts.js'), 'utf8');
  const posts = schema.match(/CREATE TABLE posts \([\s\S]*?\n\);/u)?.[0] || '';
  const projection = route.match(/SELECT\s+p\.id,[\s\S]*?FROM posts p/u)?.[0] || '';
  for (const column of ['title', 'content', 'author', 'password_hash', 'is_blinded', 'deleted_at']) {
    assert.match(posts, new RegExp(`\\b${column}\\b`, 'u'));
  }
  for (const field of ['p.id', 'p.title', 'p.content', 'p.author', 'p.created_at']) {
    assert.equal(projection.includes(field), true);
  }
  assert.equal(projection.includes('password_hash'), false);
});

test('EDITORIAL-PG-001: only declared state transitions and UUID actors are accepted', () => {
  const state = require('../../card-studio/repositories/editorialStateMachine');
  assert.doesNotThrow(() => state.assertEditorialTransition('draft', 'review_ready'));
  assert.doesNotThrow(() => state.assertEditorialTransition('review_ready', 'approved'));
  assert.throws(() => state.assertEditorialTransition('draft', 'published'), (error) => (
    error.code === 'INVALID_EDITORIAL_TRANSITION' && error.status === 409
  ));
  for (const actor of [undefined, null, '', 'editor', `${ACTOR_ID};DROP TABLE users`]) {
    assert.throws(() => state.assertEditorialActor(actor), /valid actor UUID/u);
  }
  assert.doesNotThrow(() => state.assertEditorialActor(ACTOR_ID));
});

test('EDITORIAL-PG-002: down migrations are not discovered as upward migrations', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'athletetime-editorial-migrations-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, 'rollbacks'));
  fs.writeFileSync(path.join(directory, 'migration-006-community-editorial.sql'), 'SELECT 1;');
  fs.writeFileSync(path.join(directory, 'rollbacks/006-community-editorial-down.sql'), 'SELECT 2;');
  assert.deepEqual(listMigrationFiles(directory), ['migration-006-community-editorial.sql']);
  const project = listMigrationFiles(path.join(root, 'backend/database'));
  assert.equal(project.includes('migration-006-community-editorial.sql'), true);
  assert.equal(project.includes('006-community-editorial-down.sql'), false);
});

test('EDITORIAL-PG-003: base migration contains all editorial contracts', () => {
  const up = fs.readFileSync(migrationPath, 'utf8');
  const down = fs.readFileSync(downMigrationPath, 'utf8');
  for (const table of expectedTables) {
    assert.match(up, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, 'u'));
    assert.match(down, new RegExp(`DROP TABLE IF EXISTS ${table}\\b`, 'u'));
  }
  assert.match(up, /INVALID_EDITORIAL_TRANSITION/u);
  assert.match(up, /EDITORIAL_ACTION_CONTEXT_REQUIRED/u);
  assert.match(up, /actor_user_id UUID NOT NULL/u);
  assert.equal(/ALTER\s+TABLE\s+posts\b/iu.test(up), false);
  assert.equal(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?posts\b/iu.test(down), false);
});

test('EDITORIAL-PG-004: empty schema migration is repeatable and rollback is scoped', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available', timeout: 30000,
}, async (t) => {
  const pool = await isolatedPool(t, 'editorial_empty');
  await createExistingFixture(pool);
  await applyEditorialMigrations(pool);
  await applyEditorialMigrations(pool);
  for (const table of expectedTables) {
    assert.equal((await pool.query('SELECT to_regclass($1) AS name', [table])).rows[0].name, table);
  }
  await rollbackEditorialMigrations(pool);
  assert.equal((await pool.query("SELECT to_regclass('posts') AS name")).rows[0].name, 'posts');
});

test('EDITORIAL-PG-005: publishing creates one linked post and an actor audit trail', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available', timeout: 30000,
}, async (t) => {
  const pool = await isolatedPool(t, 'editorial_publish');
  await createExistingFixture(pool);
  await applyEditorialMigrations(pool);
  const { PostgresEditorialRepository } = require('../../card-studio/repositories/postgresEditorialRepository');
  const repository = new PostgresEditorialRepository(pool);
  let issue = await repository.createIssue(issueFields({
    seasonYear: 2026, sectionKey: 'competition-preview', slot: 1,
    title: 'Competition preview', content: 'Verified result context.', author: 'AthleTime',
  }));
  const source = await repository.addSource({
    issueId: issue.id, expectedVersion: issue.version, actorUserId: ACTOR_ID,
    sourceUrl: 'https://example.com/results', sourceKind: 'official', title: 'Official results',
  });
  issue = await repository.transitionIssue({
    issueId: issue.id, nextStatus: 'review_ready',
    expectedVersion: source.issueVersion, actorUserId: ACTOR_ID,
  });
  issue = await repository.transitionIssue({
    issueId: issue.id, nextStatus: 'approved', expectedVersion: issue.version, actorUserId: ACTOR_ID,
  });
  const published = await repository.transitionIssue({
    issueId: issue.id, nextStatus: 'published', expectedVersion: issue.version, actorUserId: ACTOR_ID,
  });
  assert.ok(published.postId);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM posts WHERE id=$1', [published.postId])).rows[0].count, 1);
  const events = await pool.query(
    `SELECT to_status, actor_user_id FROM editorial_events
     WHERE issue_id=$1 AND to_status IS NOT NULL ORDER BY id`, [issue.id],
  );
  assert.deepEqual(events.rows.map((row) => row.to_status), ['draft', 'review_ready', 'approved', 'published']);
  assert.equal(events.rows.every((row) => row.actor_user_id === ACTOR_ID), true);
});
