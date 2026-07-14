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
    purgeExpiredContacts: async () => { purgeCalls += 1; },
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
        checkSuppression: (input) => { observed.push(input); return null; },
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
  } finally {
    resultsStore.getRawByFilename = originals.getRawByFilename;
    resultsStore.isPublicResultFilename = originals.isPublicResultFilename;
    resultsStore.listCompetitions = originals.listCompetitions;
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
