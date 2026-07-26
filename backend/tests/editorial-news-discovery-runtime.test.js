const assert = require('node:assert/strict');
const test = require('node:test');
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
