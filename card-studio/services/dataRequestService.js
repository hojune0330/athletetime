const { Pool } = require('pg');
const { runMigrations } = require('../../backend/database/run-migrations');
const { postgresSslConfig } = require('../../backend/database/postgres-ssl');
const { MemoryDataRightsRepository } = require('../repositories/memoryDataRightsRepository');
const { PostgresDataRightsRepository } = require('../repositories/postgresDataRightsRepository');
const { startContactPurgeSchedule } = require('./contactPurgeScheduler');
const {
  buildRecordKey,
  createPublicTicket,
  encryptContact,
  hashLegacyTicket,
  hashPublicTicket,
  ticketHint,
} = require('./dataRightsCrypto');
const {
  REQUEST_TYPES,
  STATUSES,
  sanitize,
  validateRequest,
} = require('./dataRequestValidation');
const { findSuppressionMode, freezeSuppressions } = require('./dataSuppressionMatcher');

let repository = null;
let ownedPool = null;
let initialized = false;
let ready = false;
let activeSuppressions = Object.freeze([]);
let stopContactPurgeSchedule = null;

function connectionString() {
  if (process.env.NODE_ENV === 'test' && process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL;
  }
  return process.env.DATABASE_URL || '';
}

function usesPostgres() {
  return connectionString().length > 0;
}

function createPool(url) {
  return new Pool({
    connectionString: url,
    ssl: postgresSslConfig(),
    max: 10,
    connectionTimeoutMillis: 3000,
  });
}

async function initialize(options = {}) {
  if (initialized) return { ready, mode: usesPostgres() ? 'postgres' : 'memory-development' };
  initialized = true;
  ready = false;

  try {
    if (options.repository) {
      repository = options.repository;
    } else if (usesPostgres()) {
      ownedPool = options.pool || createPool(connectionString());
      await runMigrations({ pool: ownedPool });
      repository = new PostgresDataRightsRepository(ownedPool);
    } else {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('PostgreSQL is required for production data-rights requests');
      }
      repository = new MemoryDataRightsRepository();
    }

    if (typeof repository.purgeExpiredContacts === 'function') {
      await storageCall(() => repository.purgeExpiredContacts());
    }
    await refreshSuppressions();
    ready = true;
    if (typeof repository.purgeExpiredContacts === 'function') {
      stopContactPurgeSchedule = startContactPurgeSchedule({
        purge: () => storageCall(() => repository.purgeExpiredContacts()),
        scheduleInterval: options.scheduleInterval,
        cancelInterval: options.cancelInterval,
      });
    }
    return { ready: true, mode: usesPostgres() ? 'postgres' : 'memory-development' };
  } catch (error) {
    if (stopContactPurgeSchedule) stopContactPurgeSchedule();
    stopContactPurgeSchedule = null;
    initialized = false;
    repository = null;
    if (ownedPool) await ownedPool.end().catch(() => {});
    ownedPool = null;
    throw error;
  }
}

async function shutdown() {
  ready = false;
  if (stopContactPurgeSchedule) stopContactPurgeSchedule();
  stopContactPurgeSchedule = null;
  if (repository) await repository.close();
  if (ownedPool) await ownedPool.end();
  repository = null;
  ownedPool = null;
  initialized = false;
  activeSuppressions = Object.freeze([]);
}

async function ensureRepository() {
  if (!initialized) await initialize();
  if (!repository || !ready) {
    const error = new Error('data-rights storage is unavailable');
    error.code = 'DATA_RIGHTS_UNAVAILABLE';
    throw error;
  }
  return repository;
}

async function submitRequest(input = {}) {
  const validated = validateRequest(input, buildRecordKey);
  if (!validated.ok) return validated;

  const storage = await ensureRepository();
  const publicTicket = createPublicTicket();
  const encryptedContact = usesPostgres() && validated.request.contact
    ? encryptContact(validated.request.contact)
    : null;
  const saved = await storageCall(() => storage.createRequest({
    publicTicket,
    publicTicketHash: hashPublicTicket(publicTicket),
    ticketHint: ticketHint(publicTicket),
    request: validated.request,
    encryptedContact,
  }));
  return {
    ok: true,
    ticketId: publicTicket,
    status: saved.status,
    version: saved.version,
    receivedAt: saved.receivedAt,
  };
}

