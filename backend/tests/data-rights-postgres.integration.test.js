const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const test = require('node:test');
const { Pool } = require('pg');
const { runMigrations } = require('../database/run-migrations');
const { PostgresDataRightsRepository } = require('../../card-studio/repositories/postgresDataRightsRepository');
const { buildImportPlan, importPlan } = require('../../tools/migrate-data-rights-files');

const connectionString = process.env.TEST_DATABASE_URL;

async function isolatedPool(t) {
  const schema = `rights_${crypto.randomUUID().replaceAll('-', '')}`;
  const adminPool = new Pool({ connectionString, ssl: false, max: 2 });
  await adminPool.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({
    connectionString,
    ssl: false,
    max: 12,
    options: `-c search_path=${schema}`,
  });
  t.after(async () => {
    await pool.end();
    await adminPool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await adminPool.end();
  });
  return pool;
}

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

test('RIGHTS-PG-000: Given a PostgreSQL repository When health is checked Then it executes SELECT 1', async () => {
  const calls = [];
  const repository = new PostgresDataRightsRepository({
    query: async (sql) => {
      calls.push(sql);
      return { rows: [{ '?column?': 1 }] };
    },
  });

  assert.equal(await repository.healthCheck(), true);
  assert.deepEqual(calls, ['SELECT 1']);
});

