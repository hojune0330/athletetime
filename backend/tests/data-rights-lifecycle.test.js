const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

test('RIGHTS-LEGACY-001: Given legacy lookup is not configured When queried Then storage readiness stays healthy', async () => {
  const servicePath = '../../card-studio/services/dataRequestService';
  const { MemoryDataRightsRepository } = require('../../card-studio/repositories/memoryDataRightsRepository');
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    testDatabaseUrl: process.env.TEST_DATABASE_URL,
    pepper: process.env.DATA_RIGHTS_LEGACY_TICKET_PEPPER,
  };
  process.env.NODE_ENV = 'test';
  process.env.TEST_DATABASE_URL = 'postgresql://unused.test/athletetime';
  delete process.env.DATA_RIGHTS_LEGACY_TICKET_PEPPER;
  delete require.cache[require.resolve(servicePath)];
  const service = require(servicePath);

  try {
    await service.initialize({ repository: new MemoryDataRightsRepository() });
    await assert.rejects(
      service.getStatusByTicket('DR-2026-0001'),
      (error) => error.code === 'LEGACY_TICKET_LOOKUP_UNAVAILABLE',
    );
    assert.equal(service.readiness().ready, true);
  } finally {
    await service.shutdown();
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.testDatabaseUrl === undefined) delete process.env.TEST_DATABASE_URL;
    else process.env.TEST_DATABASE_URL = previous.testDatabaseUrl;
    if (previous.pepper === undefined) delete process.env.DATA_RIGHTS_LEGACY_TICKET_PEPPER;
    else process.env.DATA_RIGHTS_LEGACY_TICKET_PEPPER = previous.pepper;
  }
});

test('RIGHTS-RETENTION-001: Given a long-lived process When the purge interval fires Then expired contacts are purged again', async () => {
  const servicePath = '../../card-studio/services/dataRequestService';
  delete require.cache[require.resolve(servicePath)];
  const service = require(servicePath);
  let purgeCalls = 0;
  let scheduledCallback;
  let canceled = false;
  const repository = {
    purgeExpiredData: async () => { purgeCalls += 1; },
    listActiveSuppressions: async () => [],
    close: async () => {},
  };

  await service.initialize({
    repository,
    scheduleInterval: (callback) => {
      scheduledCallback = callback;
      return { unref() {} };
    },
    cancelInterval: () => { canceled = true; },
  });
  assert.equal(purgeCalls, 1);
  assert.equal(typeof scheduledCallback, 'function');
  await scheduledCallback();
  assert.equal(purgeCalls, 2);
  await service.shutdown();
  assert.equal(canceled, true);
});

test('RIGHTS-SURFACE-002: Given a result table row When checking suppression Then its actual event is passed', () => {
  const resultsStore = require('../../card-studio/services/resultsStore');
  const originals = {
    getRawByFilename: resultsStore.getRawByFilename,
    isPublicResultFilename: resultsStore.isPublicResultFilename,
    listCompetitions: resultsStore.listCompetitions,
  };
  const observed = [];
  resultsStore.getRawByFilename = () => ({
    meta: { competition_name: '범위 테스트 대회', year: '2026' },
    events: [{
      event: '남자 100m 결승',
      results: [{ rank: 1, name: '범위선수', affiliation: '범위팀', record: '10.50' }],
    }],
  });
  resultsStore.isPublicResultFilename = () => true;
  resultsStore.listCompetitions = () => [];

  try {
    const { createResultEventsHandler } = require('../../card-studio/routes/resultEventsRoute');
    const handler = createResultEventsHandler({
      config: { dirs: { raw: '' } },
      dataRequestService: {
        checkSuppression: (input) => { observed.push(input); return 'hide'; },
      },
      dataRightsPolicy: {
        publicResultProvenance: () => ({
          sourceLabel: '테스트 출처', sourceTier: 'official', scopeNotice: '', correctionUrl: '',
        }),
      },
      stableAthleteId: () => 'athlete-test',
    });
    let payload;
    handler(
      { params: { filename: 'event-scope-test.json' }, query: {} },
      { status() { return this; }, json(value) { payload = value; return value; } },
    );

    assert.equal(payload.success, true);
    assert.equal(observed[0].event, '남자 100m 결승');
    assert.equal(payload.data.events[0].results.length, 0);
  } finally {
    resultsStore.getRawByFilename = originals.getRawByFilename;
    resultsStore.isPublicResultFilename = originals.isPublicResultFilename;
    resultsStore.listCompetitions = originals.listCompetitions;
  }
});

