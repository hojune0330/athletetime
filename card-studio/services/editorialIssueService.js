const { assertResolvableSourceUrl } = require('./editorialSourceUrlPolicy');

const TRANSITION_ACTIONS = Object.freeze({
  check: 'review_ready',
  approve: 'approved',
  schedule: 'scheduled',
  publish: 'published',
  unpublish: 'unpublished',
});

class EditorialActionError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'EditorialActionError';
    this.code = code;
    this.status = status;
  }
}

function requiredReason(input, action) {
  if (typeof input.note !== 'string' || input.note.trim() === '') {
    throw new EditorialActionError('EDITORIAL_REASON_REQUIRED', `${action} 사유가 필요합니다.`);
  }
  return input.note.trim();
}

class EditorialIssueService {
  constructor(repository, options = {}) {
    if (!repository) throw new TypeError('editorial repository is required');
    this.repository = repository;
    this.resolveHostname = options.resolveHostname;
  }

  listCalendar(query = {}) {
    return this.repository.listCalendar(query);
  }

  createCalendar(input) { return this.repository.createCalendar(input); }

  updateCalendar(input) { return this.repository.updateCalendar(input); }

  cancelCalendar(input) { return this.repository.cancelCalendar(input); }

  listIssues(query = {}) {
    return this.repository.listIssues(query);
  }

  getIssue(issueId) {
    return this.repository.getIssue(issueId);
  }

  createIssue(input) {
    return this.repository.createIssue(input);
  }

  listSources(issueId) {
    return this.repository.listSources(issueId);
  }

  async addSource(input) {
    const sourceUrl = await assertResolvableSourceUrl(input.sourceUrl, this.resolveHostname);
    return this.repository.addSource({ ...input, sourceUrl });
  }

  async updateSource(input) {
    const sourceUrl = await assertResolvableSourceUrl(input.sourceUrl, this.resolveHostname);
    return this.repository.updateSource({ ...input, sourceUrl });
  }

  deleteSource(input) {
    return this.repository.deleteSource(input);
  }

  reviseIssue(input) {
    return this.repository.reviseIssue(input);
  }

  listMagazine(query = {}) {
    return this.repository.listMagazine(query);
  }

  getMagazineIssue(slug) {
    return this.repository.getMagazineIssue(slug);
  }

  act(action, input) {
    if (action === 'correct') return this.repository.correctIssue(input);
    if (action === 'reject' || action === 'cancel') {
      return this.repository.finishIssue({
        ...input,
        note: requiredReason(input, action),
        calendarState: action === 'reject' ? 'skipped' : 'cancelled',
        eventType: action === 'reject' ? 'rejected' : 'cancelled',
      });
    }
    const nextStatus = TRANSITION_ACTIONS[action];
    if (!nextStatus) {
      throw new EditorialActionError('EDITORIAL_ACTION_NOT_SUPPORTED', `지원하지 않는 편집 작업입니다: ${action}`);
    }
    return this.repository.transitionIssue({ ...input, nextStatus });
  }
}

module.exports = { EditorialActionError, EditorialIssueService };
