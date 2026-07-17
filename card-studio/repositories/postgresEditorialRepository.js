const crypto = require('node:crypto');
const {
  assertEditorialActor,
  assertEditorialTransition,
  assertPackageRole,
} = require('./editorialStateMachine');
const { publishIssuePost } = require('./editorialPostPublisher');
const { assertPersistedIssuePolicy } = require('./editorialPolicyGate');
const { reviseEditorialIssue } = require('./editorialRevisionRepository');
const { parseEditorialIssueInput, requiredText } = require('./editorialIssueInput');

class EditorialNotFoundError extends Error {
  constructor(issueId) {
    super(`Editorial issue not found: ${issueId}`);
    this.name = 'EditorialNotFoundError';
    this.code = 'EDITORIAL_ISSUE_NOT_FOUND';
    this.status = 404;
  }
}

class EditorialVersionConflictError extends Error {
  constructor(expectedVersion, currentVersion) {
    super(`Editorial issue version conflict: expected ${expectedVersion}, current ${currentVersion}`);
    this.name = 'EditorialVersionConflictError';
    this.code = 'EDITORIAL_VERSION_CONFLICT';
    this.status = 409;
    this.expectedVersion = expectedVersion;
    this.currentVersion = currentVersion;
  }
}

function issueView(row) {
  return {
    id: row.id,
    calendarId: row.calendar_id,
    postId: row.post_id == null ? null : Number(row.post_id),
    status: row.status,
    version: row.version,
    title: row.title,
    content: row.content,
    author: row.author,
  };
}

class PostgresEditorialRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async createIssue(input) {
    const actorUserId = assertEditorialActor(input.actorUserId);
    const seasonYear = input.seasonYear;
    const slot = input.slot;
    if (!Number.isInteger(seasonYear) || seasonYear < 2000 || seasonYear > 2200) {
      throw new TypeError('seasonYear must be an integer between 2000 and 2200');
    }
    if (!Number.isInteger(slot) || slot <= 0) throw new TypeError('slot must be a positive integer');
    assertPackageRole(input.packageRole, input.competitionId);
    const issue = parseEditorialIssueInput(input);
    const issueId = crypto.randomUUID();
    const calendarId = crypto.randomUUID();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        INSERT INTO editorial_calendar (
          id, season_year, competition_id, package_role, section_key, slot, state
        ) VALUES ($1, $2, $3, $4, $5, $6, 'drafting')
      `, [
        calendarId,
        seasonYear,
        input.competitionId || null,
        input.packageRole || null,
        issue.sectionKey,
        slot,
      ]);
      const inserted = await client.query(`
        INSERT INTO editorial_issues (
          id, calendar_id, title, content, author, summary, why_now,
          discussion_question, related_url, subject_age_group, created_by,
          last_actor_user_id, last_action_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $12)
        RETURNING *
      `, [
        issueId, calendarId, issue.title, issue.content, issue.author, issue.summary, issue.whyNow,
        issue.discussionQuestion, issue.relatedUrl, issue.subjectAgeGroup, actorUserId, crypto.randomUUID(),
      ]);
      await client.query(`
        INSERT INTO editorial_revisions (
          issue_id, revision_number, title, content, created_by
        ) VALUES ($1, 1, $2, $3, $4)
      `, [issueId, issue.title, issue.content, actorUserId]);
      await client.query('COMMIT');
      return issueView(inserted.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async addSource(input) {
    const actorUserId = assertEditorialActor(input.actorUserId);
    const sourceUrl = requiredText(input.sourceUrl, 'sourceUrl');
    const parsedUrl = new URL(sourceUrl);
    if (parsedUrl.protocol !== 'https:') {
      throw new TypeError('sourceUrl must use HTTPS');
    }
    if (!['official', 'primary', 'secondary', 'internal'].includes(input.sourceKind)) {
      throw new TypeError('sourceKind is not supported');
    }
    const title = requiredText(input.title, 'title');
    const id = crypto.randomUUID();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const issue = await client.query(
        'SELECT version FROM editorial_issues WHERE id = $1 FOR UPDATE',
        [input.issueId],
      );
      if (issue.rowCount === 0) throw new EditorialNotFoundError(input.issueId);
      await client.query(`
        INSERT INTO editorial_sources (
          id, issue_id, source_url, source_kind, title, publisher, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        id,
        input.issueId,
        parsedUrl.toString(),
        input.sourceKind,
        title,
        input.publisher || null,
        actorUserId,
      ]);
      await client.query(`
        INSERT INTO editorial_events (
          issue_id, event_type, issue_version, actor_user_id, payload
        ) VALUES ($1, 'source_added', $2, $3, jsonb_build_object('source_id', $4::text))
      `, [input.issueId, issue.rows[0].version, actorUserId, id]);
      await client.query('COMMIT');
      return { id, issueId: input.issueId, sourceUrl: parsedUrl.toString() };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async transitionIssue(input) {
    const actorUserId = assertEditorialActor(input.actorUserId);
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion <= 0) {
      throw new TypeError('expectedVersion must be a positive integer');
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query(
        'SELECT * FROM editorial_issues WHERE id = $1 FOR UPDATE',
        [input.issueId],
      );
      if (current.rowCount === 0) throw new EditorialNotFoundError(input.issueId);
      const row = current.rows[0];
      if (row.version !== input.expectedVersion) {
        throw new EditorialVersionConflictError(input.expectedVersion, row.version);
      }
      assertEditorialTransition(row.status, input.nextStatus);
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
          SET state = $2, version = version + 1, updated_at = NOW()
          WHERE id = $1
        `, [row.calendar_id, calendarState]);
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

  async close() {}
}

module.exports = {
  EditorialNotFoundError,
  EditorialVersionConflictError,
  PostgresEditorialRepository,
};
