const crypto = require('node:crypto');
const { assertEditorialActor } = require('./editorialStateMachine');

class EditorialRevisionError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.name = 'EditorialRevisionError';
    this.code = code;
    this.status = status;
  }
}

function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

async function reviseEditorialIssue(pool, input) {
  const actorUserId = assertEditorialActor(input.actorUserId);
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion <= 0) {
    throw new TypeError('expectedVersion must be a positive integer');
  }
  const values = {
    title: requiredText(input.title, 'title'),
    content: requiredText(input.content, 'content'),
    summary: requiredText(input.summary, 'summary'),
    whyNow: requiredText(input.whyNow, 'whyNow'),
    discussionQuestion: requiredText(input.discussionQuestion, 'discussionQuestion'),
    relatedUrl: requiredText(input.relatedUrl, 'relatedUrl'),
    subjectAgeGroup: requiredText(input.subjectAgeGroup, 'subjectAgeGroup'),
    reviewNote: requiredText(input.reviewNote, 'reviewNote'),
  };
  if (!['adult', 'minor', 'unknown'].includes(values.subjectAgeGroup)) {
    throw new TypeError('subjectAgeGroup is not supported');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(`
      SELECT i.*, c.state AS calendar_state
      FROM editorial_issues i JOIN editorial_calendar c ON c.id=i.calendar_id
      WHERE i.id=$1 FOR UPDATE OF i, c
    `, [input.issueId]);
    if (current.rowCount === 0) {
      throw new EditorialRevisionError('EDITORIAL_ISSUE_NOT_FOUND', `Editorial issue not found: ${input.issueId}`, 404);
    }
    const row = current.rows[0];
    if (row.version !== input.expectedVersion) {
      throw new EditorialRevisionError('EDITORIAL_VERSION_CONFLICT', 'Editorial issue version conflict');
    }
    if (row.status !== 'draft' || row.calendar_state !== 'drafting') {
      throw new EditorialRevisionError(
        'EDITORIAL_REVISION_NOT_ALLOWED',
        `Cannot revise issue in ${row.status}/${row.calendar_state}`,
      );
    }
    const version = row.version + 1;
    const updated = await client.query(`
      UPDATE editorial_issues SET
        title=$2, content=$3, summary=$4, why_now=$5, discussion_question=$6,
        related_url=$7, subject_age_group=$8, version=$9, last_actor_user_id=$10,
        last_action_id=$11, policy_checked_at=$12, policy_fingerprint=$13, updated_at=NOW()
      WHERE id=$1 RETURNING *
    `, [
      input.issueId, values.title, values.content, values.summary, values.whyNow,
      values.discussionQuestion, values.relatedUrl, values.subjectAgeGroup, version,
      actorUserId, crypto.randomUUID(), null, null,
    ]);
    await client.query(`
      INSERT INTO editorial_revisions (
        issue_id, revision_number, title, content, review_note, created_by
      ) SELECT $1, COALESCE(MAX(revision_number), 0) + 1, $2, $3, $4, $5
        FROM editorial_revisions WHERE issue_id = $1
    `, [input.issueId, values.title, values.content, values.reviewNote, actorUserId]);
    await client.query(`
      INSERT INTO editorial_events (
        issue_id, event_type, from_status, to_status, issue_version, actor_user_id, note
      ) VALUES ($1, 'revised', $2, $2, $3, $4, $5)
    `, [input.issueId, row.status, version, actorUserId, values.reviewNote]);
    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { EditorialRevisionError, reviseEditorialIssue };
