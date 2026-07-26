const QUERY_PROFILE_VERSION = '2026-07-v1';

const QUERY_PROFILES = Object.freeze({
  'korean-athletics': '육상 선수',
  'korean-meets': '육상 대회',
  'korean-athletics-news': '한국 육상',
  'national-meets': '전국육상경기대회',
  'kaaf': '대한육상연맹',
  'corporate-athletics': '실업육상',
  'world-championships': '세계육상선수권',
  'asian-championships': '아시아육상선수권',
  'indoor-athletics': '실내육상',
  'marathon-athletes': '마라톤 선수',
  'race-walk-athletes': '경보 선수',
});

class EditorialNewsQueryError extends Error {
  constructor(code) {
    super(code);
    this.name = 'EditorialNewsQueryError';
    this.code = code;
  }
}

function resolveEditorialNewsQuery(profile, start = 1) {
  if (!Object.hasOwn(QUERY_PROFILES, profile)) {
    throw new EditorialNewsQueryError('INVALID_QUERY_PROFILE');
  }
  if (start !== 1 && start !== 101) {
    throw new EditorialNewsQueryError('INVALID_PAGE');
  }
  return Object.freeze({ query: QUERY_PROFILES[profile], start, version: QUERY_PROFILE_VERSION });
}

module.exports = { QUERY_PROFILE_VERSION, QUERY_PROFILES, EditorialNewsQueryError, resolveEditorialNewsQuery };
