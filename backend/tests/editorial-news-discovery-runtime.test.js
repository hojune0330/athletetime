const assert = require('node:assert/strict');
const test = require('node:test');
const { EditorialNewsDiscoveryRepository } = require('../../card-studio/repositories/editorialNewsDiscoveryRepository');
const { EditorialNewsDiscoveryService } = require('../../card-studio/services/editorialNewsDiscoveryService');

test('NEWS-RUNTIME-001: completed manual run is idempotent', async () => {
  // Given
  let calls = 0;
  const repository = {
    async withRunLock(_input, callback) { return callback({ existing: { id: 'run-1', status: 'completed' } }); },
  };
  const service = new EditorialNewsDiscoveryService({ repository, provider: { async search() { calls += 1; } } });

  // When
  const run = await service.runManual({ actorUserId: '00000000-0000-4000-8000-000000000001', runDateKst: '2026-07-26' });

  // Then
  assert.equal(run.id, 'run-1');
  assert.equal(calls, 0);
});

test('NEWS-RUNTIME-002: provider partial failure is recorded deterministically', async () => {
  // Given
  const saved = [];
  const repository = {
    async withRunLock(_input, callback) { return callback({ id: 'run-1', status: 'running' }); },
    async upsertDiscovery(_client, item) { saved.push(item); return { inserted: true }; },
    async finishRun(_client, input) { return input; },
  };
  let number = 0;
  const provider = { async search() {
    number += 1;
    if (number === 2) throw Object.assign(new Error('down'), { code: 'HTTP_500' });
    return { items: [{ title: '육상 대회 결과', originallink: 'https://example.com/a', link: 'https://naver.example/a', pubDate: '2026-07-26T00:00:00Z' }] };
  } };
  const service = new EditorialNewsDiscoveryService({ repository, provider, profiles: ['korean-athletics', 'korean-meets'] });

  // When
  const run = await service.runManual({ actorUserId: '00000000-0000-4000-8000-000000000001', runDateKst: '2026-07-26' });

  // Then
  assert.equal(run.status, 'failed');
  assert.equal(run.safeErrorCode, 'partial_failure');
  assert.equal(run.apiCallCount, 2);
  assert.equal(run.insertedCount, 1);
  assert.equal(saved.length, 1);
});

test('NEWS-RUNTIME-003: provider retry telemetry is persisted when available', async () => {
  // Given
  const repository = {
    async withRunLock(_input, callback) { return callback({ id: 'run-1', status: 'running' }); },
    async finishRun(_client, input) { return input; },
  };
  const service = new EditorialNewsDiscoveryService({ repository, profiles: ['korean-athletics'], provider: { async search() { return { items: [], apiCallCount: 2 }; } } });

  // When
  const run = await service.runManual({ actorUserId: '00000000-0000-4000-8000-000000000001', runDateKst: '2026-07-26' });

  // Then
  assert.equal(run.apiCallCount, 2);
});

test('NEWS-RUNTIME-004: failed provider retry telemetry is persisted when available', async () => {
  // Given
  const repository = { async withRunLock(_input, callback) { return callback({ id: 'run-1', status: 'running' }); }, async finishRun(_client, input) { return input; } };
  const provider = { async search() { throw Object.assign(new Error('outage'), { apiCallCount: 2 }); } };
  const service = new EditorialNewsDiscoveryService({ repository, provider, profiles: ['korean-athletics'] });

  // When
  const run = await service.runManual({ actorUserId: '00000000-0000-4000-8000-000000000001', runDateKst: '2026-07-26' });

  // Then
  assert.equal(run.apiCallCount, 2);
  assert.equal(run.status, 'failed');
});

test('NEWS-RUNTIME-005: a fail-closed quota rejection records zero network calls', async () => {
  const repository = {
    async withRunLock(_input, callback) { return callback({ id: 'run-1', status: 'running' }); },
    async finishRun(_client, input) { return input; },
  };
  const provider = { async search() {
    throw Object.assign(new Error('quota exceeded'), { apiCallCount: 0, code: 'QUOTA_EXCEEDED' });
  } };
  const service = new EditorialNewsDiscoveryService({
    repository,
    provider,
    profiles: ['korean-athletics'],
  });

  const run = await service.runManual({
    actorUserId: '00000000-0000-4000-8000-000000000001',
    runDateKst: '2026-07-26',
  });

  assert.equal(run.apiCallCount, 0);
  assert.equal(run.status, 'failed');
  assert.equal(run.safeErrorCode, 'quota_exceeded');
});

test('NEWS-RUNTIME-006: missing provider credentials get a specific safe error code', async () => {
  const repository = {
    async withRunLock(_input, callback) { return callback({ id: 'run-1', status: 'running' }); },
    async finishRun(_client, input) { return input; },
  };
  const provider = { async search() {
    throw Object.assign(new Error('must not be returned'), {
      apiCallCount: 0,
      code: 'CREDENTIALS_MISSING',
    });
  } };
  const service = new EditorialNewsDiscoveryService({
    repository,
    provider,
    profiles: ['korean-athletics', 'korean-meets'],
  });

  const run = await service.runManual({
    actorUserId: '00000000-0000-4000-8000-000000000001',
    runDateKst: '2026-07-26',
  });

  assert.equal(run.safeErrorCode, 'credentials_missing');
  assert.doesNotMatch(JSON.stringify(run), /must not be returned/u);
});

