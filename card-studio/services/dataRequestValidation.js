const REQUEST_TYPES = ['correction', 'deletion', 'objection'];
const STATUSES = ['received', 'under_review', 'search_hidden', 'corrected', 'restored', 'removed'];

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
  return { ok: true, request };
}

module.exports = { REQUEST_TYPES, STATUSES, sanitize, validateRequest };
