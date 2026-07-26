const crypto = require('node:crypto');

function runView(row) {
  return {
    id: row.id, runDateKst: row.run_date_kst, profileVersion: row.profile_version,
    trigger: row.trigger, status: row.status, startedAt: row.started_at, completedAt: row.completed_at,
    apiCallCount: Number(row.api_call_count), resultCount: Number(row.result_count),
    insertedCount: Number(row.inserted_count), duplicateCount: Number(row.duplicate_count),
    irrelevantCount: Number(row.irrelevant_count), safeErrorCode: row.safe_error_code || null,
  };
}

function discoveryView(row) {
  return {
    id: row.id, originalUrl: row.original_url, naverUrl: row.naver_url, title: row.title,
    publishedAt: row.published_at, firstSeenAt: row.first_seen_at, lastSeenAt: row.last_seen_at,
    queryKeys: row.query_keys, relevanceScore: Number(row.relevance_score), relevanceTags: row.relevance_tags,
    subjectAgeGroup: row.subject_age_group, status: row.status, reviewedAt: row.reviewed_at,
    confirmedSourceUrl: row.confirmed_source_url || null, confirmedSourceTitle: row.confirmed_source_title || null,
    confirmedSourcePublisher: row.confirmed_source_publisher || null, confirmedSourceKind: row.confirmed_source_kind || null,
    linkedCalendarId: row.linked_calendar_id || null,
  };
}

async function appendEvent(client, { runId = null, discoveryId = null, eventType, actorUserId = null, metadata = {} }) {
  await client.query(`INSERT INTO editorial_news_events (run_id, discovery_id, event_type, actor_user_id, metadata)
    VALUES ($1,$2,$3,$4,$5::jsonb)`, [runId, discoveryId, eventType, actorUserId, JSON.stringify(metadata)]);
}

class EditorialNewsDiscoveryRepository {
  constructor(pool) { this.pool = pool; }

