const crypto = require('node:crypto');
const { assertEditorialActor } = require('./editorialStateMachine');
const { requiredText } = require('./editorialIssueInput');
const {
  EditorialNotFoundError,
  assertExpectedVersion,
} = require('./editorialRepositoryErrors');
const { issueView, sourceView } = require('./editorialRepositoryViews');
const { assertSafeSourceUrl } = require('../services/editorialSourceUrlPolicy');

const SOURCE_KINDS = Object.freeze(['official', 'primary', 'secondary', 'internal']);

function sourceInput(input) {
  const sourceUrl = assertSafeSourceUrl(requiredText(input.sourceUrl, 'sourceUrl'));
  if (!SOURCE_KINDS.includes(input.sourceKind)) throw new TypeError('sourceKind is not supported');
  return {
    sourceUrl,
    sourceKind: input.sourceKind,
    title: requiredText(input.title, 'title'),
    publisher: input.publisher == null ? null : requiredText(input.publisher, 'publisher'),
  };
}

async function lockDraftIssue(client, input) {
  const result = await client.query(`
    SELECT i.*, c.state AS calendar_state
    FROM editorial_issues i JOIN editorial_calendar c ON c.id=i.calendar_id
    WHERE i.id=$1 FOR UPDATE OF i, c
  `, [input.issueId]);
  if (result.rowCount === 0) throw new EditorialNotFoundError(input.issueId);
  const issue = result.rows[0];
  assertExpectedVersion(input.expectedVersion, issue.version);
  if (issue.status !== 'draft' || ['skipped', 'cancelled'].includes(issue.calendar_state)) {
    const error = new Error('Sources can only change while an issue is an active draft');
    error.code = 'EDITORIAL_SOURCE_WRITE_NOT_ALLOWED';
    error.status = 409;
    throw error;
  }
  return issue;
}

async function recordMutation(client, issue, actorUserId, eventType, payload) {
  const version = issue.version + 1;
  const updated = await client.query(`
    UPDATE editorial_issues
    SET version=$2, last_actor_user_id=$3, last_action_id=$4, updated_at=NOW()
    WHERE id=$1 RETURNING *
  `, [issue.id, version, actorUserId, crypto.randomUUID()]);
  await client.query(`
    INSERT INTO editorial_events (
      issue_id, event_type, issue_version, actor_user_id, payload
    ) VALUES ($1, $2, $3, $4, $5::jsonb)
  `, [issue.id, eventType, version, actorUserId, JSON.stringify(payload)]);
  return issueView(updated.rows[0]);
}

async function addSource(pool, input) {
  const actorUserId = assertEditorialActor(input.actorUserId);
  const source = sourceInput(input);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const issue = await lockDraftIssue(client, input);
    const id = crypto.randomUUID();
    const inserted = await client.query(`
      INSERT INTO editorial_sources (
        id, issue_id, source_url, source_kind, title, publisher, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [id, issue.id, source.sourceUrl, source.sourceKind, source.title, source.publisher, actorUserId]);
    const updatedIssue = await recordMutation(client, issue, actorUserId, 'source_added', { sourceId: id });
    await client.query('COMMIT');
    return { ...sourceView(inserted.rows[0]), issueVersion: updatedIssue.version };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateSource(pool, input) {
  const actorUserId = assertEditorialActor(input.actorUserId);
  const source = sourceInput(input);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const issue = await lockDraftIssue(client, input);
    const updated = await client.query(`
      UPDATE editorial_sources SET source_url=$3, source_kind=$4, title=$5, publisher=$6
      WHERE id=$1 AND issue_id=$2 RETURNING *
    `, [input.sourceId, issue.id, source.sourceUrl, source.sourceKind, source.title, source.publisher]);
    if (updated.rowCount === 0) throw new EditorialNotFoundError(input.sourceId);
    const updatedIssue = await recordMutation(
      client, issue, actorUserId, 'source_updated', { sourceId: input.sourceId },
    );
    await client.query('COMMIT');
    return { ...sourceView(updated.rows[0]), issueVersion: updatedIssue.version };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteSource(pool, input) {
  const actorUserId = assertEditorialActor(input.actorUserId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const issue = await lockDraftIssue(client, input);
    const removed = await client.query(
      'DELETE FROM editorial_sources WHERE id=$1 AND issue_id=$2 RETURNING id',
      [input.sourceId, issue.id],
    );
    if (removed.rowCount === 0) throw new EditorialNotFoundError(input.sourceId);
    const updatedIssue = await recordMutation(
      client, issue, actorUserId, 'source_deleted', { sourceId: input.sourceId },
    );
    await client.query('COMMIT');
    return { deleted: true, sourceId: input.sourceId, issueVersion: updatedIssue.version };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { addSource, deleteSource, updateSource };
