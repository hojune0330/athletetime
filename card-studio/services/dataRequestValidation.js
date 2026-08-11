const REQUEST_TYPES = ['correction', 'deletion', 'objection'];
const STATUSES = ['received', 'under_review', 'search_hidden', 'corrected', 'restored', 'removed'];
const RESTRICTED_REASON_ERROR = '요청 사유에는 주민등록번호·전화번호·이메일을 적을 수 없습니다. 해당 내용은 지우고 다시 접수해 주세요.';

const RESTRICTED_REASON_PERSONAL_DATA_PATTERNS = [
  /(?:^|[^\d])\d{6}[-\s]?[1-4]\d{6}(?:$|[^\d])/u,
  /(?:^|[^\d])0(?:2|[1-9]\d)[-.\s]?\d{3,4}[-.\s]?\d{4}(?:$|[^\d])/u,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu,
];

function sanitize(value, max = 500) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function validateRequest(input, buildRecordKey) {
  const request = {
    type: sanitize(input.type, 20),
    athleteName: sanitize(input.athleteName, 100),
    affiliation: sanitize(input.affiliation, 100),
    competition: sanitize(input.competition, 200),
    event: sanitize(input.event, 120),
    recordKey: sanitize(input.recordKey, 200),
    sourceId: sanitize(input.sourceId, 200),
    reason: sanitize(input.reason, 2000),
    contact: sanitize(input.contact, 200),
  };
  if (!request.recordKey
    && request.athleteName
    && request.affiliation
    && request.competition
    && request.event) {
    request.recordKey = buildRecordKey(request);
  }
  if (!REQUEST_TYPES.includes(request.type)) {
    return { ok: false, error: '요청 유형이 올바르지 않습니다. (correction|deletion|objection)' };
  }
  if (!request.athleteName) {
    return { ok: false, error: '대상 선수명(또는 식별 정보)을 입력해 주세요.' };
  }
  if (!request.reason) return { ok: false, error: '요청 사유를 입력해 주세요.' };
  if (RESTRICTED_REASON_PERSONAL_DATA_PATTERNS.some((pattern) => pattern.test(request.reason))) {
    return { ok: false, error: RESTRICTED_REASON_ERROR };
  }
  return { ok: true, request };
}

module.exports = {
  REQUEST_TYPES,
  STATUSES,
  RESTRICTED_REASON_ERROR,
  sanitize,
  validateRequest,
};
