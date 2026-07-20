const { ISSUE_STATES } = require('./editorialStateMachine');
const { EditorialNotFoundError } = require('./editorialRepositoryErrors');
const {
  calendarView,
  issueView,
  publicCorrectionView,
  revisionView,
  sourceView,
} = require('./editorialRepositoryViews');

function parseLimit(value, fallback = 50) {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new TypeError('limit must be an integer between 1 and 100');
  }
  return parsed;
}

async function sourcesByIssue(pool, issueIds) {
  if (issueIds.length === 0) return new Map();
  const result = await pool.query(
    'SELECT * FROM editorial_sources WHERE issue_id = ANY($1::uuid[]) ORDER BY captured_at, id',
    [issueIds],
  );
  const grouped = new Map(issueIds.map((id) => [id, []]));
  for (const row of result.rows) grouped.get(row.issue_id)?.push(row);
  return grouped;
}

async function listCalendar(pool, query = {}) {
  const limit = parseLimit(query.limit);
  const result = await pool.query(`
    SELECT * FROM editorial_calendar
    ORDER BY season_year DESC, slot ASC, created_at DESC
    LIMIT $1
  `, [limit]);
  return result.rows.map(calendarView);
}

async function listIssues(pool, query = {}) {
  const limit = parseLimit(query.limit);
  const status = query.status || null;
  if (status && !ISSUE_STATES.includes(status)) throw new TypeError('status is not supported');
  const result = await pool.query(`
    SELECT i.*, c.section_key, c.state AS calendar_state
    FROM editorial_issues i
    JOIN editorial_calendar c ON c.id = i.calendar_id
    WHERE ($1::text IS NULL OR i.status = $1)
    ORDER BY i.updated_at DESC, i.id
    LIMIT $2
  `, [status, limit]);
  const sources = await sourcesByIssue(pool, result.rows.map((row) => row.id));
  return result.rows.map((row) => issueView(row, sources.get(row.id)));
}

async function getIssue(pool, issueId) {
  const result = await pool.query(`
    SELECT i.*, c.section_key, c.state AS calendar_state
    FROM editorial_issues i
    JOIN editorial_calendar c ON c.id = i.calendar_id
    WHERE i.id = $1
  `, [issueId]);
  if (result.rowCount === 0) throw new EditorialNotFoundError(issueId);
  const sources = await sourcesByIssue(pool, [issueId]);
  return issueView(result.rows[0], sources.get(issueId));
}

async function listSources(pool, issueId) {
  const issue = await pool.query('SELECT id FROM editorial_issues WHERE id=$1', [issueId]);
  if (issue.rowCount === 0) throw new EditorialNotFoundError(issueId);
  const result = await pool.query(
    'SELECT * FROM editorial_sources WHERE issue_id=$1 ORDER BY captured_at, id',
    [issueId],
  );
  return result.rows.map(sourceView);
}

async function listRevisions(pool, issueId) {
  const issue = await pool.query('SELECT id FROM editorial_issues WHERE id=$1', [issueId]);
  if (issue.rowCount === 0) throw new EditorialNotFoundError(issueId);
  const result = await pool.query(`
    SELECT id, revision_number, title, content, review_note, public_summary, created_at
    FROM editorial_revisions
    WHERE issue_id=$1
    ORDER BY revision_number DESC
  `, [issueId]);
  return result.rows.map(revisionView);
}

async function listMagazine(pool, query = {}) {
  const limit = parseLimit(query.limit, 20);
  const result = await pool.query(`
    SELECT i.*, c.section_key, p.comments_count
    FROM editorial_issues i
    JOIN editorial_calendar c ON c.id = i.calendar_id
    JOIN posts p ON p.id = i.post_id
    WHERE (i.status = 'published' OR (i.status = 'corrected' AND i.policy_checked_at IS NOT NULL))
      AND p.deleted_at IS NULL AND p.is_blinded = FALSE
    ORDER BY i.published_at DESC NULLS LAST, i.updated_at DESC
    LIMIT $1
  `, [limit]);
  const sources = await sourcesByIssue(pool, result.rows.map((row) => row.id));
  return result.rows.map((row) => issueView(row, sources.get(row.id)));
}

async function getMagazineIssue(pool, slug) {
  const result = await pool.query(`
    SELECT i.*, c.section_key, p.comments_count
    FROM editorial_issues i
    JOIN editorial_calendar c ON c.id = i.calendar_id
    JOIN posts p ON p.id = i.post_id
    WHERE i.slug=$1
      AND (i.status = 'published' OR (i.status = 'corrected' AND i.policy_checked_at IS NOT NULL))
      AND p.deleted_at IS NULL AND p.is_blinded = FALSE
  `, [slug]);
  if (result.rowCount === 0) throw new EditorialNotFoundError(slug);
  const sources = await sourcesByIssue(pool, [result.rows[0].id]);
  return issueView(result.rows[0], sources.get(result.rows[0].id));
}

async function getMagazineIssueByPostId(pool, postId) {
  const result = await pool.query(`
    SELECT i.*, c.section_key, p.comments_count
    FROM editorial_issues i
    JOIN editorial_calendar c ON c.id = i.calendar_id
    JOIN posts p ON p.id = i.post_id
    WHERE i.post_id=$1
      AND (i.status = 'published' OR (i.status = 'corrected' AND i.policy_checked_at IS NOT NULL))
      AND p.deleted_at IS NULL AND p.is_blinded = FALSE
  `, [postId]);
  if (result.rowCount === 0) throw new EditorialNotFoundError(postId);
  const sources = await sourcesByIssue(pool, [result.rows[0].id]);
  return issueView(result.rows[0], sources.get(result.rows[0].id));
}

async function listPublicCorrections(pool, issueId) {
  const result = await pool.query(`
    SELECT revision.revision_number, revision.public_summary, event.created_at
    FROM editorial_events event
    JOIN LATERAL (
      SELECT revision_number, public_summary
      FROM editorial_revisions
      WHERE issue_id=event.issue_id AND created_at <= event.created_at
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    ) revision ON TRUE
    WHERE event.issue_id=$1
      AND event.event_type='revised'
      AND event.from_status='published'
      AND event.to_status='corrected'
    ORDER BY event.created_at DESC, event.id DESC
  `, [issueId]);
  return result.rows.map(publicCorrectionView);
}

module.exports = {
  getIssue,
  getMagazineIssue,
  getMagazineIssueByPostId,
  listCalendar,
  listIssues,
  listMagazine,
  listPublicCorrections,
  listRevisions,
  listSources,
};
