const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  EditorialSchedulerRepository,
} = require('../../card-studio/repositories/editorialSchedulerRepository');
const {
  PostgresEditorialRepository,
} = require('../../card-studio/repositories/postgresEditorialRepository');
const {
  ACTOR_ID,
  applyEditorialMigrations,
  connectionString,
  createExistingFixture,
  isolatedPool,
  issueFields,
  root,
} = require('./helpers/communityEditorialPostgresHarness');

const migration010 = path.join(
  root,
  'backend/database/migration-010-editorial-publish-jobs.sql',
);
const migration010Down = path.join(
  root,
  'backend/database/rollbacks/010-editorial-publish-jobs-down.sql',
);
const BASE_TIME = new Date('2026-08-01T00:00:00.000Z');

async function setupSchedulerDatabase(t, prefix) {
  const pool = await isolatedPool(t, prefix);
  await createExistingFixture(pool);
  await pool.query('ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE');
  await pool.query('UPDATE users SET is_admin = TRUE WHERE id = $1', [ACTOR_ID]);
  await applyEditorialMigrations(pool);
  await pool.query(fs.readFileSync(migration010, 'utf8'));
  return pool;
}

async function scheduleIssue(pool, slot, scheduledFor = BASE_TIME) {
  const repository = new PostgresEditorialRepository(pool);
  let issue = await repository.createIssue(issueFields({
    seasonYear: 2026,
    sectionKey: 'scheduler-story',
    slot,
    title: `Scheduled story ${slot}`,
    content: 'Verified competition results with official source context.',
    author: 'AthleTime Editorial',
  }));
  const source = await repository.addSource({
    issueId: issue.id,
    expectedVersion: issue.version,
    actorUserId: ACTOR_ID,
    sourceUrl: `https://example.com/results-${slot}`,
    sourceKind: 'official',
    title: 'Official results',
  });
  issue = await repository.transitionIssue({
    issueId: issue.id,
    expectedVersion: source.issueVersion,
    actorUserId: ACTOR_ID,
    nextStatus: 'review_ready',
  });
  issue = await repository.transitionIssue({
    issueId: issue.id,
    expectedVersion: issue.version,
    actorUserId: ACTOR_ID,
    nextStatus: 'approved',
  });
  issue = await repository.transitionIssue({
    issueId: issue.id,
    expectedVersion: issue.version,
    actorUserId: ACTOR_ID,
    nextStatus: 'scheduled',
    scheduledFor: typeof scheduledFor === 'string' ? scheduledFor : scheduledFor.toISOString(),
  });
  return issue;
}

test('EDITORIAL-SCHEDULER-PG-001: Given ten due jobs When two workers compete Then every issue publishes exactly once', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 60000,
}, async (t) => {
  // Given
  const pool = await setupSchedulerDatabase(t, 'editorial_scheduler_workers');
  const issues = [];
  for (let slot = 1; slot <= 10; slot += 1) {
    issues.push(await scheduleIssue(pool, slot));
  }
  const first = new EditorialSchedulerRepository(pool);
  const second = new EditorialSchedulerRepository(pool);
  const options = {
    actorUserId: ACTOR_ID,
    now: () => BASE_TIME,
    maxJobs: 10,
  };

  // When
  await Promise.all([first.processDueJobs(options), second.processDueJobs(options)]);

  // Then
  const jobs = await pool.query(`
    SELECT status, attempt_count FROM editorial_publish_jobs ORDER BY issue_id
  `);
  assert.equal(jobs.rowCount, 10);
  assert.equal(jobs.rows.every((row) => row.status === 'completed' && row.attempt_count === 1), true);
  const posts = await pool.query(`
    SELECT COUNT(post_id)::int AS total, COUNT(DISTINCT post_id)::int AS distinct_total
    FROM editorial_issues WHERE id = ANY($1::uuid[])
  `, [issues.map((issue) => issue.id)]);
  assert.deepEqual(posts.rows[0], { total: 10, distinct_total: 10 });
  const audits = await pool.query(`
    SELECT COUNT(*)::int AS count FROM editorial_events
    WHERE issue_id = ANY($1::uuid[]) AND event_type = 'published'
  `, [issues.map((issue) => issue.id)]);
  assert.equal(audits.rows[0].count, 10);
});

