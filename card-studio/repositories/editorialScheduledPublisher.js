const crypto = require('node:crypto');
const { assertEditorialActor, assertEditorialTransition } = require('./editorialStateMachine');
const { publishIssuePost } = require('./editorialPostPublisher');

class EditorialScheduledPublishError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'EditorialScheduledPublishError';
    this.code = code;
    this.retryable = false;
  }
}

function assertScheduledIssue(issue, now) {
  if (issue.issue_status !== 'scheduled') {
    throw new EditorialScheduledPublishError(
      'EDITORIAL_ISSUE_NOT_SCHEDULED',
      'The editorial issue is not scheduled',
    );
  }
  if (issue.calendar_state !== 'scheduled') {
    throw new EditorialScheduledPublishError(
      'EDITORIAL_CALENDAR_NOT_SCHEDULED',
      'The editorial calendar entry is not scheduled',
    );
  }
  if (issue.policy_checked_at == null) {
    throw new EditorialScheduledPublishError(
      'EDITORIAL_POLICY_CHECK_REQUIRED',
      'The editorial policy check is missing',
    );
  }
  if (Number.isNaN(Date.parse(issue.scheduled_for))
    || Date.parse(issue.scheduled_for) > now.getTime()) {
    throw new EditorialScheduledPublishError(
      'EDITORIAL_SCHEDULE_NOT_DUE',
      'The editorial issue is not due',
    );
  }
}

async function publishScheduledIssue(client, issue, options) {
  const actorUserId = assertEditorialActor(options.actorUserId);
  const now = options.now;
  assertScheduledIssue(issue, now);
  assertEditorialTransition(issue.issue_status, 'published');

  const postId = await publishIssuePost(client, issue);
  if (options.afterPostPublished) {
    await options.afterPostPublished({ client, issueId: issue.issue_id, postId });
  }
  await client.query(`
    UPDATE editorial_issues
    SET status = 'published',
        version = version + 1,
        post_id = $2,
        published_at = COALESCE(published_at, $3::timestamptz),
        last_actor_user_id = $4,
        last_action_id = $5,
        updated_at = $3::timestamptz
    WHERE id = $1
  `, [issue.issue_id, postId, now.toISOString(), actorUserId, crypto.randomUUID()]);
  await client.query(`
    UPDATE editorial_calendar
    SET state = 'published', version = version + 1, updated_at = $2::timestamptz
    WHERE id = $1
  `, [issue.calendar_id, now.toISOString()]);
  return { postId };
}

module.exports = {
  EditorialScheduledPublishError,
  publishScheduledIssue,
};
