const crypto = require('node:crypto');
const { assertEditorialActor } = require('./editorialStateMachine');
const { assertExpectedVersion } = require('./editorialRepositoryErrors');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

async function enqueueEditorialPublishJob(client, input) {
  if (!client || typeof client.query !== 'function') {
    throw new TypeError('A transaction-bound PostgreSQL client is required');
  }
  if (typeof input?.issueId !== 'string' || !UUID_PATTERN.test(input.issueId)) {
    throw new TypeError('issueId must be a UUID');
  }
  if (Number.isNaN(Date.parse(input.scheduledFor || ''))) {
    throw new TypeError('scheduledFor must be an ISO timestamp');
  }
  const result = await client.query(`
    INSERT INTO editorial_publish_jobs (
      id, issue_id, status, attempt_count, next_attempt_at, last_error_code
    ) VALUES ($1, $2, 'queued', 0, $3::timestamptz, NULL)
    ON CONFLICT (issue_id) DO UPDATE
    SET status = 'queued',
        attempt_count = 0,
        next_attempt_at = EXCLUDED.next_attempt_at,
        last_error_code = NULL,
        updated_at = NOW()
    RETURNING *
  `, [crypto.randomUUID(), input.issueId, input.scheduledFor]);
  return result.rows[0];
}

function publishJobWarningView(row) {
  return {
    issueId: row.issue_id,
    title: row.title,
    status: row.status,
    attemptCount: Number(row.attempt_count),
    nextAttemptAt: row.next_attempt_at,
    errorCode: row.last_error_code,
    scheduledFor: row.scheduled_for,
    updatedAt: row.updated_at,
  };
}

async function listEditorialPublishJobWarnings(pool, query = {}) {
  const requested = Number(query.limit);
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, 100) : 50;
  const result = await pool.query(`
    SELECT j.issue_id, i.title, j.status, j.attempt_count, j.next_attempt_at,
           j.last_error_code, i.scheduled_for, j.updated_at
    FROM editorial_publish_jobs j
    JOIN editorial_issues i ON i.id = j.issue_id
    WHERE j.status IN ('retrying', 'failed')
    ORDER BY (j.status = 'failed') DESC, j.updated_at DESC, j.id
    LIMIT $1
  `, [limit]);
  return result.rows.map(publishJobWarningView);
}

class EditorialPublishJobError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.name = 'EditorialPublishJobError';
    this.code = code;
    this.status = status;
  }
}

async function retryEditorialPublishJob(pool, input) {
  const actorUserId = assertEditorialActor(input.actorUserId);
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;
    const actor = await client.query('SELECT is_admin FROM users WHERE id=$1', [actorUserId]);
    if (actor.rowCount !== 1 || actor.rows[0].is_admin !== true) {
      throw new EditorialPublishJobError(
        'EDITORIAL_PUBLISH_JOB_ADMIN_REQUIRED',
        'An administrator is required to retry publication',
        403,
      );
    }
    const result = await client.query(`
      SELECT j.*, i.status AS issue_status, i.version AS issue_version,
             i.calendar_id, c.state AS calendar_state, c.version AS calendar_version
      FROM editorial_publish_jobs j
      JOIN editorial_issues i ON i.id = j.issue_id
      JOIN editorial_calendar c ON c.id = i.calendar_id
      WHERE j.issue_id=$1
      FOR UPDATE OF j, i, c
    `, [input.issueId]);
    if (result.rowCount === 0) {
      throw new EditorialPublishJobError(
        'EDITORIAL_PUBLISH_JOB_NOT_FOUND',
        'Publish job not found',
        404,
      );
    }
    const row = result.rows[0];
    assertExpectedVersion(input.expectedVersion, Number(row.issue_version));
    if (row.status !== 'failed') {
      throw new EditorialPublishJobError(
        'EDITORIAL_PUBLISH_JOB_NOT_FAILED',
        'Only a failed publish job can be retried',
      );
    }
    if (row.issue_status !== 'scheduled' || row.calendar_state !== 'scheduled') {
      throw new EditorialPublishJobError(
        'EDITORIAL_PUBLISH_JOB_STATE_INVALID',
        'The issue is no longer scheduled',
      );
    }
    const actionId = crypto.randomUUID();
    const issueVersion = Number(row.issue_version) + 1;
    const calendarVersion = Number(row.calendar_version) + 1;
    await client.query(`
      UPDATE editorial_issues
      SET scheduled_for=$2::timestamptz, version=$3, last_actor_user_id=$4,
          last_action_id=$5, updated_at=NOW()
      WHERE id=$1
    `, [input.issueId, input.scheduledFor, issueVersion, actorUserId, actionId]);
    await client.query(`
      UPDATE editorial_calendar
      SET scheduled_for=$2::timestamptz, version=$3, updated_at=NOW()
      WHERE id=$1
    `, [row.calendar_id, input.scheduledFor, calendarVersion]);
    await enqueueEditorialPublishJob(client, input);
    await client.query(`
      INSERT INTO editorial_events (
        issue_id, event_type, from_status, to_status, issue_version, actor_user_id, note
      ) VALUES ($1, 'rescheduled', 'scheduled', 'scheduled', $2, $3, $4)
    `, [input.issueId, issueVersion, actorUserId, input.note]);
    await client.query(`
      INSERT INTO editorial_calendar_events (
        calendar_id, event_type, calendar_version, actor_user_id, note, payload
      ) VALUES ($1, 'updated', $2, $3, $4, $5::jsonb)
    `, [
      row.calendar_id,
      calendarVersion,
      actorUserId,
      input.note,
      JSON.stringify({ action: 'retry_publish', issueId: input.issueId }),
    ]);
    await client.query('COMMIT');
    transactionOpen = false;
    return {
      issueId: input.issueId,
      status: 'queued',
      attemptCount: 0,
      nextAttemptAt: input.scheduledFor,
      errorCode: null,
      issueVersion,
    };
  } catch (error) {
    if (transactionOpen) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  EditorialPublishJobError,
  enqueueEditorialPublishJob,
  listEditorialPublishJobWarnings,
  retryEditorialPublishJob,
};