test('EDITORIAL-SCHEDULER-PG-002: Given a transaction fault When all three attempts fail Then partial publication rolls back and safe retry state persists', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  // Given
  const pool = await setupSchedulerDatabase(t, 'editorial_scheduler_fault');
  const issue = await scheduleIssue(pool, 1);
  const repository = new EditorialSchedulerRepository(pool, {
    afterPostPublished: async () => { throw new Error('password=private-token'); },
  });

  // When
  const first = await repository.processNext({ actorUserId: ACTOR_ID, now: BASE_TIME });
  const early = await repository.processNext({
    actorUserId: ACTOR_ID,
    now: new Date(BASE_TIME.getTime() + 59_000),
  });
  const second = await repository.processNext({
    actorUserId: ACTOR_ID,
    now: new Date(BASE_TIME.getTime() + 60_000),
  });
  const third = await repository.processNext({
    actorUserId: ACTOR_ID,
    now: new Date(BASE_TIME.getTime() + 360_000),
  });

  // Then
  assert.equal(first.nextAttemptAt, '2026-08-01T00:01:00.000Z');
  assert.equal(early.status, 'idle');
  assert.equal(second.nextAttemptAt, '2026-08-01T00:06:00.000Z');
  assert.deepEqual(third, {
    status: 'failed',
    attemptCount: 3,
    nextAttemptAt: null,
    errorCode: 'EDITORIAL_PUBLISH_TRANSACTION_FAILED',
  });
  const state = await pool.query(`
    SELECT i.status AS issue_status, i.post_id, c.state AS calendar_state,
           j.status AS job_status, j.attempt_count, j.next_attempt_at, j.last_error_code
    FROM editorial_issues i
    JOIN editorial_calendar c ON c.id = i.calendar_id
    JOIN editorial_publish_jobs j ON j.issue_id = i.id
    WHERE i.id = $1
  `, [issue.id]);
  assert.deepEqual(state.rows, [{
    issue_status: 'scheduled',
    post_id: null,
    calendar_state: 'scheduled',
    job_status: 'failed',
    attempt_count: 3,
    next_attempt_at: null,
    last_error_code: 'EDITORIAL_PUBLISH_TRANSACTION_FAILED',
  }]);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM posts WHERE title=$1', [`Scheduled story 1`])).rows[0].count, 0);
  assert.doesNotMatch(JSON.stringify(state.rows), /private-token|password/iu);
});

test('EDITORIAL-SCHEDULER-PG-003: Given a retrying job When the process restarts overdue Then a new repository completes it once', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  // Given
  const pool = await setupSchedulerDatabase(t, 'editorial_scheduler_restart');
  const issue = await scheduleIssue(pool, 1);
  const firstProcess = new EditorialSchedulerRepository(pool, {
    afterPostPublished: async () => { throw new Error('transient'); },
  });
  await firstProcess.processNext({ actorUserId: ACTOR_ID, now: BASE_TIME });
  const restartedProcess = new EditorialSchedulerRepository(pool);

  // When
  const completed = await restartedProcess.processNext({
    actorUserId: ACTOR_ID,
    now: new Date(BASE_TIME.getTime() + 120_000),
  });

  // Then
  assert.deepEqual(completed, { status: 'completed', attemptCount: 2 });
  const state = await pool.query(`
    SELECT i.status AS issue_status, c.state AS calendar_state, j.status AS job_status,
           j.attempt_count, i.post_id
    FROM editorial_issues i
    JOIN editorial_calendar c ON c.id = i.calendar_id
    JOIN editorial_publish_jobs j ON j.issue_id = i.id
    WHERE i.id = $1
  `, [issue.id]);
  assert.equal(state.rows[0].issue_status, 'published');
  assert.equal(state.rows[0].calendar_state, 'published');
  assert.equal(state.rows[0].job_status, 'completed');
  assert.equal(state.rows[0].attempt_count, 2);
  assert.ok(state.rows[0].post_id);
  const audits = await pool.query(
    "SELECT COUNT(*)::int AS count FROM editorial_events WHERE issue_id=$1 AND event_type='published'",
    [issue.id],
  );
  assert.equal(audits.rows[0].count, 1);
});

