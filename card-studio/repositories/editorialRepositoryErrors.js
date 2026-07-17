class EditorialNotFoundError extends Error {
  constructor(issueId) {
    super(`Editorial issue not found: ${issueId}`);
    this.name = 'EditorialNotFoundError';
    this.code = 'EDITORIAL_ISSUE_NOT_FOUND';
    this.status = 404;
  }
}

class EditorialVersionConflictError extends Error {
  constructor(expectedVersion, currentVersion) {
    super(`Editorial issue version conflict: expected ${expectedVersion}, current ${currentVersion}`);
    this.name = 'EditorialVersionConflictError';
    this.code = 'EDITORIAL_VERSION_CONFLICT';
    this.status = 409;
    this.expectedVersion = expectedVersion;
    this.currentVersion = currentVersion;
  }
}

function assertExpectedVersion(expectedVersion, currentVersion) {
  if (!Number.isInteger(expectedVersion) || expectedVersion <= 0) {
    throw new TypeError('expectedVersion must be a positive integer');
  }
  if (expectedVersion !== currentVersion) {
    throw new EditorialVersionConflictError(expectedVersion, currentVersion);
  }
}

module.exports = { EditorialNotFoundError, EditorialVersionConflictError, assertExpectedVersion };