test('RIGHTS-PG-002: Given a drifted pre-existing table When migrating Then the migration rolls back without a ledger entry', {
  skip: !connectionString,
  timeout: 30000,
}, async (t) => {
  const pool = await isolatedPool(t);
  await pool.query(`
    CREATE TABLE data_requests (
      id UUID PRIMARY KEY,
      public_ticket_hash CHAR(64) UNIQUE NOT NULL,
      status VARCHAR(20) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await assert.rejects(
    runMigrations({ pool }),
    /schema contract.*data_requests\.athlete_name/i,
  );

  const ledger = await pool.query(`
    SELECT to_regclass('athletetime_migrations') AS table_name
  `);
  assert.equal(ledger.rows[0].table_name, null);
  const rolledBackTable = await pool.query(`
    SELECT to_regclass('data_request_events') AS table_name
  `);
  assert.equal(rolledBackTable.rows[0].table_name, null);
});

test('RIGHTS-PG-003: Given an applied migration that later drifts When restarting Then contract validation rejects it', {
  skip: !connectionString,
  timeout: 30000,
}, async (t) => {
  const pool = await isolatedPool(t);
  await runMigrations({ pool });
  const beforeDrift = await pool.query(`
    SELECT COUNT(*)::int AS count FROM athletetime_migrations
  `);
  await pool.query('ALTER TABLE data_requests DROP COLUMN athlete_name CASCADE');

  await assert.rejects(
    runMigrations({ pool }),
    /schema contract.*data_requests\.athlete_name/i,
  );

  const applied = await pool.query(`
    SELECT COUNT(*)::int AS count FROM athletetime_migrations
  `);
  assert.equal(applied.rows[0].count, beforeDrift.rows[0].count);
});

test('RIGHTS-PG-001: Given isolated PostgreSQL When exercising lifecycle Then requests survive restart without plaintext leakage', {
  skip: !connectionString,
  timeout: 30000,
}, async (t) => {
  process.env.DATA_RIGHTS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  const firstPool = await isolatedPool(t);
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
      competition: '통합 검증 대회',
      event: '남자 100m 결승',
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

  const unscopedReceipt = await service.submitRequest({
    type: 'deletion', athleteName: '범위없는선수', reason: '범위 검증',
  });
  const unscopedTarget = (await service.listRequests())
    .find((item) => item.ticketHint === unscopedReceipt.ticketId.slice(-8));
  const rejectedScope = await service.updateStatus(unscopedTarget.id, 'search_hidden', '', {
    expectedVersion: unscopedTarget.version,
  });
  assert.equal(rejectedScope.ok, false);
  assert.equal(rejectedScope.invalidScope, true);

  const contactTarget = (await service.listRequests())
    .find((item) => item.ticketHint === withContact.ticketId.slice(-8));
  assert.ok(contactTarget);
  await service.updateStatus(contactTarget.id, 'corrected', '처리 완료', {
    expectedVersion: contactTarget.version,
  });
  const contactRetention = await firstPool.query(`
    SELECT contact_purge_at > NOW() AS future,
           contact_purge_at <= NOW() + INTERVAL '30 days 1 minute' AS bounded
    FROM data_requests WHERE id = $1
  `, [contactTarget.id]);
  assert.deepEqual(contactRetention.rows[0], { future: true, bounded: true });

  process.env.DATA_RIGHTS_LEGACY_TICKET_PEPPER = 'integration-only-legacy-ticket-pepper-32-bytes';
  const importChecksum = crypto.createHash('sha256').update('integration-import').digest('hex');
  const importPlanRows = buildImportPlan([{
    ticketId: 'DR-2026-9001',
    type: 'correction',
    athleteName: '이관통합선수',
    reason: '이관 재실행 검증',
    status: 'received',
  }], []);
  const firstImport = await importPlan(firstPool, importPlanRows, importChecksum);
  const duplicateImport = await importPlan(firstPool, importPlanRows, importChecksum);
  assert.deepEqual(firstImport, { imported: 1, duplicateRun: false });
  assert.deepEqual(duplicateImport, { imported: 0, duplicateRun: true });

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

  const activeRetentionTarget = list.find((item) => item.athleteName === '테스트선수1');
  const inactiveRetentionTarget = list.find((item) => item.athleteName === '테스트선수2');
  assert.ok(activeRetentionTarget);
  assert.ok(inactiveRetentionTarget);
  const retentionActor = crypto.randomUUID();
  await service.updateStatus(activeRetentionTarget.id, 'under_review', 'active private note', {
    expectedVersion: activeRetentionTarget.version,
    actorUserId: retentionActor,
  });
  const inactiveStarted = await service.updateStatus(
    inactiveRetentionTarget.id,
    'under_review',
    'inactive private note',
    { expectedVersion: inactiveRetentionTarget.version, actorUserId: retentionActor },
  );
  await service.updateStatus(inactiveRetentionTarget.id, 'corrected', 'closed private note', {
    expectedVersion: inactiveStarted.version,
    actorUserId: retentionActor,
  });
  await firstPool.query(`
    UPDATE data_requests
    SET created_at = NOW() - INTERVAL '3 years 1 day',
        contact_purge_at = NOW() + INTERVAL '1 year'
    WHERE id = ANY($1::uuid[])
  `, [[activeRetentionTarget.id, inactiveRetentionTarget.id, contactTarget.id]]);
  await firstPool.query(`
    INSERT INTO search_metric_daily
      (metric_date, surface, query_script, query_length_bucket, count)
    VALUES
      (CURRENT_DATE - INTERVAL '25 months', 'records', 'latin', '4-6', 7),
      (CURRENT_DATE - INTERVAL '23 months', 'records', 'latin', '4-6', 11)
  `);

  const repository = new PostgresDataRightsRepository(firstPool);
  assert.equal(await repository.healthCheck(), true);
  const purged = await repository.purgeExpiredData();
  assert.deepEqual(purged, { requests: 3, contacts: 1, metrics: 1, suppressions: 1 });
  assert.deepEqual(await repository.purgeExpiredData(), {
    requests: 0, contacts: 0, metrics: 0, suppressions: 0,
  });

  const retainedRequests = await firstPool.query(`
    SELECT id, public_ticket_hash, ticket_hint, athlete_name, affiliation, competition,
           event, record_key, source_id, reason, contact_ciphertext, contact_iv,
           contact_tag, contact_key_version, retention_purged_at IS NOT NULL AS purged
    FROM data_requests
    WHERE id = ANY($1::uuid[])
    ORDER BY id
  `, [[activeRetentionTarget.id, inactiveRetentionTarget.id, contactTarget.id]]);
  assert.equal(retainedRequests.rowCount, 3);
  for (const row of retainedRequests.rows) {
    assert.equal(row.public_ticket_hash.length, 64);
    assert.equal(row.ticket_hint, 'REDACTED');
    assert.equal(row.athlete_name, 'REDACTED');
    assert.equal(row.affiliation, '');
    assert.equal(row.competition, '');
    assert.equal(row.event, '');
    assert.equal(row.record_key, null);
    assert.equal(row.source_id, null);
    assert.equal(row.reason, '[retention redacted]');
    assert.equal(row.contact_ciphertext, null);
    assert.equal(row.contact_iv, null);
    assert.equal(row.contact_tag, null);
    assert.equal(row.contact_key_version, null);
    assert.equal(row.purged, true);
  }
  const retiredTickets = [submissions[1].ticketId, submissions[2].ticketId, withContact.ticketId];
  for (const ticket of retiredTickets) {
    assert.equal(await service.getStatusByTicket(ticket), null);
  }

  const retainedEvents = await firstPool.query(`
    SELECT actor_user_id, note
    FROM data_request_events
    WHERE request_id = ANY($1::uuid[])
  `, [[activeRetentionTarget.id, inactiveRetentionTarget.id, contactTarget.id]]);
  assert.equal(retainedEvents.rowCount > 0, true);
  assert.equal(retainedEvents.rows.every((row) => row.actor_user_id === null), true);
  assert.equal(retainedEvents.rows.every((row) => row.note === '[retention redacted]'), true);

  const suppressionsAfterPurge = await firstPool.query(`
    SELECT request_id, active FROM record_suppressions
    WHERE request_id = ANY($1::uuid[])
  `, [[activeRetentionTarget.id, inactiveRetentionTarget.id]]);
  assert.deepEqual(suppressionsAfterPurge.rows, [{
    request_id: activeRetentionTarget.id,
    active: true,
  }]);
  const metricsAfterPurge = await firstPool.query(`
    SELECT count::int AS count FROM search_metric_daily
    WHERE surface = 'records' AND query_script = 'latin' AND query_length_bucket = '4-6'
    ORDER BY metric_date
  `);
  assert.deepEqual(metricsAfterPurge.rows, [{ count: 11 }]);

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

  delete require.cache[require.resolve(servicePath)];
  const restartedService = require(servicePath);
  await restartedService.initialize({ pool: firstPool });
  const status = await restartedService.getStatusByTicket(submissions[0].ticketId);
  assert.ok(status);
  assert.equal(status.version, 2);
  assert.equal(restartedService.getActiveSuppressions().length, 2);
  await restartedService.shutdown();
});