test('EDITORIAL-SCHEDULER-PG-004: Given a failed job When an admin reviews and retries it Then publication resumes once', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  const pool = await setupSchedulerDatabase(t, 'editorial_scheduler_admin_retry');
  const issue = await scheduleIssue(pool, 1);
  const failing = new EditorialSchedulerRepository(pool, {
    afterPostPublished: async () => { throw new Error('secret=do-not-store'); },
  });
  await failing.processNext({ actorUserId: ACTOR_ID, now: BASE_TIME });
  await failing.processNext({
    actorUserId: ACTOR_ID,
    now: new Date(BASE_TIME.getTime() + 60_000),
  });
  await failing.processNext({
    actorUserId: ACTOR_ID,
    now: new Date(BASE_TIME.getTime() + 360_000),
  });

  const adminRepository = new PostgresEditorialRepository(pool);
  const warnings = await adminRepository.listPublishJobWarnings();
  assert.equal(warnings.length, 1);
  assert.deepEqual(warnings[0], {
    issueId: issue.id,
    title: 'Scheduled story 1',
    status: 'failed',
    attemptCount: 3,
    nextAttemptAt: null,
    errorCode: 'EDITORIAL_PUBLISH_TRANSACTION_FAILED',
    scheduledFor: BASE_TIME,
    updatedAt: new Date(BASE_TIME.getTime() + 360_000),
  });
  assert.doesNotMatch(JSON.stringify(warnings), /do-not-store|secret/iu);

  const retryAt = new Date(BASE_TIME.getTime() + 600_000);
  const retried = await adminRepository.retryPublishJob({
    issueId: issue.id,
    expectedVersion: issue.version,
    scheduledFor: retryAt.toISOString(),
    actorUserId: ACTOR_ID,
    note: 'Publication dependency recovered',
  });
  assert.deepEqual(retried, {
    issueId: issue.id,
    status: 'queued',
    attemptCount: 0,
    nextAttemptAt: retryAt.toISOString(),
    errorCode: null,
    issueVersion: issue.version + 1,
  });
  assert.deepEqual(await adminRepository.listPublishJobWarnings(), []);

  const completed = await new EditorialSchedulerRepository(pool).processNext({
    actorUserId: ACTOR_ID,
    now: retryAt,
  });
  assert.deepEqual(completed, { status: 'completed', attemptCount: 1 });
  const state = await pool.query(`
    SELECT i.status AS issue_status, j.status AS job_status, j.attempt_count,
           COUNT(event.id) FILTER (WHERE event.event_type='rescheduled')::int AS retry_audits
    FROM editorial_issues i
    JOIN editorial_publish_jobs j ON j.issue_id=i.id
    LEFT JOIN editorial_events event ON event.issue_id=i.id
    WHERE i.id=$1
    GROUP BY i.status, j.status, j.attempt_count
  `, [issue.id]);
  assert.deepEqual(state.rows, [{
    issue_status: 'published',
    job_status: 'completed',
    attempt_count: 1,
    retry_audits: 1,
  }]);
});

