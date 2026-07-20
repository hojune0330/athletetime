const assert = require('node:assert/strict');
const test = require('node:test');

const {
  CLAIM_DUE_JOB_SQL,
  EditorialSchedulerRepository,
  retryOutcome,
  safePublishErrorCode,
} = require('../../card-studio/repositories/editorialSchedulerRepository');

const ACTOR_ID = '00000000-0000-4000-8000-000000000001';
const NOW = new Date('2026-08-01T00:00:00.000Z');

test('EDITORIAL-SCHEDULER-REPOSITORY-001: Given two workers When claiming due work Then the SQL skips locked jobs', () => {
  // Given / When / Then
  assert.match(CLAIM_DUE_JOB_SQL, /FOR UPDATE OF j, i, c SKIP LOCKED/u);
  assert.match(CLAIM_DUE_JOB_SQL, /j\.status IN \('queued', 'retrying'\)/u);
  assert.match(CLAIM_DUE_JOB_SQL, /j\.next_attempt_at <= \$1::timestamptz/u);
  assert.match(CLAIM_DUE_JOB_SQL, /LIMIT 1/u);
});

test('EDITORIAL-SCHEDULER-REPOSITORY-002: Given failed attempts When retrying Then delays persist as one minute then five minutes and stop at three', () => {
  // Given / When
  const first = retryOutcome({ attemptCount: 0, now: NOW, retryable: true });
  const second = retryOutcome({ attemptCount: 1, now: NOW, retryable: true });
  const third = retryOutcome({ attemptCount: 2, now: NOW, retryable: true });

  // Then
  assert.deepEqual(first, {
    status: 'retrying', attemptCount: 1, nextAttemptAt: '2026-08-01T00:01:00.000Z',
  });
  assert.deepEqual(second, {
    status: 'retrying', attemptCount: 2, nextAttemptAt: '2026-08-01T00:05:00.000Z',
  });
  assert.deepEqual(third, { status: 'failed', attemptCount: 3, nextAttemptAt: null });
});

test('EDITORIAL-SCHEDULER-REPOSITORY-003: Given a raw failure When classified Then no raw error or unknown code is stored', () => {
  // Given
  const error = new Error('password=secret-token relation editorial_issues failed');
  error.code = '23505';

  // When
  const code = safePublishErrorCode(error);

  // Then
  assert.equal(code, 'EDITORIAL_PUBLISH_TRANSACTION_FAILED');
  assert.doesNotMatch(code, /secret|password|relation/iu);
});

test('EDITORIAL-SCHEDULER-REPOSITORY-004: Given a post insert fault When processing Then the savepoint rolls back partial writes before retry state commits', async () => {
  // Given
  const queries = [];
  const claimed = {
    job_id: '30000000-0000-4000-8000-000000000001',
    issue_id: '10000000-0000-4000-8000-000000000001',
    job_status: 'queued',
    attempt_count: 0,
    issue_status: 'scheduled',
    calendar_state: 'scheduled',
  };
  const client = {
    async query(text, values = []) {
      queries.push({ text, values });
      if (text === CLAIM_DUE_JOB_SQL) return { rowCount: 1, rows: [claimed] };
      return { rowCount: 1, rows: [] };
    },
    release() { queries.push({ text: 'RELEASE', values: [] }); },
  };
  const pool = { async connect() { return client; } };
  const repository = new EditorialSchedulerRepository(pool, {
    publishScheduledIssue: async (boundClient) => {
      await boundClient.query('INSERT INTO posts (title) VALUES ($1)', ['partial']);
      throw new Error('token=must-not-persist');
    },
  });

  // When
  const result = await repository.processNext({ actorUserId: ACTOR_ID, now: NOW });

  // Then
  assert.equal(result.status, 'retrying');
  assert.equal(result.attemptCount, 1);
  assert.equal(result.errorCode, 'EDITORIAL_PUBLISH_TRANSACTION_FAILED');
  const commands = queries.map(({ text }) => text.trim().replaceAll(/\s+/gu, ' '));
  assert.equal(commands[0], 'BEGIN');
  assert.equal(commands[2], 'SAVEPOINT editorial_publish_attempt');
  assert.match(commands[3], /^INSERT INTO posts/u);
  assert.equal(commands[4], 'ROLLBACK TO SAVEPOINT editorial_publish_attempt');
  assert.match(commands[5], /^UPDATE editorial_publish_jobs/u);
  assert.equal(commands[6], 'COMMIT');
  assert.equal(commands[7], 'RELEASE');
  assert.doesNotMatch(JSON.stringify(queries[5].values), /must-not-persist/u);
});
