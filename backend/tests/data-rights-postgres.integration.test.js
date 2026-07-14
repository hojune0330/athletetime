const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const test = require('node:test');
const { Pool } = require('pg');
const { runMigrations } = require('../database/run-migrations');

const connectionString = process.env.TEST_DATABASE_URL;

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function request(server, method, pathname, body) {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}${pathname}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    cacheControl: response.headers.get('cache-control'),
    body: await response.json(),
  };
}

test('RIGHTS-PG-001: Given isolated PostgreSQL When exercising lifecycle Then requests survive restart without plaintext leakage', {
  skip: !connectionString,
  timeout: 30000,
}, async (t) => {
  process.env.DATA_RIGHTS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  const firstPool = new Pool({ connectionString, ssl: false, max: 12 });
  const firstMigration = await runMigrations({ pool: firstPool });
  const secondMigration = await runMigrations({ pool: firstPool });
  assert.equal(firstMigration.applied.includes('migration-004-data-rights.sql'), true);
  assert.deepEqual(secondMigration.applied, []);

  await firstPool.query(`
    TRUNCATE data_request_events, record_suppressions, data_requests,
             search_metric_daily, data_rights_import_runs RESTART IDENTITY CASCADE
  `);

  const servicePath = '../../card-studio/services/dataRequestService';
  delete require.cache[require.resolve(servicePath)];
  const service = require(servicePath);
  await service.initialize({ pool: firstPool });

  const app = express();
  app.use(express.json());
  app.use('/api/card-studio', require('../../card-studio/routes/publicRoutes'));
  app.use('/api/card-studio/admin', (req, _res, next) => {
    req.user = { id: crypto.randomUUID() };
    next();
  }, require('../../card-studio/routes/adminRoutes'));
  const httpServer = await listen(app);
  t.after(async () => {
    if (httpServer.listening) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });

  const httpCreated = await request(httpServer, 'POST', '/api/card-studio/data-requests', {
    type: 'correction',
    athleteName: 'HTTP검증선수',
    reason: 'HTTP 생애주기 검증',
  });
  assert.equal(httpCreated.status, 201);
  assert.equal(httpCreated.cacheControl, 'no-store');
  const httpTicket = httpCreated.body.data.ticketId;
  const httpStatus = await request(httpServer, 'GET', `/api/card-studio/data-requests/${httpTicket}`);
  assert.equal(httpStatus.status, 200);
  assert.equal(httpStatus.cacheControl, 'no-store');
  assert.equal(JSON.stringify(httpStatus.body).includes(httpTicket), false);

  const submissions = await Promise.all(Array.from({ length: 50 }, (_, index) =>
    service.submitRequest({
      type: 'correction',
      athleteName: `테스트선수${index}`,
      reason: '통합 검증',
    }),
  ));
  assert.equal(new Set(submissions.map((item) => item.ticketId)).size, 50);
  assert.equal(submissions.every((item) => !/^DR-\d{4}-/.test(item.ticketId)), true);

  const privateContact = 'private-integration@example.com';
  const withContact = await service.submitRequest({
    type: 'deletion',
    athleteName: '연락처검증선수',
    reason: '암호화 검증',
    contact: privateContact,
  });
  const persisted = await firstPool.query(`
    SELECT COUNT(*)::int AS count,
           COUNT(DISTINCT public_ticket_hash)::int AS ticket_count,
           BOOL_AND(public_ticket_hash <> '') AS hashes_present
    FROM data_requests
  `);
  assert.deepEqual(persisted.rows[0], { count: 52, ticket_count: 52, hashes_present: true });

  const serializedRows = JSON.stringify((await firstPool.query(`
    SELECT public_ticket_hash, ticket_hint, contact_ciphertext, reason FROM data_requests
  `)).rows);
  assert.equal(submissions.some((item) => serializedRows.includes(item.ticketId)), false);
  assert.equal(serializedRows.includes(withContact.ticketId), false);
  assert.equal(serializedRows.includes(privateContact), false);

  const list = await service.listRequests();
  const target = list.find((item) => item.athleteName === '테스트선수0');
  assert.ok(target);
  const competing = await Promise.all([
    request(httpServer, 'PATCH', `/api/card-studio/admin/data-requests/${target.id}`, {
      status: 'under_review', expectedVersion: target.version,
    }),
    request(httpServer, 'PATCH', `/api/card-studio/admin/data-requests/${target.id}`, {
      status: 'removed', expectedVersion: target.version,
    }),
  ]);
  assert.deepEqual(competing.map((item) => item.status).sort(), [200, 409]);

  await service.recordSearchMetric({
    metricDate: '2026-07-14',
    surface: 'records',
    queryScript: 'mixed',
    queryLengthBucket: '11+',
  });
  const metricColumns = await firstPool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'search_metric_daily' ORDER BY column_name
  `);
  const columnNames = metricColumns.rows.map((row) => row.column_name);
  assert.equal(columnNames.includes('raw_query'), false);
  assert.equal(columnNames.includes('fingerprint'), false);

  await service.shutdown();

  const unavailableRepository = {
    listActiveSuppressions: async () => [],
    createRequest: async () => { throw new Error('database offline'); },
    close: async () => {},
  };
  await service.initialize({ repository: unavailableRepository });
  const unavailable = await request(httpServer, 'POST', '/api/card-studio/data-requests', {
    type: 'correction', athleteName: '장애검증선수', reason: '장애 검증',
  });
  assert.equal(unavailable.status, 503);
  assert.equal(service.readiness().ready, false);
  await service.shutdown();

  const secondPool = new Pool({ connectionString, ssl: false, max: 4 });
  delete require.cache[require.resolve(servicePath)];
  const restartedService = require(servicePath);
  await restartedService.initialize({ pool: secondPool });
  const status = await restartedService.getStatusByTicket(submissions[0].ticketId);
  assert.ok(status);
  assert.equal(status.version, 2);
  assert.equal(restartedService.getActiveSuppressions().length, 1);
  await restartedService.shutdown();
});