test('EDITORIAL-SCHEDULER-PG-005: Given one hundred due jobs When ten workers compete Then nothing is duplicated or lost', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 120000,
}, async (t) => {
  const pool = await setupSchedulerDatabase(t, 'editorial_scheduler_hundred');
  const issues = [];
  for (let slot = 1; slot <= 100; slot += 1) {
    issues.push(await scheduleIssue(pool, slot));
  }
  const workers = Array.from({ length: 10 }, () => new EditorialSchedulerRepository(pool));
  const options = {
    actorUserId: ACTOR_ID,
    now: () => BASE_TIME,
    maxJobs: 100,
  };

  await Promise.all(workers.map((worker) => worker.processDueJobs(options)));

  const jobs = await pool.query(`
    SELECT status, COUNT(*)::int AS count
    FROM editorial_publish_jobs
    GROUP BY status
    ORDER BY status
  `);
  assert.deepEqual(jobs.rows, [{ status: 'completed', count: 100 }]);
  const result = await pool.query(`
    SELECT COUNT(*)::int AS issues,
           COUNT(post_id)::int AS linked_posts,
           COUNT(DISTINCT post_id)::int AS distinct_posts
    FROM editorial_issues
    WHERE id = ANY($1::uuid[])
  `, [issues.map((issue) => issue.id)]);
  assert.deepEqual(result.rows[0], {
    issues: 100,
    linked_posts: 100,
    distinct_posts: 100,
  });
  const audits = await pool.query(`
    SELECT COUNT(*)::int AS count
    FROM editorial_events
    WHERE issue_id = ANY($1::uuid[]) AND event_type = 'published'
  `, [issues.map((issue) => issue.id)]);
  assert.equal(audits.rows[0].count, 100);
});

test('EDITORIAL-SCHEDULER-PG-006: a killed worker transaction is rolled back and an overdue restart publishes once', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  const pool = await setupSchedulerDatabase(t, 'editorial_scheduler_kill');
  const issue = await scheduleIssue(pool, 1);
  const schema = (await pool.query('SELECT current_schema() AS name')).rows[0].name;
  const childSource = `
    const { Pool } = require('pg');
    const { EditorialSchedulerRepository } = require('./card-studio/repositories/editorialSchedulerRepository');
    const pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL,
      ssl: false,
      options: '-c search_path=' + process.env.TEST_SCHEMA,
    });
    const worker = new EditorialSchedulerRepository(pool, {
      afterPostPublished: async () => process.exit(86),
    });
    worker.processNext({
      actorUserId: process.env.TEST_ACTOR_ID,
      now: new Date(process.env.TEST_NOW),
    }).catch(() => process.exit(87));
  `;
  const killedExit = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', childSource], {
      cwd: root,
      env: {
        ...process.env,
        TEST_DATABASE_URL: connectionString,
        TEST_SCHEMA: schema,
        TEST_ACTOR_ID: ACTOR_ID,
        TEST_NOW: BASE_TIME.toISOString(),
      },
      stdio: 'ignore',
    });
    child.once('error', reject);
    child.once('exit', resolve);
  });
  assert.equal(killedExit, 86);
  const rolledBack = await pool.query(`
    SELECT i.status AS issue_status, i.post_id, j.status AS job_status,
           j.attempt_count
    FROM editorial_issues i
    JOIN editorial_publish_jobs j ON j.issue_id = i.id
    WHERE i.id = $1
  `, [issue.id]);
  assert.deepEqual(rolledBack.rows, [{
    issue_status: 'scheduled',
    post_id: null,
    job_status: 'queued',
    attempt_count: 0,
  }]);
  assert.equal(
    (await pool.query('SELECT COUNT(*)::int AS count FROM posts WHERE title=$1', ['Scheduled story 1'])).rows[0].count,
    0,
  );

  const completed = await new EditorialSchedulerRepository(pool).processNext({
    actorUserId: ACTOR_ID,
    now: new Date(BASE_TIME.getTime() + 60_000),
  });
  assert.deepEqual(completed, { status: 'completed', attemptCount: 1 });
  const finalState = await pool.query(`
    SELECT COUNT(post_id)::int AS posts,
           COUNT(*) FILTER (WHERE status='published')::int AS published
    FROM editorial_issues WHERE id=$1
  `, [issue.id]);
  assert.deepEqual(finalState.rows[0], { posts: 1, published: 1 });
});

