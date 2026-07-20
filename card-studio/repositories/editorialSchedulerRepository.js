const { assertEditorialActor } = require('./editorialStateMachine');
const {
  EditorialScheduledPublishError,
  publishScheduledIssue,
} = require('./editorialScheduledPublisher');

const CLAIM_DUE_JOB_SQL = `
  SELECT
    j.id AS job_id,
    j.status AS job_status,
    j.attempt_count,
    j.next_attempt_at,
    i.*,
    i.id AS issue_id,
    i.status AS issue_status,
    i.version AS issue_version,
    c.state AS calendar_state,
    c.version AS calendar_version
  FROM editorial_publish_jobs j
  JOIN editorial_issues i ON i.id = j.issue_id
  JOIN editorial_calendar c ON c.id = i.calendar_id
  WHERE j.status IN ('queued', 'retrying')
    AND j.attempt_count < 3
    AND j.next_attempt_at <= $1::timestamptz
  ORDER BY j.next_attempt_at, j.created_at
  FOR UPDATE OF j, i, c SKIP LOCKED
  LIMIT 1
`;

const SAFE_ERROR_CODES = new Set([
  'EDITORIAL_CALENDAR_NOT_SCHEDULED',
  'EDITORIAL_ISSUE_NOT_SCHEDULED',
  'EDITORIAL_POLICY_CHECK_REQUIRED',
  'EDITORIAL_POST_NOT_FOUND',
  'EDITORIAL_SCHEDULE_NOT_DUE',
]);
const RETRY_DELAYS_MS = Object.freeze([60_000, 300_000]);

class EditorialSchedulerActorError extends Error {
  constructor(code) {
    super('Editorial scheduler actor is unavailable');
    this.name = 'EditorialSchedulerActorError';
    this.code = code;
  }
}

function retryOutcome({ attemptCount, now, retryable }) {
  const nextCount = attemptCount + 1;
  if (!retryable || nextCount >= 3) {
    return { status: 'failed', attemptCount: nextCount, nextAttemptAt: null };
  }
  return {
    status: 'retrying',
    attemptCount: nextCount,
    nextAttemptAt: new Date(now.getTime() + RETRY_DELAYS_MS[nextCount - 1]).toISOString(),
  };
}

function safePublishErrorCode(error) {
  if ((error instanceof EditorialScheduledPublishError || error?.name === 'EditorialPostNotFoundError')
    && SAFE_ERROR_CODES.has(error.code)) {
    return error.code;
  }
  return 'EDITORIAL_PUBLISH_TRANSACTION_FAILED';
}

class EditorialSchedulerRepository {
  constructor(pool, options = {}) {
    if (!pool || typeof pool.connect !== 'function') {
      throw new TypeError('A PostgreSQL pool is required');
    }
    this.pool = pool;
    this.publisher = options.publishScheduledIssue || publishScheduledIssue;
    this.afterPostPublished = options.afterPostPublished;
  }

  async validateActorAdmin(actorUserId) {
    const actor = assertEditorialActor(actorUserId);
    const result = await this.pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [actor],
    );
    return result.rowCount === 1 && result.rows[0].is_admin === true;
  }

  async processNext({ actorUserId, now }) {
    const client = await this.pool.connect();
    let transactionOpen = false;
    try {
      await client.query('BEGIN');
      transactionOpen = true;
      const claimed = await client.query(CLAIM_DUE_JOB_SQL, [now.toISOString()]);
      if (claimed.rowCount === 0) {
        await client.query('COMMIT');
        transactionOpen = false;
        return { status: 'idle' };
      }

      const job = claimed.rows[0];
      await client.query('SAVEPOINT editorial_publish_attempt');
      let publishError = null;
      try {
        await this.publisher(client, job, {
          actorUserId,
          now,
          afterPostPublished: this.afterPostPublished,
        });
      } catch (error) {
        publishError = error;
      }

      if (publishError) {
        await client.query('ROLLBACK TO SAVEPOINT editorial_publish_attempt');
        const errorCode = safePublishErrorCode(publishError);
        const outcome = retryOutcome({
          attemptCount: Number(job.attempt_count),
          now,
          retryable: publishError.retryable !== false,
        });
        await client.query(`
          UPDATE editorial_publish_jobs
          SET status = $2, attempt_count = $3, next_attempt_at = $4,
              last_error_code = $5, updated_at = $6::timestamptz
          WHERE id = $1
        `, [
          job.job_id,
          outcome.status,
          outcome.attemptCount,
          outcome.nextAttemptAt,
          errorCode,
          now.toISOString(),
        ]);
        await client.query('COMMIT');
        transactionOpen = false;
        return { ...outcome, errorCode };
      }

      const attemptCount = Number(job.attempt_count) + 1;
      await client.query(`
        UPDATE editorial_publish_jobs
        SET status = 'completed', attempt_count = $2, next_attempt_at = NULL,
            last_error_code = NULL, updated_at = $3::timestamptz
        WHERE id = $1
      `, [job.job_id, attemptCount, now.toISOString()]);
      await client.query('COMMIT');
      transactionOpen = false;
      return { status: 'completed', attemptCount };
    } catch (error) {
      if (transactionOpen) await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async processDueJobs({ actorUserId, now, maxJobs = 100, shouldContinue = () => true }) {
    if (!await this.validateActorAdmin(actorUserId)) {
      throw new EditorialSchedulerActorError('EDITORIAL_SCHEDULER_ACTOR_NOT_ADMIN');
    }
    const summary = { processed: 0, completed: 0, retrying: 0, failed: 0 };
    while (summary.processed < maxJobs && shouldContinue()) {
      const result = await this.processNext({ actorUserId, now: now() });
      if (result.status === 'idle') break;
      summary.processed += 1;
      summary[result.status] += 1;
    }
    return summary;
  }
}

module.exports = {
  CLAIM_DUE_JOB_SQL,
  EditorialSchedulerActorError,
  EditorialSchedulerRepository,
  retryOutcome,
  safePublishErrorCode,
};
