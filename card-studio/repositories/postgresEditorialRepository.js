const crypto = require('node:crypto');
const {
  assertEditorialActor,
  assertEditorialTransition,
} = require('./editorialStateMachine');
const { publishIssuePost } = require('./editorialPostPublisher');
const { assertPersistedIssuePolicy } = require('./editorialPolicyGate');
const { reviseEditorialIssue } = require('./editorialRevisionRepository');
const { createIssue } = require('./editorialIssueCreationRepository');
const { correctIssue } = require('./editorialCorrectionWorkflow');
const { finishIssue } = require('./editorialFinishRepository');
const {
  cancelCalendar, createCalendar, skipCalendar, updateCalendar,
} = require('./editorialCalendarRepository');
const {
  EditorialNotFoundError,
  EditorialVersionConflictError,
  assertExpectedVersion,
} = require('./editorialRepositoryErrors');
const {
  getIssue,
  getMagazineIssue,
  listCalendar,
  listIssues,
  listMagazine,
  listSources,
} = require('./editorialRepositoryReads');
const { issueView } = require('./editorialRepositoryViews');
const {
  addSource,
  deleteSource,
  updateSource,
} = require('./editorialSourceRepository');

class PostgresEditorialRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async createIssue(input) {
    return createIssue(this.pool, input);
  }

  async createCalendar(input) { return createCalendar(this.pool, input); }

  async updateCalendar(input) { return updateCalendar(this.pool, input); }

  async cancelCalendar(input) { return cancelCalendar(this.pool, input); }

  async skipCalendar(input) { return skipCalendar(this.pool, input); }

  async addSource(input) {
    return addSource(this.pool, input);
  }

  async transitionIssue(input) {
    const actorUserId = assertEditorialActor(input.actorUserId);
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion <= 0) {
      throw new TypeError('expectedVersion must be a positive integer');
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query(`
        SELECT i.*, c.state AS calendar_state, c.section_key
        FROM editorial_issues i JOIN editorial_calendar c ON c.id=i.calendar_id
        WHERE i.id=$1 FOR UPDATE OF i, c
      `, [input.issueId]);
      if (current.rowCount === 0) throw new EditorialNotFoundError(input.issueId);
      const row = current.rows[0];
      assertExpectedVersion(input.expectedVersion, row.version);
      if (['skipped', 'cancelled'].includes(row.calendar_state)) {
        const error = new Error('Editorial calendar entry is already closed');
        error.code = 'EDITORIAL_CALENDAR_CLOSED';
        error.status = 409;
        throw error;
      }
      assertEditorialTransition(row.status, input.nextStatus);
      if (input.nextStatus === 'scheduled' && Number.isNaN(Date.parse(input.scheduledFor || ''))) {
        throw new TypeError('scheduledFor must be an ISO timestamp');
      }
      let policy = null;
      if (input.nextStatus === 'review_ready') {
        const sources = await client.query(
          'SELECT * FROM editorial_sources WHERE issue_id = $1 ORDER BY id',
          [input.issueId],
        );
        policy = assertPersistedIssuePolicy(row, sources.rows);
      }
      if (['approved', 'scheduled', 'published'].includes(input.nextStatus)
        && row.policy_checked_at == null) {
        const error = new Error('Editorial policy check is required before approval or publication');
        error.code = 'EDITORIAL_POLICY_CHECK_REQUIRED';
        error.status = 409;
        throw error;
      }
      const version = row.version + 1;
      let postId = row.post_id;
      if (input.nextStatus === 'published') {
        postId = await publishIssuePost(client, row);
      }
      if (input.nextStatus === 'unpublished') {
        await client.query('UPDATE posts SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1', [postId]);
      }
      const updated = await client.query(`
        UPDATE editorial_issues
        SET status = $2::varchar(20),
            version = $3,
            post_id = $4,
            approved_by = CASE WHEN $2::varchar(20) = 'approved' THEN $5 ELSE approved_by END,
            approved_at = CASE WHEN $2::varchar(20) = 'approved' THEN NOW() ELSE approved_at END,
            scheduled_for = CASE WHEN $2::varchar(20) = 'scheduled' THEN $6 ELSE scheduled_for END,
            published_at = CASE WHEN $2::varchar(20) = 'published' THEN COALESCE(published_at, NOW()) ELSE published_at END,
            last_actor_user_id = $5,
            last_action_id = $8,
            policy_checked_at = CASE
              WHEN $2::varchar(20) = 'review_ready' THEN NOW()
              WHEN $2::varchar(20) = 'corrected' THEN NULL
              ELSE policy_checked_at
            END,
            policy_fingerprint = CASE
              WHEN $2::varchar(20) = 'review_ready' THEN $7
              WHEN $2::varchar(20) = 'corrected' THEN NULL
              ELSE policy_fingerprint
            END,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [
        input.issueId,
        input.nextStatus,
        version,
        postId,
        actorUserId,
        input.scheduledFor || null,
        policy?.fingerprint || null,
        crypto.randomUUID(),
      ]);
      const calendarState = {
        review_ready: 'ready',
        scheduled: 'scheduled',
        published: 'published',
      }[input.nextStatus];
      if (calendarState) {
        await client.query(`
          UPDATE editorial_calendar
          SET state = $2::varchar(20),
              scheduled_for = CASE
                WHEN $2::varchar(20) = 'scheduled' THEN $3::timestamptz
                ELSE scheduled_for
              END,
              version = version + 1,
              updated_at = NOW()
          WHERE id = $1
        `, [row.calendar_id, calendarState, input.scheduledFor || null]);
      }
      await client.query('COMMIT');
      return issueView(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async reviseIssue(input) {
    return issueView(await reviseEditorialIssue(this.pool, input));
  }

  async updateSource(input) { return updateSource(this.pool, input); }

  async deleteSource(input) { return deleteSource(this.pool, input); }

  async listSources(issueId) { return listSources(this.pool, issueId); }

  async listCalendar(query) { return listCalendar(this.pool, query); }

  async listIssues(query) { return listIssues(this.pool, query); }

  async getIssue(issueId) { return getIssue(this.pool, issueId); }

  async listMagazine(query) { return listMagazine(this.pool, query); }

  async getMagazineIssue(slug) { return getMagazineIssue(this.pool, slug); }

  async finishIssue(input) { return finishIssue(this.pool, input); }

  async correctIssue(input) { return correctIssue(this.pool, input); }

  async close() {}
}

module.exports = {
  EditorialNotFoundError,
  EditorialVersionConflictError,
  PostgresEditorialRepository,
};
