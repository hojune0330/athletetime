const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../card-studio/config');
const { postgresSslConfig } = require('../backend/database/postgres-ssl');
const { encryptContact, hashLegacyTicket } = require('../card-studio/services/dataRightsCrypto');
const { runMigrations } = require('../backend/database/run-migrations');

const REQUESTS_FILE = path.join(config.dirs.data, 'requests', 'requests.json');
const SUPPRESSIONS_FILE = path.join(config.dirs.data, 'requests', 'suppressions.json');
const VALID_STATUSES = new Set(['received', 'under_review', 'search_hidden', 'corrected', 'restored', 'removed']);

function readArray(file) {
  if (!fs.existsSync(file)) return [];
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error('Data-rights migration input must be an array');
  return parsed;
}

function sourceChecksum(requests, suppressions) {
  return crypto.createHash('sha256')
    .update(JSON.stringify({ requests, suppressions }), 'utf8')
    .digest('hex');
}

function buildImportPlan(requests, suppressions) {
  const requestKeys = new Set();
  const suppressionByRequest = new Map();
  for (const suppression of suppressions) {
    const key = suppression?.ticketId || suppression?.requestId;
    if (!key || !['mask', 'hide', 'remove'].includes(suppression.mode)) {
      throw new Error('Invalid legacy data-rights suppression');
    }
    if (suppressionByRequest.has(key)) throw new Error('Duplicate legacy suppression');
    suppressionByRequest.set(key, suppression);
  }

  const rows = requests.map((request) => {
    if (!request?.ticketId || !request?.athleteName || !VALID_STATUSES.has(request.status || 'received')) {
      throw new Error('Invalid legacy data-rights request');
    }
    if (requestKeys.has(request.ticketId)) throw new Error('Duplicate legacy data-rights ticket');
    requestKeys.add(request.ticketId);
    const { ticketId, ...requestData } = request;
    const legacySuppression = suppressionByRequest.get(ticketId)
      || (request.id ? suppressionByRequest.get(request.id) : null);
    if (legacySuppression) {
      suppressionByRequest.delete(legacySuppression.ticketId || legacySuppression.requestId);
    }
    return {
      id: crypto.randomUUID(),
      publicTicketHash: hashLegacyTicket(ticketId),
      ticketHint: String(ticketId).slice(-8),
      request: requestData,
      suppression: legacySuppression
        ? { mode: legacySuppression.mode, since: legacySuppression.since || '' }
        : null,
    };
  });
  if (suppressionByRequest.size > 0) throw new Error('Unmatched legacy suppression');
  return {
    rows,
    requestCount: rows.length,
    suppressionCount: suppressions.length,
  };
}

async function importPlan(pool, plan, checksum) {
  const client = await pool.connect();
  const runId = crypto.randomUUID();
  try {
    await client.query('BEGIN');
    const run = await client.query(`
      INSERT INTO data_rights_import_runs
        (id, source_kind, source_checksum, source_count, imported_count)
      VALUES ($1, 'legacy_json', $2, $3, 0)
      ON CONFLICT (source_kind, source_checksum) DO NOTHING
      RETURNING id
    `, [runId, checksum, plan.requestCount]);
    if (run.rowCount === 0) {
      await client.query('ROLLBACK');
      return { imported: 0, duplicateRun: true };
    }

    let imported = 0;
    for (const row of plan.rows) {
      const request = row.request;
      const encrypted = request.contact ? encryptContact(request.contact) : null;
      const createdAt = request.receivedAt || new Date().toISOString();
      const updatedAt = request.updatedAt || createdAt;
      const version = Math.max(1, Array.isArray(request.history) ? request.history.length : 1);
      await client.query(`
        INSERT INTO data_requests (
          id, public_ticket_hash, ticket_hint, request_type, status, version,
          athlete_name, affiliation, competition, event, reason,
          contact_ciphertext, contact_iv, contact_tag, contact_key_version,
          created_at, updated_at, contact_purge_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
          CASE WHEN $12::bytea IS NULL THEN NULL ELSE $16::timestamptz + INTERVAL '90 days' END)
      `, [
        row.id, row.publicTicketHash, row.ticketHint, request.type, request.status || 'received', version,
        request.athleteName, request.affiliation || '', request.competition || '', request.event || '',
        request.reason || '기존 요청 이관', encrypted?.ciphertext || null, encrypted?.iv || null,
        encrypted?.tag || null, encrypted?.keyVersion || null, createdAt, updatedAt,
      ]);
      const requestId = row.id;

      const history = Array.isArray(request.history) && request.history.length > 0
        ? request.history
        : [{ status: request.status || 'received', at: createdAt, note: '기존 요청 이관' }];
      for (let index = 0; index < history.length; index += 1) {
        const event = history[index];
        await client.query(`
          INSERT INTO data_request_events
            (request_id, from_status, to_status, note, request_version, created_at)
          VALUES ($1,$2,$3,$4,$5,$6)
        `, [
          requestId, index > 0 ? history[index - 1].status : null, event.status,
          String(event.note || '').slice(0, 500), index + 1, event.at || createdAt,
        ]);
      }

      if (row.suppression && ['mask', 'hide', 'remove'].includes(row.suppression.mode)) {
        await client.query(`
          INSERT INTO record_suppressions (
            id, request_id, mode, scope_kind, legacy_athlete_name,
            legacy_affiliation, legacy_competition, legacy_event, started_at
          ) VALUES ($1,$2,$3,'legacy_tuple',$4,$5,$6,$7,$8)
        `, [
          crypto.randomUUID(), requestId, row.suppression.mode, request.athleteName,
          request.affiliation || '', request.competition || '', request.event || '',
          row.suppression.since || updatedAt,
        ]);
      }
      imported += 1;
    }

    await client.query(`
      UPDATE data_rights_import_runs
      SET completed_at = NOW(), imported_count = $2 WHERE id = $1
    `, [runId, imported]);
    await client.query('COMMIT');
    return { imported, duplicateRun: false };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const requests = readArray(REQUESTS_FILE);
  const suppressions = readArray(SUPPRESSIONS_FILE);
  const checksum = sourceChecksum(requests, suppressions);
  const plan = buildImportPlan(requests, suppressions);
  const write = process.argv.includes('--write');
  if (!write) {
    process.stdout.write(`${JSON.stringify({ mode: 'dry-run', checksum, ...plan, rows: undefined })}\n`);
    return;
  }

  const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('TEST_DATABASE_URL or DATABASE_URL is required for --write');
  const pool = new Pool({ connectionString, ssl: postgresSslConfig() });
  try {
    await runMigrations({ pool });
    const result = await importPlan(pool, plan, checksum);
    process.stdout.write(`${JSON.stringify({ mode: 'write', checksum, ...result })}\n`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`Data-rights migration failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { buildImportPlan, importPlan, sourceChecksum };