test('RIGHTS-SCOPE-002: Given a request without a record scope When activating suppression Then it is rejected', async () => {
  const servicePath = '../../card-studio/services/dataRequestService';
  const { MemoryDataRightsRepository } = require('../../card-studio/repositories/memoryDataRightsRepository');
  delete require.cache[require.resolve(servicePath)];
  const service = require(servicePath);
  await service.initialize({ repository: new MemoryDataRightsRepository() });
  const receipt = await service.submitRequest({
    type: 'deletion', athleteName: '동명이인선수', competition: '범위대회',
    event: '남자 100m 결승', reason: '소속 없는 요청',
  });
  const target = (await service.listRequests())
    .find((item) => item.ticketHint === receipt.ticketId.slice(-8));
  const result = await service.updateStatus(target.id, 'search_hidden', '', {
    expectedVersion: target.version,
  });
  assert.equal(result.ok, false);
  assert.equal(result.invalidScope, true);
  assert.equal(service.checkSuppression({
    name: '동명이인선수', competition: '다른 대회', event: '남자 100m 결승',
  }), null);
  await service.shutdown();
});

test('RIGHTS-CACHE-001: Given two service instances When one hides a record Then the other refreshes it', async () => {
  const servicePath = '../../card-studio/services/dataRequestService';
  const { MemoryDataRightsRepository } = require('../../card-studio/repositories/memoryDataRightsRepository');
  const repository = new MemoryDataRightsRepository();
  delete require.cache[require.resolve(servicePath)];
  const writer = require(servicePath);
  await writer.initialize({ repository });

  let refresh;
  delete require.cache[require.resolve(servicePath)];
  const reader = require(servicePath);
  await reader.initialize({
    repository,
    scheduleSuppressionInterval: (callback) => {
      refresh = callback;
      return { unref() {} };
    },
    cancelSuppressionInterval: () => {},
  });

  try {
    const receipt = await writer.submitRequest({
      type: 'deletion',
      athleteName: '동기화선수',
      affiliation: '동기화팀',
      competition: '동기화대회',
      event: '남자 100m 결승',
      reason: '다중 인스턴스 동기화',
    });
    const target = (await writer.listRequests())
      .find((item) => item.ticketHint === receipt.ticketId.slice(-8));
    const updated = await writer.updateStatus(target.id, 'search_hidden', '', {
      expectedVersion: target.version,
    });
    assert.equal(updated.ok, true);
    assert.equal(reader.checkSuppression({
      name: '동기화선수', affiliation: '동기화팀', competition: '동기화대회', event: '남자 100m 결승',
    }), null);
    await refresh();
    assert.equal(reader.checkSuppression({
      name: '동기화선수', affiliation: '동기화팀', competition: '동기화대회', event: '남자 100m 결승',
    }), 'hide');
  } finally {
    await reader.shutdown();
    await writer.shutdown();
  }
});

test('RIGHTS-SURFACE-001: Given public surfaces When checking suppression Then every call includes event scope', () => {
  const files = [
    'card-studio/routes/resultEventsRoute.js',
    'card-studio/services/recordAnalyticsService.js',
    'card-studio/services/searchService.js',
    'card-studio/services/insightService.js',
  ];
  for (const file of files) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert.match(source, /checkSuppression\(\{[\s\S]{0,220}?event:/, `${file} must pass event scope`);
  }
});
