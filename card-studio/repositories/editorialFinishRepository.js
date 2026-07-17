const crypto = require('node:crypto');
const { assertEditorialActor } = require('./editorialStateMachine');
const {
  EditorialNotFoundError,
  assertExpectedVersion,
} = require('./editorialRepositoryErrors');
const { issueView } = require('./editorialRepositoryViews');

const ALLOWED_FINISH = Object.freeze({
  skipped: Object.freeze({
    calendarStates: Object.freeze(['drafting', 'ready']),
    issueStates: Object.freeze(['draft', 'review_ready', 'approved']),
  }),
  cancelled: Object.freeze({
    calendarStates: Object.freeze(['drafting', 'ready', 'scheduled']),
    issueStates: Object.freeze(['draft', 'review_ready', 'approved', 'scheduled']),
  }),
});

async function finishIssue(pool, input) {
  const actorUserId = assertEditorialActor(input.actorUserId);
  const allowed = ALLOWED_FINISH[input.calendarState];
  if (!allowed || !['rejected', 'cancelled'].includes(input.eventType)) {
    throw new TypeError('Unsupported editorial finish action');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(`
      SELECT i.*, c.state AS calendar_state
      FROM editorial_issues i JOIN editorial_calendar c ON c.id=i.calendar_id
      WHERE i.id=$1 FOR UPDATE OF i, c
    `, [input.issueId]);
    if (current.rowCount === 0) throw new EditorialNotFoundError(input.issueId);
    const issue = current.rows[0];
    assertExpectedVersion(input.expectedVersion, issue.version);
    if (!allowed.calendarStates.includes(issue.calendar_state) || !allowed.issueStates.includes(issue.status)) {
      const error = new Error(`Cannot ${input.eventType} issue in ${issue.status}/${issue.calendar_state}`);
      error.code = 'INVALID_EDITORIAL_FINISH';
      error.status = 409;
      throw error;
    }
    const note = typeof input.note === 'string' ? input.note.trim() : '';
    if (!note) throw new TypeError('Editorial finish reason is required');
    await client.query(`
      UPDATE editorial_calendar
      SET state=$2, skip_reason=$3, version=version+1, updated_at=NOW()
      WHERE id=$1
    `, [issue.calendar_id, input.calendarState, note]);
    const version = issue.version + 1;
    const updated = await client.query(`
      UPDATE editorial_issues
      SET version=$2, last_actor_user_id=$3, last_action_id=$4, updated_at=NOW()
      WHERE id=$1 RETURNING *
    `, [issue.id, version, actorUserId, crypto.randomUUID()]);
    await client.query(`
      INSERT INTO editorial_events (
        issue_id, event_type, from_status, to_status, issue_version, actor_user_id, note
      ) VALUES ($1,$2,$3,$3,$4,$5,$6)
    `, [issue.id, input.eventType, issue.status, version, actorUserId, note]);
    await client.query('COMMIT');
    return { ...issueView(updated.rows[0]), calendarState: input.calendarState };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { finishIssue };