async function getStatusByTicket(publicTicket) {
  const value = sanitize(publicTicket, 100);
  const opaque = /^DR_[A-Za-z0-9_-]{40,}$/.test(value);
  const legacy = /^DR-\d{4}-\d{4,}$/.test(value);
  if (!opaque && !legacy) return null;
  const publicTicketHash = legacy ? hashLegacyTicket(value) : hashPublicTicket(value);
  const storage = await ensureRepository();
  const status = await storageCall(() => storage.findPublicStatus({
    publicTicketHash,
  }));
  return status;
}

async function listRequests({ status } = {}) {
  const selectedStatus = STATUSES.includes(status) ? status : undefined;
  const storage = await ensureRepository();
  return storageCall(() => storage.listRequests({ status: selectedStatus }));
}

async function getRequestDetail(id) {
  const storage = await ensureRepository();
  return storageCall(() => storage.getRequestDetail(sanitize(id, 100)));
}

async function updateStatus(id, nextStatus, note = '', options = {}) {
  if (!STATUSES.includes(nextStatus)) return { ok: false, error: '상태 값이 올바르지 않습니다.' };
  const expectedVersion = Number.parseInt(options.expectedVersion, 10);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return { ok: false, error: '현재 버전(expectedVersion)이 필요합니다.' };
  }

  const storage = await ensureRepository();
  const result = await storageCall(() => storage.updateStatus({
    id: sanitize(id, 100),
    nextStatus,
    note: sanitize(note, 500),
    expectedVersion,
    actorUserId: options.actorUserId || null,
  }));
  if (result.kind === 'not_found') return { ok: false, notFound: true, error: '해당 요청을 찾을 수 없습니다.' };
  if (result.kind === 'conflict') {
    return {
      ok: false,
      conflict: true,
      currentVersion: result.currentVersion,
      error: '다른 관리자가 먼저 변경했습니다. 새로고침 후 다시 시도해 주세요.',
    };
  }

  if (Array.isArray(result.suppressions)) {
    activeSuppressions = freezeSuppressions(result.suppressions);
  } else {
    await refreshSuppressions();
  }
  return { ok: true, id: result.id, status: result.status, version: result.version };
}

async function refreshSuppressions() {
  if (!repository) return;
  const rows = await storageCall(() => repository.listActiveSuppressions());
  activeSuppressions = freezeSuppressions(rows);
}

function getActiveSuppressions() {
  return activeSuppressions;
}

function checkSuppression(input = {}) {
  return findSuppressionMode(activeSuppressions, input);
}

async function recordSearchMetric(metric) {
  const storage = await ensureRepository();
  if (typeof storage.recordSearchMetric === 'function') {
    return storageCall(() => storage.recordSearchMetric(metric));
  }
  return null;
}

async function getSearchMetricSummary(limit) {
  const storage = await ensureRepository();
  if (typeof storage.getSearchMetricSummary === 'function') {
    return storageCall(() => storage.getSearchMetricSummary(limit));
  }
  return [];
}

function readiness() {
  return { initialized, ready, mode: usesPostgres() ? 'postgres' : 'memory-development' };
}

async function storageCall(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error?.code === 'CONTACT_ENCRYPTION_UNAVAILABLE') throw error;
    if (usesPostgres()) ready = false;
    const unavailable = new Error('data-rights storage is unavailable');
    unavailable.code = 'DATA_RIGHTS_UNAVAILABLE';
    unavailable.cause = error;
    throw unavailable;
  }
}

module.exports = {
  REQUEST_TYPES,
  STATUSES,
  checkSuppression,
  getActiveSuppressions,
  getRequestDetail,
  getSearchMetricSummary,
  getStatusByTicket,
  initialize,
  listRequests,
  readiness,
  recordSearchMetric,
  refreshSuppressions,
  shutdown,
  submitRequest,
  updateStatus,
};
