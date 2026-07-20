const crypto = require('node:crypto');
const { evaluateEditorialIssue } = require('../editorialPolicy');

const SOURCE_TYPE_MAP = Object.freeze({
  official: 'primary',
  primary: 'primary',
  secondary: 'reputable_secondary',
  internal: 'athletetime',
});

class EditorialPolicyBlockedError extends Error {
  constructor(reasons) {
    super('Editorial policy blocked this issue');
    this.name = 'EditorialPolicyBlockedError';
    this.code = 'EDITORIAL_POLICY_BLOCKED';
    this.status = 422;
    this.reasons = reasons;
  }
}

function sourceView(row) {
  return {
    provider: row.publisher || (row.source_kind === 'internal' ? 'AthleteTime' : '원출처'),
    title: row.title,
    url: row.source_url,
    accessedAt: new Date(row.captured_at).toISOString(),
    type: SOURCE_TYPE_MAP[row.source_kind],
  };
}

function policyInput(row, sourceRows) {
  return {
    title: row.title,
    content: row.content,
    summary: row.summary,
    whyNow: row.why_now,
    discussionQuestion: row.discussion_question,
    relatedUrl: row.related_url,
    subjectAgeGroup: row.subject_age_group,
    sources: sourceRows.map(sourceView),
  };
}

function assertPersistedIssuePolicy(row, sourceRows, now = new Date()) {
  const input = policyInput(row, sourceRows);
  const result = evaluateEditorialIssue(input, { now: now.toISOString() });
  if (!result.publishEligible) throw new EditorialPolicyBlockedError(result.reasons);
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
  return { fingerprint, result };
}

module.exports = {
  EditorialPolicyBlockedError,
  assertPersistedIssuePolicy,
};