test('NEWS-RUNTIME-007: advisory lock stays held until asynchronous collection finishes', async () => {
  // Given
  const order = [];
  const client = {
    async query(sql) {
      if (sql.includes('pg_advisory_lock')) order.push('locked');
      if (sql.includes('pg_advisory_unlock')) order.push('unlocked');
      if (sql.includes('SELECT * FROM editorial_news_runs')) return { rowCount: 0, rows: [] };
      if (sql.includes('INSERT INTO editorial_news_runs')) {
        return {
          rowCount: 1,
          rows: [{
            id: '10000000-0000-4000-8000-000000000001',
            run_date_kst: '2026-07-26',
            profile_version: 'v1',
            trigger: 'manual',
            status: 'running',
            started_at: '2026-07-26T00:00:00Z',
            completed_at: null,
            api_call_count: 0,
            result_count: 0,
            inserted_count: 0,
            duplicate_count: 0,
            irrelevant_count: 0,
            safe_error_code: null,
          }],
        };
      }
      return { rowCount: 1, rows: [] };
    },
    release() { order.push('released'); },
  };
  const repository = new EditorialNewsDiscoveryRepository({ async connect() { return client; } });

  // When
  await repository.withRunLock({
    actorUserId: '00000000-0000-4000-8000-000000000001',
    runDateKst: '2026-07-26',
    profileVersion: 'v1',
  }, async () => {
    order.push('callback-start');
    await Promise.resolve();
    order.push('callback-end');
  });

  // Then
  assert.deepEqual(order, ['locked', 'callback-start', 'callback-end', 'unlocked', 'released']);
});

test('NEWS-RUNTIME-008: every provider attempt uses the repository-backed budget reservation', async () => {
  // Given
  let reservations = 0;
  const client = { name: 'db-client' };
  const repository = {
    async withRunLock(_input, callback) {
      return callback({ client, id: 'run-1', status: 'running', apiCallCount: 0 });
    },
    async reserveProviderCall(lockedClient, input) {
      assert.equal(lockedClient, client);
      assert.equal(input.runId, 'run-1');
      reservations += 1;
    },
    async finishRun(_client, input) { return input; },
  };
  const provider = {
    async search({ reserveCall }) {
      await reserveCall();
      return { items: [], apiCallCount: 1 };
    },
  };
  const service = new EditorialNewsDiscoveryService({
    repository,
    provider,
    profiles: ['korean-athletics'],
  });

  // When
  const run = await service.runManual({
    actorUserId: '00000000-0000-4000-8000-000000000001',
    runDateKst: '2026-07-26',
  });

  // Then
  assert.equal(reservations, 1);
  assert.equal(run.apiCallCount, 1);
});

test('NEWS-RUNTIME-009: persistence failures fail the run instead of becoming irrelevant news', async () => {
  // Given
  const repository = {
    async withRunLock(_input, callback) {
      return callback({ client: {}, id: 'run-1', status: 'running', apiCallCount: 0 });
    },
    async upsertDiscovery() { throw new Error('database unavailable'); },
    async finishRun(_client, input) { return input; },
  };
  const provider = {
    async search() {
      return {
        items: [{
          title: '중학생 육상 대회 결과',
          originallink: 'https://example.com/result',
          link: 'https://naver.example/result',
          pubDate: '2026-07-26T00:00:00Z',
        }],
        apiCallCount: 1,
      };
    },
  };
  const service = new EditorialNewsDiscoveryService({
    repository,
    provider,
    profiles: ['korean-athletics'],
  });

  // When
  const run = await service.runManual({
    actorUserId: '00000000-0000-4000-8000-000000000001',
    runDateKst: '2026-07-26',
  });

  // Then
  assert.equal(run.status, 'failed');
  assert.equal(run.safeErrorCode, 'storage_failure');
  assert.equal(run.irrelevantCount, 0);
  assert.equal(run.resultCount, 1);
});

test('NEWS-RUNTIME-010: youth wording is persisted as a conservative minor-review warning', async () => {
  // Given
  let saved;
  const repository = {
    async withRunLock(_input, callback) {
      return callback({ client: {}, id: 'run-1', status: 'running', apiCallCount: 0 });
    },
    async upsertDiscovery(_client, input) { saved = input; return { inserted: true }; },
    async finishRun(_client, input) { return input; },
  };
  const provider = {
    async search() {
      return {
        items: [{
          title: 'U18 육상 선수권대회 결과',
          originallink: 'https://example.com/u18',
          link: 'https://naver.example/u18',
          pubDate: '2026-07-26T00:00:00Z',
        }],
        apiCallCount: 1,
      };
    },
  };
  const service = new EditorialNewsDiscoveryService({
    repository,
    provider,
    profiles: ['korean-athletics'],
  });

  // When
  await service.runManual({
    actorUserId: '00000000-0000-4000-8000-000000000001',
    runDateKst: '2026-07-26',
  });

  // Then
  assert.equal(saved.subjectAgeGroup, 'minor');
});
