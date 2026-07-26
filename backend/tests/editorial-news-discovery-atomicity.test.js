const assert = require('node:assert/strict');
const test = require('node:test');
const {
  EditorialNewsDiscoveryRepository,
} = require('../../card-studio/repositories/editorialNewsDiscoveryRepository');

const actorUserId = '00000000-0000-4000-8000-000000000001';
const runId = '10000000-0000-4000-8000-000000000001';

function runRow(overrides = {}) {
  return {
    id: runId,
    run_date_kst: '2026-07-26',
    profile_version: 'v1',
    trigger: 'manual',
    status: 'running',
    started_at: '2026-07-26T00:00:00Z',
    completed_at: null,
    api_call_count: 7,
    result_count: 0,
    inserted_count: 0,
    duplicate_count: 0,
    irrelevant_count: 0,
    safe_error_code: null,
    actor_user_id: actorUserId,
    ...overrides,
  };
}

test('NEWS-ATOMIC-001: run completion and its audit event commit together', async () => {
  // Given
  const queries = [];
  let completionMetadata;
  const client = {
    async query(sql, parameters = []) {
      queries.push(sql);
      if (sql.startsWith('UPDATE editorial_news_runs')) {
        return { rowCount: 1, rows: [runRow({ status: 'completed' })] };
      }
      if (sql.startsWith('INSERT INTO editorial_news_events')) {
        completionMetadata = JSON.parse(parameters[4]);
      }
      return { rowCount: 1, rows: [] };
    },
  };
  const repository = new EditorialNewsDiscoveryRepository({});

  // When
  const completed = await repository.finishRun(client, {
    id: runId,
    status: 'completed',
    apiCallCount: 1,
    resultCount: 3,
    insertedCount: 2,
    duplicateCount: 1,
    irrelevantCount: 0,
    safeErrorCode: null,
  });

  // Then
  assert.deepEqual(queries.map((sql) => sql.split(/\s/u)[0]), [
    'BEGIN',
    'UPDATE',
    'INSERT',
    'COMMIT',
  ]);
  assert.equal(completed.apiCallCount, 7);
  assert.equal(completionMetadata.apiCallCount, 7);
});

test('NEWS-ATOMIC-002: audit insertion failure rolls back run completion', async () => {
  // Given
  const queries = [];
  const client = {
    async query(sql) {
      queries.push(sql);
      if (sql.startsWith('UPDATE editorial_news_runs')) {
        return { rowCount: 1, rows: [runRow({ status: 'completed' })] };
      }
      if (sql.startsWith('INSERT INTO editorial_news_events')) {
        throw new Error('audit storage unavailable');
      }
      return { rowCount: 1, rows: [] };
    },
  };
  const repository = new EditorialNewsDiscoveryRepository({});

  // When
  const completion = repository.finishRun(client, {
    id: runId,
    status: 'completed',
    apiCallCount: 1,
    resultCount: 0,
    insertedCount: 0,
    duplicateCount: 0,
    irrelevantCount: 0,
    safeErrorCode: null,
  });

  // Then
  await assert.rejects(completion, /audit storage unavailable/u);
  assert.deepEqual(queries.map((sql) => sql.split(/\s/u)[0]), [
    'BEGIN',
    'UPDATE',
    'INSERT',
    'ROLLBACK',
  ]);
});

test('NEWS-ATOMIC-003: audit insertion failure rolls back a new run', async () => {
  // Given
  const queries = [];
  const client = {
    async query(sql) {
      queries.push(sql);
      if (sql.startsWith('SELECT clock_timestamp')) {
        return { rowCount: 1, rows: [{ requested_at: new Date('2026-07-26T00:00:00Z') }] };
      }
      if (sql.includes('SELECT * FROM editorial_news_runs')) {
        return { rowCount: 0, rows: [] };
      }
      if (sql.startsWith('INSERT INTO editorial_news_runs')) {
        return { rowCount: 1, rows: [runRow()] };
      }
      if (sql.startsWith('INSERT INTO editorial_news_events')) {
        throw new Error('audit storage unavailable');
      }
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  const repository = new EditorialNewsDiscoveryRepository({
    async connect() { return client; },
  });

  // When
  const creation = repository.withRunLock({
    actorUserId,
    runDateKst: '2026-07-26',
    profileVersion: 'v1',
  }, async () => {
    throw new Error('callback must not run');
  });

  // Then
  await assert.rejects(creation, /audit storage unavailable/u);
  const verbs = queries.map((sql) => sql.split(/\s/u)[0]);
  assert.deepEqual(verbs.slice(2, 7), ['SELECT', 'BEGIN', 'INSERT', 'INSERT', 'ROLLBACK']);
  assert.equal(verbs.at(-1), 'SELECT');
});
