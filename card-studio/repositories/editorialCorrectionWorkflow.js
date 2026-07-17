const crypto = require('node:crypto');
const { assertPersistedIssuePolicy } = require('./editorialPolicyGate');
const { requiredText } = require('./editorialIssueInput');
const { assertEditorialActor, assertEditorialTransition } = require('./editorialStateMachine');
const {
  EditorialNotFoundError,
  assertExpectedVersion,
} = require('./editorialRepositoryErrors');
const { issueView } = require('./editorialRepositoryViews');

function correctionValues(input) {
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
  return values;
}

async function correctIssue(pool, input) {
  const actorUserId = assertEditorialActor(input.actorUserId);
  const values = correctionValues(input);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(`
      SELECT i.*, c.section_key, c.state AS calendar_state
      FROM editorial_issues i JOIN editorial_calendar c ON c.id=i.calendar_id
      WHERE i.id=$1 FOR UPDATE OF i, c
    `, [input.issueId]);
    if (current.rowCount === 0) throw new EditorialNotFoundError(input.issueId);
    const issue = current.rows[0];
    assertExpectedVersion(input.expectedVersion, issue.version);
    assertEditorialTransition(issue.status, 'corrected');
    const sources = await client.query(
      'SELECT * FROM editorial_sources WHERE issue_id=$1 ORDER BY id',
      [issue.id],
    );
    const candidate = {
      ...issue,
      title: values.title,
      content: values.content,
      summary: values.summary,
      why_now: values.whyNow,
      discussion_question: values.discussionQuestion,
      related_url: values.relatedUrl,
      subject_age_group: values.subjectAgeGroup,
    };
    const policy = assertPersistedIssuePolicy(candidate, sources.rows);
    const post = await client.query(`
      UPDATE posts SET title=$2, content=$3, updated_at=NOW()
      WHERE id=$1 AND deleted_at IS NULL RETURNING id
    `, [issue.post_id, values.title, values.content]);
    if (post.rowCount !== 1) {
      const error = new Error('Editorial public post is not available for correction');
      error.code = 'EDITORIAL_POST_NOT_FOUND';
      error.status = 409;
      throw error;
    }
    const version = issue.version + 1;
    const updated = await client.query(`
      UPDATE editorial_issues SET
        status='corrected', title=$2, content=$3, summary=$4, why_now=$5,
        discussion_question=$6, related_url=$7, subject_age_group=$8,
        version=$9, policy_checked_at=NOW(), policy_fingerprint=$10,
        last_actor_user_id=$11, last_action_id=$12, updated_at=NOW()
      WHERE id=$1 RETURNING *
    `, [
      issue.id, values.title, values.content, values.summary, values.whyNow,
      values.discussionQuestion, values.relatedUrl, values.subjectAgeGroup,
      version, policy.fingerprint, actorUserId, crypto.randomUUID(),
    ]);
    await client.query(`
      INSERT INTO editorial_revisions (
        issue_id, revision_number, title, content, review_note, created_by
      ) SELECT $1, COALESCE(MAX(revision_number),0)+1, $2, $3, $4, $5
        FROM editorial_revisions WHERE issue_id=$1
    `, [issue.id, values.title, values.content, values.reviewNote, actorUserId]);
    await client.query(`
      INSERT INTO editorial_events (
        issue_id, event_type, from_status, to_status, issue_version, actor_user_id, note
      ) VALUES ($1,'revised','published','corrected',$2,$3,$4)
    `, [issue.id, version, actorUserId, values.reviewNote]);
    await client.query('COMMIT');
    return issueView({ ...updated.rows[0], section_key: issue.section_key }, sources.rows);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { correctIssue };
