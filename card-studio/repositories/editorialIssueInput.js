function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function parseEditorialIssueInput(input) {
  const parsed = {
    sectionKey: requiredText(input.sectionKey, 'sectionKey'),
    title: requiredText(input.title, 'title'),
    content: requiredText(input.content, 'content'),
    author: requiredText(input.author, 'author'),
    summary: requiredText(input.summary, 'summary'),
    whyNow: requiredText(input.whyNow, 'whyNow'),
    discussionQuestion: requiredText(input.discussionQuestion, 'discussionQuestion'),
    relatedUrl: requiredText(input.relatedUrl, 'relatedUrl'),
    subjectAgeGroup: requiredText(input.subjectAgeGroup, 'subjectAgeGroup'),
  };
  if (!['adult', 'minor', 'unknown'].includes(parsed.subjectAgeGroup)) {
    throw new TypeError('subjectAgeGroup is not supported');
  }
  return parsed;
}

module.exports = { parseEditorialIssueInput, requiredText };
