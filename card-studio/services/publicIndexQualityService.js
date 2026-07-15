const RELAY_EVENT = /(계주|릴레이|relay|역전|구간|\d+\s*[x×]\s*\d+|\d+\s*mR)/i;
const DISTANCE_EVENT = /(?:\d+(?:[,.]\d+)?\s*(?:km|m)(?:h|w|sc|r)?|\d+\s*sc)(?![a-z])/i;
const ATHLETICS_EVENT = new RegExp([
  DISTANCE_EVENT.source,
  '허들|장애물|경보|마라톤|도로',
  '높이뛰기|멀리뛰기|세단뛰기|삼단뛰기|장대|포환|원반|창던|해머|공던|던지기|투포환',
  '\\d+\\s*종(?:경기)?',
  RELAY_EVENT.source,
].join('|'), 'i');

function clean(value) {
  return String(value || '').trim();
}

function isRelayEvent(eventLabel) {
  return RELAY_EVENT.test(clean(eventLabel));
}

function assessPublicIndexEvent(eventLabel) {
  if (!ATHLETICS_EVENT.test(clean(eventLabel))) {
    return { indexable: false, reason: 'unrecognized_event' };
  }
  return { indexable: true, reason: null };
}

function assessPublicIndexRow({ eventLabel, row } = {}) {
  const eventAssessment = assessPublicIndexEvent(eventLabel);
  if (!eventAssessment.indexable) return eventAssessment;
  if (isRelayEvent(eventLabel)) return { indexable: false, reason: 'team_event' };
  if (!clean(row?.name)) return { indexable: false, reason: 'missing_name' };
  return { indexable: true, reason: null };
}

module.exports = {
  assessPublicIndexEvent,
  assessPublicIndexRow,
  isRelayEvent,
};