  async withRunLock(input, callback) {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT pg_advisory_lock(hashtextextended($1, 0))', [`editorial-news:${input.runDateKst}:${input.profileVersion}`]);
      const existing = await client.query('SELECT * FROM editorial_news_runs WHERE run_date_kst=$1 AND profile_version=$2', [input.runDateKst, input.profileVersion]);
      if (existing.rowCount && existing.rows[0].status === 'completed') return await callback({ client, existing: runView(existing.rows[0]) });
      if (existing.rowCount) {
        const restarted = await client.query(`UPDATE editorial_news_runs SET status='running', started_at=NOW(), completed_at=NULL,
          api_call_count=0, result_count=0, inserted_count=0, duplicate_count=0, irrelevant_count=0, safe_error_code=NULL, actor_user_id=$2
          WHERE id=$1 RETURNING *`, [existing.rows[0].id, input.actorUserId]);
        await appendEvent(client, { runId: restarted.rows[0].id, eventType: 'run_started', actorUserId: input.actorUserId, metadata: { restarted: true } });
        return await callback({ client, ...runView(restarted.rows[0]) });
      }
      const created = await client.query(`INSERT INTO editorial_news_runs (id, run_date_kst, profile_version, trigger, status, actor_user_id)
        VALUES ($1,$2,$3,'manual','running',$4) RETURNING *`, [crypto.randomUUID(), input.runDateKst, input.profileVersion, input.actorUserId]);
      await appendEvent(client, { runId: created.rows[0].id, eventType: 'run_started', actorUserId: input.actorUserId });
      return await callback({ client, ...runView(created.rows[0]) });
    } finally {
      await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [`editorial-news:${input.runDateKst}:${input.profileVersion}`]).catch(() => {});
      client.release();
    }
  }

  async upsertDiscovery(client, input) {
    const result = await client.query(`INSERT INTO editorial_news_discoveries (
      id, canonical_url_hash, original_url, naver_url, title, published_at, first_seen_run_id,
      query_keys, relevance_score, relevance_tags, subject_age_group
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10::jsonb,$11)
    ON CONFLICT (canonical_url_hash) DO UPDATE SET
      last_seen_at=NOW(), query_keys=(SELECT jsonb_agg(DISTINCT value) FROM jsonb_array_elements_text(editorial_news_discoveries.query_keys || EXCLUDED.query_keys) value),
      relevance_score=GREATEST(editorial_news_discoveries.relevance_score, EXCLUDED.relevance_score),
      relevance_tags=EXCLUDED.relevance_tags
    RETURNING (xmax = 0) AS inserted`, [crypto.randomUUID(), input.canonicalUrlHash, input.originalUrl, input.naverUrl, input.title, input.publishedAt, input.runId, JSON.stringify(input.queryKeys), input.relevanceScore, JSON.stringify(input.relevanceTags), 'unknown']);
    return { inserted: result.rows[0].inserted };
  }

  async finishRun(client, input) {
    const result = await client.query(`UPDATE editorial_news_runs SET status=$2, completed_at=NOW(), api_call_count=$3,
      result_count=$4, inserted_count=$5, duplicate_count=$6, irrelevant_count=$7, safe_error_code=$8 WHERE id=$1 RETURNING *`,
    [input.id, input.status, input.apiCallCount, input.resultCount, input.insertedCount, input.duplicateCount, input.irrelevantCount, input.safeErrorCode]);
    await appendEvent(client, { runId: input.id, eventType: 'run_completed', actorUserId: result.rows[0].actor_user_id, metadata: { status: input.status, apiCallCount: input.apiCallCount, resultCount: input.resultCount, insertedCount: input.insertedCount, duplicateCount: input.duplicateCount, irrelevantCount: input.irrelevantCount, safeErrorCode: input.safeErrorCode } });
    return runView(result.rows[0]);
  }

  async listRuns({ limit = 30 } = {}) {
    const result = await this.pool.query(
      'SELECT * FROM editorial_news_runs ORDER BY started_at DESC,id DESC LIMIT $1',
      [Math.min(Math.max(Number(limit) || 30, 1), 100)],
    );
    return result.rows.map(runView);
  }

  async listDiscoveries({ range, status, limit = 30, cursor } = {}) {
    const decoded = cursor ? JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) : null;
    const result = await this.pool.query(`SELECT * FROM editorial_news_discoveries WHERE ($1::text IS NULL OR status=$1)
      AND ($2::text IS NULL OR published_at >= CASE $2::text
          WHEN 'today' THEN date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
          WHEN 'month' THEN date_trunc('month', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul'
        END)
      AND ($3::timestamptz IS NULL OR (published_at,id) < ($3,$4::uuid))
      ORDER BY published_at DESC,id DESC LIMIT $5`,
    [status || null, range || null, decoded?.publishedAt || null, decoded?.id || null, Math.min(Math.max(Number(limit) || 30, 1), 100)]);
    const discoveries = result.rows.map(discoveryView);
    const last = discoveries.at(-1);
    return { discoveries, nextCursor: last ? Buffer.from(JSON.stringify({ publishedAt: last.publishedAt, id: last.id })).toString('base64url') : null };
  }

  async transitionDiscovery(input) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query('SELECT * FROM editorial_news_discoveries WHERE id=$1 FOR UPDATE', [input.id]);
      if (!current.rowCount) { const error = new Error('Discovery not found'); error.status = 404; error.code = 'NEWS_DISCOVERY_NOT_FOUND'; throw error; }
      const from = current.rows[0].status;
      const allowed = (from === 'discovered' && ['reviewing', 'dismissed'].includes(input.status)) || (from === 'reviewing' && input.status === 'dismissed');
      if (!allowed) { const error = new Error('Invalid discovery state transition'); error.status = 409; error.code = 'NEWS_DISCOVERY_TRANSITION_INVALID'; throw error; }
      if (input.status === 'dismissed' && (!input.reviewNote || !input.reviewNote.trim())) throw new TypeError('Dismissal reason is required');
      const updated = await client.query(`UPDATE editorial_news_discoveries SET status=$2, reviewed_by=$3, reviewed_at=NOW(), review_note=$4 WHERE id=$1 RETURNING *`, [input.id, input.status, input.actorUserId, input.status === 'dismissed' ? input.reviewNote.trim() : null]);
      await appendEvent(client, { discoveryId: input.id, eventType: 'status_changed', actorUserId: input.actorUserId, metadata: { from, to: input.status } });
      await client.query('COMMIT');
      return discoveryView(updated.rows[0]);
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  async confirmSource(input) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query('SELECT status FROM editorial_news_discoveries WHERE id=$1 FOR UPDATE', [input.id]);
      if (!current.rowCount) throw newsError('NEWS_DISCOVERY_NOT_FOUND', 'Discovery not found', 404);
      if (current.rows[0].status !== 'reviewing') throw newsError('NEWS_DISCOVERY_TRANSITION_INVALID', 'Discovery must be under review');
      const updated = await client.query(`UPDATE editorial_news_discoveries SET status='source_confirmed', confirmed_source_url=$2,
        confirmed_source_title=$3, confirmed_source_publisher=$4, confirmed_source_kind=$5 WHERE id=$1 RETURNING *`,
      [input.id, input.sourceUrl, input.title, input.publisher, input.sourceKind]);
      await appendEvent(client, { discoveryId: input.id, eventType: 'status_changed', actorUserId: input.actorUserId, metadata: { from: 'reviewing', to: 'source_confirmed', sourceKind: input.sourceKind } });
      await client.query('COMMIT');
      return discoveryView(updated.rows[0]);
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  async linkCalendar(input) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query('SELECT status, linked_calendar_id FROM editorial_news_discoveries WHERE id=$1 FOR UPDATE', [input.id]);
      if (!current.rowCount) throw newsError('NEWS_DISCOVERY_NOT_FOUND', 'Discovery not found', 404);
      if (current.rows[0].status !== 'source_confirmed') throw newsError('NEWS_DISCOVERY_TRANSITION_INVALID', 'Confirmed source is required before calendar linking');
      const calendar = await client.query('SELECT state, version FROM editorial_calendar WHERE id=$1 FOR UPDATE', [input.calendarId]);
      if (!calendar.rowCount) throw newsError('EDITORIAL_CALENDAR_NOT_FOUND', 'Calendar entry not found', 404);
      if (calendar.rows[0].state !== 'planned' || Number(calendar.rows[0].version) !== input.expectedCalendarVersion) throw newsError('EDITORIAL_CALENDAR_CLAIMED', 'Calendar entry is not available');
      const updated = await client.query(`UPDATE editorial_news_discoveries SET status='calendar_linked', linked_calendar_id=$2 WHERE id=$1 RETURNING *`, [input.id, input.calendarId]);
      await appendEvent(client, { discoveryId: input.id, eventType: 'status_changed', actorUserId: input.actorUserId, metadata: { from: 'source_confirmed', to: 'calendar_linked' } });
      await client.query('COMMIT');
      return discoveryView(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error?.code === '23505') throw newsError('NEWS_DISCOVERY_CALENDAR_LINKED', 'Calendar entry is already linked');
      throw error;
    } finally { client.release(); }
  }

  async purgeExpired() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(`DELETE FROM editorial_news_discoveries WHERE status IN ('dismissed','expired') AND last_seen_at < NOW() - INTERVAL '90 days' RETURNING id`);
      if (result.rowCount > 0) await appendEvent(client, { eventType: 'purged', metadata: { count: result.rowCount } });
      await client.query('COMMIT');
      return result.rowCount;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  async purgeRuns() {
    const result = await this.pool.query(`DELETE FROM editorial_news_runs
      WHERE status IN ('completed', 'failed') AND completed_at < NOW() - INTERVAL '13 months'`);
    return result.rowCount;
  }
}

function newsError(code, message, status = 409) {
  const error = new Error(message); error.code = code; error.status = status; return error;
}

module.exports = { EditorialNewsDiscoveryRepository, discoveryView, runView };
