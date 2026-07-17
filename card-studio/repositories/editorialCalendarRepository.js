const crypto = require('node:crypto');
const { assertEditorialActor, assertPackageRole } = require('./editorialStateMachine');
const { assertExpectedVersion } = require('./editorialRepositoryErrors');
const { calendarView } = require('./editorialRepositoryViews');

function calendarError(code, message, status = 409) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

async function createCalendar(pool, input) {
  const actor = assertEditorialActor(input.actorUserId);
  assertPackageRole(input.packageRole, input.competitionId);
  const id = crypto.randomUUID();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(`
      INSERT INTO editorial_calendar (
        id, season_year, competition_id, package_role, section_key, slot, state, scheduled_for
      ) VALUES ($1,$2,$3,$4,$5,$6,'planned',$7) RETURNING *
    `, [
      id, input.seasonYear, input.competitionId || null, input.packageRole || null,
      input.sectionKey, input.slot, input.scheduledFor || null,
    ]);
    await client.query(`
      INSERT INTO editorial_calendar_events (
        calendar_id, event_type, calendar_version, actor_user_id, payload
      ) VALUES ($1,'created',1,$2,$3)
    `, [id, actor, { sectionKey: input.sectionKey, slot: input.slot }]);
    await client.query('COMMIT');
    return calendarView(inserted.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateCalendar(pool, input) {
  const actor = assertEditorialActor(input.actorUserId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT * FROM editorial_calendar WHERE id=$1 FOR UPDATE', [input.calendarId]);
    if (current.rowCount === 0) throw calendarError('EDITORIAL_CALENDAR_NOT_FOUND', 'Calendar entry not found', 404);
    const row = current.rows[0];
    assertExpectedVersion(input.expectedVersion, row.version);
    if (row.state !== 'planned') throw calendarError('EDITORIAL_CALENDAR_WRITE_NOT_ALLOWED', 'Only planned entries can be edited');
    const values = {
      seasonYear: input.seasonYear ?? row.season_year,
      competitionId: input.competitionId ?? row.competition_id,
      packageRole: input.packageRole ?? row.package_role,
      sectionKey: input.sectionKey ?? row.section_key,
      slot: input.slot ?? row.slot,
      scheduledFor: input.scheduledFor ?? row.scheduled_for,
    };
    assertPackageRole(values.packageRole, values.competitionId);
    const version = row.version + 1;
    const updated = await client.query(`
      UPDATE editorial_calendar SET season_year=$2, competition_id=$3, package_role=$4,
        section_key=$5, slot=$6, scheduled_for=$7, version=$8, updated_at=NOW()
      WHERE id=$1 RETURNING *
    `, [
      input.calendarId, values.seasonYear, values.competitionId, values.packageRole,
      values.sectionKey, values.slot, values.scheduledFor, version,
    ]);
    await client.query(`
      INSERT INTO editorial_calendar_events (
        calendar_id, event_type, calendar_version, actor_user_id, payload
      ) VALUES ($1,'updated',$2,$3,$4)
    `, [input.calendarId, version, actor, { changedFields: Object.keys(input).filter((key) => !['calendarId', 'actorUserId', 'expectedVersion'].includes(key)) }]);
    await client.query('COMMIT');
    return calendarView(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function closeCalendar(pool, input, targetState, eventType) {
  const actor = assertEditorialActor(input.actorUserId);
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if (!note) throw new TypeError('Calendar close reason is required');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT * FROM editorial_calendar WHERE id=$1 FOR UPDATE', [input.calendarId]);
    if (current.rowCount === 0) throw calendarError('EDITORIAL_CALENDAR_NOT_FOUND', 'Calendar entry not found', 404);
    const row = current.rows[0];
    assertExpectedVersion(input.expectedVersion, row.version);
    if (row.state !== 'planned') throw calendarError('EDITORIAL_CALENDAR_WRITE_NOT_ALLOWED', 'Linked entries must be cancelled through their issue');
    const linked = await client.query('SELECT id FROM editorial_issues WHERE calendar_id=$1', [input.calendarId]);
    if (linked.rowCount > 0) throw calendarError('EDITORIAL_CALENDAR_LINKED', 'Linked entries must be cancelled through their issue');
    const version = row.version + 1;
    const updated = await client.query(`
      UPDATE editorial_calendar SET state=$2, skip_reason=$3,
        version=$4, updated_at=NOW() WHERE id=$1 RETURNING *
    `, [input.calendarId, targetState, note, version]);
    await client.query(`
      INSERT INTO editorial_calendar_events (
        calendar_id, event_type, calendar_version, actor_user_id, note
      ) VALUES ($1,$2,$3,$4,$5)
    `, [input.calendarId, eventType, version, actor, note]);
    await client.query('COMMIT');
    return calendarView(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function cancelCalendar(pool, input) {
  return closeCalendar(pool, input, 'cancelled', 'cancelled');
}

function skipCalendar(pool, input) {
  return closeCalendar(pool, input, 'skipped', 'skipped');
}

module.exports = { cancelCalendar, createCalendar, skipCalendar, updateCalendar };
