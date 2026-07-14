const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  createPublicTicket,
  hashPublicTicket,
} = require('../../card-studio/services/dataRightsCrypto');
const { listMigrationFiles, migrationPoolOptions } = require('../database/run-migrations');

const ROOT = path.join(__dirname, '..', '..');

test('RIGHTS-TICKET-001: Given 50 requests When issuing public tickets Then every ticket is opaque and unique', () => {
  const tickets = Array.from({ length: 50 }, () => createPublicTicket());

  assert.equal(new Set(tickets).size, 50);
  assert.equal(tickets.every((ticket) => /^DR_[A-Za-z0-9_-]{43}$/.test(ticket)), true);
  assert.equal(tickets.some((ticket) => /^DR-\d{4}-\d+$/.test(ticket)), false);
  assert.equal(tickets.every((ticket) => hashPublicTicket(ticket).length === 64), true);
});

test('RIGHTS-MIGRATION-001: Given managed migrations When listing Then legacy ad-hoc migrations are not replayed', () => {
  assert.deepEqual(listMigrationFiles(), ['migration-004-data-rights.sql']);
});

test('RIGHTS-PRIVACY-001: Given the data-rights schema When inspected Then query text and ticket plaintext have no columns', () => {
  const sql = fs.readFileSync(
    path.join(ROOT, 'backend', 'database', 'migration-004-data-rights.sql'),
    'utf8',
  ).toLowerCase();

  assert.equal(sql.includes('raw_query'), false);
  assert.equal(sql.includes('fingerprint'), false);
  assert.equal(sql.includes('public_ticket '), false);
  assert.equal(sql.includes('public_ticket_hash'), true);
  assert.equal(sql.includes('search_metric_daily'), true);
});

test('RIGHTS-METRIC-001: Given a PII-shaped query When classified Then only coarse dimensions remain', () => {
  const { classify } = require('../../card-studio/services/zeroResultSearchService');
  const raw = '010-1234-5678 private@example.com';
  const metric = classify({ query: raw, surface: 'records', observedDate: '2026-07-14' });

  assert.deepEqual(metric, {
    metricDate: '2026-07-14',
    surface: 'records',
    queryScript: 'mixed',
    queryLengthBucket: '11+',
  });
  assert.equal(JSON.stringify(metric).includes(raw), false);
});

test('RIGHTS-FAILURE-001: Given unavailable durable storage When submitting Then success is never returned', async () => {
  const servicePath = '../../card-studio/services/dataRequestService';
  delete require.cache[require.resolve(servicePath)];
  const service = require(servicePath);
  const unavailableRepository = {
    listActiveSuppressions: async () => [],
    createRequest: async () => {
      throw new Error('database offline');
    },
    close: async () => {},
  };

  await service.initialize({ repository: unavailableRepository });
  await assert.rejects(
    service.submitRequest({ type: 'correction', athleteName: '테스트선수', reason: '장애 검증' }),
    (error) => error.code === 'DATA_RIGHTS_UNAVAILABLE',
  );
  await service.shutdown();
});

test('RIGHTS-IMPORT-001: Given legacy files When planning twice Then checksums and counts are stable without raw output', () => {
  const { buildImportPlan, sourceChecksum } = require('../../tools/migrate-data-rights-files');
  process.env.DATA_RIGHTS_LEGACY_TICKET_PEPPER = 'test-only-legacy-ticket-pepper-32-bytes';
  const requests = [{
    ticketId: 'DR-2026-0001',
    type: 'correction',
    athleteName: '이관선수',
    reason: '이관 검증',
    status: 'received',
  }];
  const suppressions = [];

  const first = buildImportPlan(requests, suppressions);
  const second = buildImportPlan(requests, suppressions);
  assert.equal(first.requestCount, 1);
  assert.equal(second.requestCount, 1);
  assert.equal(sourceChecksum(requests, suppressions), sourceChecksum(requests, suppressions));
  assert.equal(JSON.stringify(first).includes('DR-2026-0001'), false);
});

test('RIGHTS-IMPORT-002: Given unmatched legacy suppression When planning Then migration is blocked', () => {
  const { buildImportPlan } = require('../../tools/migrate-data-rights-files');
  process.env.DATA_RIGHTS_LEGACY_TICKET_PEPPER = 'test-only-legacy-ticket-pepper-32-bytes';
  assert.throws(() => buildImportPlan([], [{
    ticketId: 'DR-2026-9999',
    mode: 'hide',
  }]), /Unmatched legacy suppression/);
});

test('RIGHTS-TLS-001: Given production PostgreSQL When configuring TLS Then certificate verification stays enabled', () => {
  const { postgresSslConfig } = require('../database/postgres-ssl');
  assert.deepEqual(postgresSslConfig({ NODE_ENV: 'production' }), { rejectUnauthorized: true });
  assert.equal(postgresSslConfig({ NODE_ENV: 'test' }), false);
});

test('RIGHTS-TLS-002: Given the migration CLI in production When building its pool Then verified TLS is mandatory', () => {
  assert.deepEqual(migrationPoolOptions({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://production.example/athletetime',
  }), {
    connectionString: 'postgresql://production.example/athletetime',
    ssl: { rejectUnauthorized: true },
  });
  assert.deepEqual(migrationPoolOptions({
    NODE_ENV: 'test',
    TEST_DATABASE_URL: 'postgresql://127.0.0.1/athletetime_test',
  }), {
    connectionString: 'postgresql://127.0.0.1/athletetime_test',
    ssl: false,
  });
});

test('RIGHTS-SCOPE-001: Given an event-specific request When suppressed Then another event stays visible', async () => {
  const servicePath = '../../card-studio/services/dataRequestService';
  const { MemoryDataRightsRepository } = require('../../card-studio/repositories/memoryDataRightsRepository');
  delete require.cache[require.resolve(servicePath)];
  const service = require(servicePath);
  await service.initialize({ repository: new MemoryDataRightsRepository() });
  const receipt = await service.submitRequest({
    type: 'deletion',
    athleteName: '범위검증선수',
    affiliation: '테스트팀',
    competition: '테스트대회',
    event: '남자 100m 결승',
    reason: '종목 범위 검증',
  });
  const list = await service.listRequests();
  const target = list.find((item) => item.ticketHint === receipt.ticketId.slice(-8));
  await service.updateStatus(target.id, 'search_hidden', '', { expectedVersion: target.version });

  assert.equal(service.checkSuppression({
    name: '범위검증선수',
    affiliation: '테스트팀',
    competition: '테스트대회',
    event: '남자 100m 결승',
  }), 'hide');
  assert.equal(service.checkSuppression({
    name: '범위검증선수',
    affiliation: '테스트팀',
    competition: '테스트대회',
    event: '남자 200m 결승',
  }), null);
  await service.shutdown();
});
