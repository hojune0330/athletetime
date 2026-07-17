const crypto = require('node:crypto');
const { assertEditorialActor, assertPackageRole } = require('./editorialStateMachine');
const { parseEditorialIssueInput } = require('./editorialIssueInput');
const { assertExpectedVersion } = require('./editorialRepositoryErrors');
const { issueView } = require('./editorialRepositoryViews');

function calendarClaimError(code, message, status = 409) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function assertCalendarMatches(row, input) {
  const actualCompetitionId = row.competition_id == null ? null : Number(row.competition_id);
  const expectedCompetitionId = input.competitionId ?? null;
  const matches = Number(row.season_year) === input.seasonYear
    && row.section_key === input.sectionKey
    && Number(row.slot) === input.slot
    && actualCompetitionId === expectedCompetitionId
    && row.package_role === (input.packageRole ?? null);
  if (!matches) {
    throw calendarClaimError(
      'EDITORIAL_CALENDAR_MISMATCH',
      'Draft fields must match the planned calendar entry',
    );
  }
}

async function createOrClaimCalendar(client, input, actorUserId, issueId) {
  if (!input.calendarId) {
    const calendarId = crypto.randomUUID();
    await client.query(`
      INSERT INTO editorial_calendar (
        id, season_year, competition_id, package_role, section_key, slot, state
      ) VALUES ($1, $2, $3, $4, $5, $6, 'drafting')
    `, [
      calendarId, input.seasonYear, input.competitionId || null, input.packageRole || null,
      input.sectionKey, input.slot,
    ]);
    await client.query(`
      INSERT INTO editorial_calendar_events (
        calendar_id, event_type, calendar_version, actor_user_id, payload
      ) VALUES ($1, 'created', 1, $2, $3)
    `, [calendarId, actorUserId, { issueId }]);
    return calendarId;
  }

  const current = await client.query(
    'SELECT * FROM editorial_calendar WHERE id=$1 FOR UPDATE',
    [input.calendarId],
  );
  if (current.rowCount === 0) {
    throw calendarClaimError('EDITORIAL_CALENDAR_NOT_FOUND', 'Calendar entry not found', 404);
  }
  const row = current.rows[0];
  assertExpectedVersion(input.expectedCalendarVersion, row.version);
  if (row.state !== 'planned') {
    throw calendarClaimError('EDITORIAL_CALENDAR_CLAIMED', 'Calendar entry is not available');
  }
  assertCalendarMatches(row, input);
  const version = row.version + 1;
  await client.query(`
    UPDATE editorial_calendar SET state='drafting', version=$2, updated_at=NOW()
    WHERE id=$1
  `, [input.calendarId, version]);
  await client.query(`
    INSERT INTO editorial_calendar_events (
      calendar_id, event_type, calendar_version, actor_user_id, payload
    ) VALUES ($1, 'updated', $2, $3, $4)
  `, [input.calendarId, version, actorUserId, { issueId }]);
  return input.calendarId;
}

async function createIssue(pool, input) {
  const actorUserId = assertEditorialActor(input.actorUserId);
  if (!Number.isInteger(input.seasonYear) || input.seasonYear < 2000 || input.seasonYear > 2200) {
    throw new TypeError('seasonYear must be an integer between 2000 and 2200');
  }
  if (!Number.isInteger(input.slot) || input.slot <= 0) throw new TypeError('slot must be a positive integer');
  assertPackageRole(input.packageRole, input.competitionId);
  const issue = parseEditorialIssueInput(input);
  const issueId = crypto.randomUUID();
  const slug = `magazine-${issueId}`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const calendarId = await createOrClaimCalendar(client, input, actorUserId, issueId);
    const inserted = await client.query(`
      INSERT INTO editorial_issues (
        id, slug, calendar_id, title, content, author, summary, why_now,
        discussion_question, related_url, subject_age_group, created_by,
        last_actor_user_id, last_action_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,$13) RETURNING *
    `, [
      issueId, slug, calendarId, issue.title, issue.content, issue.author, issue.summary,
      issue.whyNow, issue.discussionQuestion, issue.relatedUrl, issue.subjectAgeGroup,
      actorUserId, crypto.randomUUID(),
    ]);
    await client.query(`
      INSERT INTO editorial_revisions (issue_id, revision_number, title, content, created_by)
      VALUES ($1, 1, $2, $3, $4)
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

module.exports = { createIssue };