test('EDITORIAL-SCHEDULER-PG-007: migration 010 up-down-up preserves existing editorial rows', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  const pool = await setupSchedulerDatabase(t, 'editorial_scheduler_migration');
  await scheduleIssue(pool, 1);
  const snapshot = async () => (await pool.query(`
    SELECT
      (SELECT jsonb_agg(to_jsonb(row) ORDER BY row.id) FROM editorial_issues row) AS issues,
      (SELECT jsonb_agg(to_jsonb(row) ORDER BY row.id) FROM editorial_calendar row) AS calendar,
      (SELECT jsonb_agg(to_jsonb(row) ORDER BY row.id) FROM editorial_sources row) AS sources,
      (SELECT jsonb_agg(to_jsonb(row) ORDER BY row.id) FROM editorial_events row) AS events
  `)).rows[0];
  const before = await snapshot();

  await pool.query(fs.readFileSync(migration010Down, 'utf8'));
  assert.deepEqual(await snapshot(), before);
  await pool.query(fs.readFileSync(migration010, 'utf8'));
  assert.deepEqual(await snapshot(), before);
  assert.equal(
    (await pool.query('SELECT COUNT(*)::int AS count FROM editorial_publish_jobs')).rows[0].count,
    0,
  );
});

test('EDITORIAL-SCHEDULER-PG-008: explicit KST and DST offsets persist as deterministic UTC instants', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  const pool = await setupSchedulerDatabase(t, 'editorial_scheduler_time');
  const kst = await scheduleIssue(pool, 1, '2026-03-29T00:30:00+09:00');
  const dstBefore = await scheduleIssue(pool, 2, '2026-03-08T01:30:00-05:00');
  const dstAfter = await scheduleIssue(pool, 3, '2026-03-08T03:30:00-04:00');

  const persisted = await pool.query(`
    SELECT i.id, i.scheduled_for AS issue_time, c.scheduled_for AS calendar_time,
           j.next_attempt_at AS job_time
    FROM editorial_issues i
    JOIN editorial_calendar c ON c.id = i.calendar_id
    JOIN editorial_publish_jobs j ON j.issue_id = i.id
    WHERE i.id = ANY($1::uuid[])
    ORDER BY i.id
  `, [[kst.id, dstBefore.id, dstAfter.id]]);
  const byId = new Map(persisted.rows.map((row) => [row.id, row]));
  for (const [issue, expected] of [
    [kst, '2026-03-28T15:30:00.000Z'],
    [dstBefore, '2026-03-08T06:30:00.000Z'],
    [dstAfter, '2026-03-08T07:30:00.000Z'],
  ]) {
    const row = byId.get(issue.id);
    assert.equal(row.issue_time.toISOString(), expected);
    assert.equal(row.calendar_time.toISOString(), expected);
    assert.equal(row.job_time.toISOString(), expected);
  }
});

test('EDITORIAL-SCHEDULER-PG-009: missing and non-admin actors leave due jobs unchanged', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  const pool = await setupSchedulerDatabase(t, 'editorial_scheduler_actor');
  const issue = await scheduleIssue(pool, 1);
  const nonAdminId = '00000000-0000-4000-8000-000000000002';
  await pool.query(
    'INSERT INTO users (id, username, is_admin) VALUES ($1, $2, FALSE)',
    [nonAdminId, 'non-admin'],
  );
  const before = await pool.query(
    'SELECT status, attempt_count, next_attempt_at FROM editorial_publish_jobs WHERE issue_id=$1',
    [issue.id],
  );
  const repository = new EditorialSchedulerRepository(pool);

  await assert.rejects(
    repository.processDueJobs({
      actorUserId: 'not-a-uuid',
      now: () => BASE_TIME,
      maxJobs: 10,
    }),
  );
  await assert.rejects(
    repository.processDueJobs({
      actorUserId: nonAdminId,
      now: () => BASE_TIME,
      maxJobs: 10,
    }),
    (error) => error.code === 'EDITORIAL_SCHEDULER_ACTOR_NOT_ADMIN',
  );

  const after = await pool.query(
    'SELECT status, attempt_count, next_attempt_at FROM editorial_publish_jobs WHERE issue_id=$1',
    [issue.id],
  );
  assert.deepEqual(after.rows, before.rows);
  assert.equal(
    (await pool.query('SELECT COUNT(*)::int AS count FROM posts WHERE title=$1', ['Scheduled story 1'])).rows[0].count,
    0,
  );
});
