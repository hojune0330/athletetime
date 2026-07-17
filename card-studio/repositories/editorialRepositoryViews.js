function sourceView(row) {
  return {
    id: row.id,
    issueId: row.issue_id,
    sourceUrl: row.source_url,
    sourceKind: row.source_kind,
    title: row.title,
    publisher: row.publisher,
    capturedAt: row.captured_at,
  };
}

function issueView(row, sources = row.sources || []) {
  return {
    id: row.id,
    slug: row.slug,
    calendarId: row.calendar_id,
    postId: row.post_id == null ? null : Number(row.post_id),
    status: row.status,
    version: row.version,
    title: row.title,
    content: row.content,
    author: row.author,
    summary: row.summary,
    whyNow: row.why_now,
    discussionQuestion: row.discussion_question,
    relatedUrl: row.related_url,
    subjectAgeGroup: row.subject_age_group,
    sectionKey: row.section_key,
    calendarState: row.calendar_state,
    scheduledFor: row.scheduled_for,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sources: sources.map(sourceView),
  };
}

function calendarView(row) {
  return {
    id: row.id,
    seasonYear: row.season_year,
    competitionId: row.competition_id == null ? null : Number(row.competition_id),
    packageRole: row.package_role,
    sectionKey: row.section_key,
    slot: row.slot,
    state: row.state,
    scheduledFor: row.scheduled_for,
    skipReason: row.skip_reason,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function revisionView(row) {
  return {
    id: Number(row.id),
    revisionNumber: Number(row.revision_number),
    title: row.title,
    content: row.content,
    reviewNote: row.review_note,
    createdAt: row.created_at,
  };
}

module.exports = { calendarView, issueView, revisionView, sourceView };
