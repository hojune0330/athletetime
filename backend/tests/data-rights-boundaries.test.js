const assert = require('node:assert/strict');
const test = require('node:test');

test('RIGHTS-LOG-001: Given either public API mount When logging a ticket lookup Then the ticket is redacted', () => {
  const { requestLogPath } = require('../../src/requestLogPath');
  assert.equal(requestLogPath({
    originalUrl: '/api/card-studio/data-requests/DR_secret-ticket?lookup=true',
    path: '/data-requests/DR_secret-ticket',
  }), '/api/card-studio/data-requests/[redacted]');
  assert.equal(requestLogPath({
    originalUrl: '/api/data-requests/DR_secret-ticket',
    path: '/data-requests/DR_secret-ticket',
  }), '/api/data-requests/[redacted]');
});

test('RIGHTS-RECOVERY-001: Given one transient storage failure When the next write arrives Then readiness recovers', async () => {
  const servicePath = '../../card-studio/services/dataRequestService';
  const previous = { nodeEnv: process.env.NODE_ENV, testUrl: process.env.TEST_DATABASE_URL };
  process.env.NODE_ENV = 'test';
  process.env.TEST_DATABASE_URL = 'postgresql://unused.test/athletetime';
  delete require.cache[require.resolve(servicePath)];
  const service = require(servicePath);
  let createAttempts = 0;
  const repository = {
    purgeExpiredData: async () => ({}),
    listActiveSuppressions: async () => [],
    healthCheck: async () => true,
    createRequest: async ({ request }) => {
      createAttempts += 1;
      if (createAttempts === 1) throw new Error('transient database error');
      return { status: 'received', version: 1, receivedAt: '2026-07-14T00:00:00.000Z', ...request };
    },
    close: async () => {},
  };
  try {
    await service.initialize({ repository });
    await assert.rejects(
      service.submitRequest({ type: 'correction', athleteName: '복구선수', reason: '첫 시도' }),
      (error) => error.code === 'DATA_RIGHTS_UNAVAILABLE',
    );
    assert.equal(service.readiness().ready, false);
    const recovered = await service.submitRequest({ type: 'correction', athleteName: '복구선수', reason: '두 번째 시도' });
    assert.equal(recovered.ok, true);
    assert.equal(service.readiness().ready, true);
  } finally {
    await service.shutdown();
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.testUrl === undefined) delete process.env.TEST_DATABASE_URL;
    else process.env.TEST_DATABASE_URL = previous.testUrl;
  }
});
