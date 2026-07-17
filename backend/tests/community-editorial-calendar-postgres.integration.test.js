const assert = require('node:assert/strict');
const test = require('node:test');

const { PostgresEditorialRepository } = require('../../card-studio/repositories/postgresEditorialRepository');
const { EditorialIssueService } = require('../../card-studio/services/editorialIssueService');
const {
  ACTOR_ID,
  applyEditorialMigrations,
  connectionString,
  createExistingFixture,
  isolatedPool,
} = require('./helpers/communityEditorialPostgresHarness');

test('EDITORIAL-CALENDAR-PG-001: calendar writes are versioned and audited without creating an issue', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  const pool = await isolatedPool(t, 'editorial_calendar');
  await createExistingFixture(pool);
  await applyEditorialMigrations(pool);
  const service = new EditorialIssueService(new PostgresEditorialRepository(pool));

  const created = await service.createCalendar({
    seasonYear: 2026,
    sectionKey: 'competition-preview',
    slot: 1,
    scheduledFor: '2026-08-01T09:00:00.000Z',
    actorUserId: ACTOR_ID,
  });
  const updated = await service.updateCalendar({
    calendarId: created.id,
    expectedVersion: created.version,
    scheduledFor: '2026-08-02T09:00:00.000Z',
    actorUserId: ACTOR_ID,
  });

  await assert.rejects(
    service.updateCalendar({
      calendarId: created.id,
      expectedVersion: created.version,
      slot: 2,
      actorUserId: ACTOR_ID,
    }),
    (error) => error.code === 'EDITORIAL_VERSION_CONFLICT',
  );
  const cancelled = await service.cancelCalendar({
    calendarId: created.id,
    expectedVersion: updated.version,
    note: 'No source-backed topic this week',
    actorUserId: ACTOR_ID,
  });

  assert.equal(cancelled.state, 'cancelled');
  assert.equal(cancelled.version, 3);
  assert.equal(cancelled.skipReason, 'No source-backed topic this week');
  assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM editorial_issues')).rows[0].count, 0);
  const events = await pool.query(`
    SELECT event_type, calendar_version, actor_user_id, note
    FROM editorial_calendar_events WHERE calendar_id=$1 ORDER BY id
  `, [created.id]);
  assert.deepEqual(events.rows, [
    { event_type: 'created', calendar_version: 1, actor_user_id: ACTOR_ID, note: '' },
    { event_type: 'updated', calendar_version: 2, actor_user_id: ACTOR_ID, note: '' },
    {
      event_type: 'cancelled', calendar_version: 3,
      actor_user_id: ACTOR_ID, note: 'No source-backed topic this week',
    },
  ]);
});

test('EDITORIAL-CALENDAR-PG-002: a draft claims its planned calendar without duplicating the slot', {
  skip: !connectionString && 'TEST_DATABASE_URL/DATABASE_URL is not available',
  timeout: 30000,
}, async (t) => {
  const pool = await isolatedPool(t, 'editorial_calendar_claim');
  await createExistingFixture(pool);
  await applyEditorialMigrations(pool);
  const service = new EditorialIssueService(new PostgresEditorialRepository(pool));
  const calendar = await service.createCalendar({
    seasonYear: 2026,
    sectionKey: 'record-story',
    slot: 2,
    actorUserId: ACTOR_ID,
  });

  const issue = await service.createIssue({
    calendarId: calendar.id,
    expectedCalendarVersion: calendar.version,
    seasonYear: 2026,
    sectionKey: 'record-story',
    slot: 2,
    title: 'A record story',
    content: 'Source-backed result context.',
    author: '애타 편집팀',
    summary: 'A short summary.',
    whyNow: 'The result was published this week.',
    discussionQuestion: 'Which performance stood out?',
    relatedUrl: '/competitions',
    subjectAgeGroup: 'adult',
    actorUserId: ACTOR_ID,
  });

  assert.equal(issue.calendarId, calendar.id);
  const calendars = await pool.query('SELECT id, state, version FROM editorial_calendar');
  assert.deepEqual(calendars.rows, [{ id: calendar.id, state: 'drafting', version: 2 }]);
  const linked = await pool.query(`
    SELECT event_type, calendar_version, actor_user_id, payload->>'issueId' AS issue_id
    FROM editorial_calendar_events WHERE calendar_id=$1 ORDER BY id DESC LIMIT 1
  `, [calendar.id]);
  assert.deepEqual(linked.rows, [{
    event_type: 'updated', calendar_version: 2, actor_user_id: ACTOR_ID, issue_id: issue.id,
  }]);
});
