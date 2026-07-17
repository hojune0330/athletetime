const ISSUE_STATES = Object.freeze([
  'draft',
  'review_ready',
  'approved',
  'scheduled',
  'published',
  'corrected',
  'unpublished',
]);

const PACKAGE_ROLES = Object.freeze(['preview', 'result_context', 'record_story']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const transitions = Object.freeze({
  draft: Object.freeze(['review_ready']),
  review_ready: Object.freeze(['approved']),
  approved: Object.freeze(['scheduled', 'published']),
  scheduled: Object.freeze(['published']),
  published: Object.freeze(['corrected', 'unpublished']),
  corrected: Object.freeze(['published', 'unpublished']),
  unpublished: Object.freeze([]),
});

class EditorialTransitionError extends Error {
  constructor(fromStatus, toStatus) {
    super(`Invalid editorial transition: ${String(fromStatus)} -> ${String(toStatus)}`);
    this.name = 'EditorialTransitionError';
    this.code = 'INVALID_EDITORIAL_TRANSITION';
    this.status = 409;
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
  }
}

function assertEditorialTransition(fromStatus, toStatus) {
  const allowed = transitions[fromStatus];
  if (!allowed || !allowed.includes(toStatus)) {
    throw new EditorialTransitionError(fromStatus, toStatus);
  }
}

function assertEditorialActor(actorUserId) {
  if (typeof actorUserId !== 'string' || !UUID_PATTERN.test(actorUserId)) {
    throw new TypeError('Editorial writes require a valid actor UUID');
  }
  return actorUserId;
}

function assertPackageRole(packageRole, competitionId) {
  if (packageRole == null) return;
  if (!PACKAGE_ROLES.includes(packageRole) || !Number.isInteger(competitionId) || competitionId <= 0) {
    throw new TypeError('packageRole requires a positive competitionId and a supported role');
  }
}

module.exports = {
  ISSUE_STATES,
  PACKAGE_ROLES,
  EditorialTransitionError,
  assertEditorialActor,
  assertEditorialTransition,
  assertPackageRole,
};
