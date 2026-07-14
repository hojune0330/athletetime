const crypto = require('crypto');
const { decryptContact } = require('../services/dataRightsCrypto');

function requestSummary(row) {
  return {
    id: row.id,
    ticketHint: row.ticket_hint,
    type: row.request_type,
    athleteName: row.athlete_name,
    affiliation: row.affiliation,
    competition: row.competition,
    event: row.event,
    status: row.status,
    version: row.version,
    receivedAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function suppressionView(row) {
  return {
    id: row.id,
    requestId: row.request_id,
    recordKey: row.record_key || '',
    sourceId: row.source_id || '',
    athleteName: row.legacy_athlete_name || '',
    affiliation: row.legacy_affiliation || '',
    competition: row.legacy_competition || '',
    event: row.legacy_event || '',
    mode: row.mode,
    since: row.started_at,
  };
}

class PostgresDataRightsRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async createRequest({ publicTicketHash, ticketHint, request, encryptedContact }) {
    const client = await this.pool.connect();
    const id = crypto.randomUUID();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(`
        INSERT INTO data_requests (
          id, public_ticket_hash, ticket_hint, request_type, status, version,
          athlete_name, affiliation, competition, event, record_key, source_id, reason,
          contact_ciphertext, contact_iv, contact_tag, contact_key_version, contact_purge_at
        ) VALUES ($1, $2, $3, $4, 'received', 1, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          CASE WHEN $12::bytea IS NULL THEN NULL ELSE NOW() + INTERVAL '90 days' END)
        RETURNING *
      `, [
        id, publicTicketHash, ticketHint, request.type, request.athleteName,
        request.affiliation, request.competition, request.event, request.recordKey || null,
        request.sourceId || null, request.reason,
        encryptedContact?.ciphertext || null, encryptedContact?.iv || null,
        encryptedContact?.tag || null, encryptedContact?.keyVersion || null,
      ]);
      await client.query(`
        INSERT INTO data_request_events
          (request_id, from_status, to_status, note, request_version)
        VALUES ($1, NULL, 'received', '요청 접수', 1)
      `, [id]);
      await client.query('COMMIT');
      return requestSummary(inserted.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findPublicStatus({ publicTicketHash }) {
    const result = await this.pool.query(`
      SELECT request_type, status, version, created_at, updated_at
      FROM data_requests WHERE public_ticket_hash = $1
    `, [publicTicketHash]);
    if (result.rowCount === 0) return null;
    const row = result.rows[0];
    return {
      type: row.request_type,
      status: row.status,
      version: row.version,
      receivedAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listRequests({ status } = {}) {
    const params = [];
    const where = status ? 'WHERE status = $1' : '';
    if (status) params.push(status);
    const result = await this.pool.query(`
      SELECT id, ticket_hint, request_type, athlete_name, affiliation, competition,
             event, status, version, created_at, updated_at
      FROM data_requests ${where}
      ORDER BY created_at DESC
      LIMIT 500
    `, params);
    return result.rows.map(requestSummary);
  }

  async getRequestDetail(id) {
    const request = await this.pool.query('SELECT * FROM data_requests WHERE id = $1', [id]);
    if (request.rowCount === 0) return null;
    const events = await this.pool.query(`
      SELECT from_status, to_status, note, request_version, created_at
      FROM data_request_events WHERE request_id = $1 ORDER BY id
    `, [id]);
    const row = request.rows[0];
    return {
      ...requestSummary(row),
      reason: row.reason,
      contact: decryptContact({
        ciphertext: row.contact_ciphertext,
        iv: row.contact_iv,
        tag: row.contact_tag,
      }),
      history: events.rows.map((event) => ({
        fromStatus: event.from_status,
        status: event.to_status,
        note: event.note,
        version: event.request_version,
        at: event.created_at,
      })),
    };
  }

  async purgeExpiredContacts() {
    const result = await this.pool.query(`
      UPDATE data_requests
      SET contact_ciphertext = NULL, contact_iv = NULL, contact_tag = NULL,
          contact_key_version = NULL
      WHERE contact_purge_at IS NOT NULL
        AND contact_purge_at <= NOW()
        AND contact_ciphertext IS NOT NULL
    `);
    return result.rowCount;
  }

  async updateStatus({ id, nextStatus, note, expectedVersion, actorUserId }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query(
        'SELECT * FROM data_requests WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (current.rowCount === 0) {
        await client.query('ROLLBACK');
        return { kind: 'not_found' };
      }
      const row = current.rows[0];
      if (row.version !== expectedVersion) {
        await client.query('ROLLBACK');
        return { kind: 'conflict', currentVersion: row.version };
      }

      const version = row.version + 1;
      await client.query(`
        UPDATE data_requests
        SET status = $2::varchar(20), version = $3, updated_at = NOW(),
            closed_at = CASE WHEN $2::varchar(20) IN ('corrected', 'restored', 'removed') THEN NOW() ELSE NULL END,
            contact_purge_at = CASE
              WHEN $2::varchar(20) IN ('corrected', 'restored', 'removed') AND contact_ciphertext IS NOT NULL
                THEN LEAST(COALESCE(contact_purge_at, NOW() + INTERVAL '30 days'), NOW() + INTERVAL '30 days')
              ELSE contact_purge_at
            END
        WHERE id = $1
      `, [id, nextStatus, version]);
      await client.query(`
        INSERT INTO data_request_events
          (request_id, actor_user_id, from_status, to_status, note, request_version)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [id, actorUserId || null, row.status, nextStatus, note, version]);
      await client.query(`
        UPDATE record_suppressions
        SET active = FALSE, ended_at = NOW(), version = version + 1
        WHERE request_id = $1 AND active = TRUE
      `, [id]);

      const mode = { under_review: 'mask', search_hidden: 'hide', removed: 'remove' }[nextStatus];
      if (mode) {
        const scopeKind = row.record_key ? 'record_key' : row.source_id ? 'source_id' : 'subject_tuple';
        await client.query(`
          INSERT INTO record_suppressions (
            id, request_id, mode, active, version, scope_kind, record_key, source_id,
            legacy_athlete_name, legacy_affiliation, legacy_competition, legacy_event
          ) VALUES ($1, $2, $3, TRUE, 1, $4, $5, $6, $7, $8, $9, $10)
        `, [
          crypto.randomUUID(), id, mode, scopeKind, row.record_key, row.source_id,
          scopeKind === 'subject_tuple' ? row.athlete_name : null,
          scopeKind === 'subject_tuple' ? row.affiliation : null,
          scopeKind === 'subject_tuple' ? row.competition : null,
          scopeKind === 'subject_tuple' ? row.event : null,
        ]);
      }

      const suppressions = await client.query(`
        SELECT * FROM record_suppressions WHERE active = TRUE ORDER BY started_at, id
      `);
      await client.query('COMMIT');
      return {
        kind: 'updated',
        id,
        status: nextStatus,
        version,
        suppressions: suppressions.rows.map(suppressionView),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listActiveSuppressions() {
    const result = await this.pool.query(`
      SELECT * FROM record_suppressions WHERE active = TRUE ORDER BY started_at, id
    `);
    return result.rows.map(suppressionView);
  }

  async recordSearchMetric({ metricDate, surface, queryScript, queryLengthBucket }) {
    await this.pool.query(`
      INSERT INTO search_metric_daily
        (metric_date, surface, query_script, query_length_bucket, count)
      VALUES ($1, $2, $3, $4, 1)
      ON CONFLICT (metric_date, surface, query_script, query_length_bucket)
      DO UPDATE SET count = search_metric_daily.count + 1
    `, [metricDate, surface, queryScript, queryLengthBucket]);
  }

  async getSearchMetricSummary(limit = 20) {
    const result = await this.pool.query(`
      SELECT metric_date, surface, query_script, query_length_bucket, count,
             SUM(count) OVER () AS total_count
      FROM search_metric_daily
      ORDER BY metric_date DESC, count DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  }

  async close() {}
}

module.exports = { PostgresDataRightsRepository };
