const TIME_IN_TEXT = /\d{1,2}:\d{2}/;
const LONG_DIGITS = /\d{3,}/;
const RELAY_TEXT = /역전|구간/;
const HOLD_STATUS = 'source_reverify_needed';
const HOLD_MESSAGE = '기록 확인 중이에요';

function cleanText(value) {
  return String(value || '').replace(/\u00a0/g, ' ').trim();
}

function isRelayCompetitionText(...values) {
  return RELAY_TEXT.test(values.map(cleanText).join(' '));
}

function hasPollutedText(value) {
  const text = cleanText(value);
  return Boolean(text) && (TIME_IN_TEXT.test(text) || LONG_DIGITS.test(text));
}

function hasRelayResultTextPollution(result) {
  if (!result || result.parseStatus === 'unverified') return false;
  return ['name', 'team', 'affiliation', 'note'].some((field) => hasPollutedText(result[field]));
}

function isResultEventOnQualityHold(event) {
  return Boolean(event && (event.qualityHold === true || event.resultsStatus === HOLD_STATUS));
}

function shouldHoldRelayEvent(event, competitionName) {
  if (!event) return false;
  if (isResultEventOnQualityHold(event)) return true;
  if (!isRelayCompetitionText(competitionName, event.event)) return false;
  return (event.results || []).some(hasRelayResultTextPollution);
}

function toRelayQualityHoldEvent(event) {
  const resultCount = Array.isArray(event.results) ? event.results.length : 0;
  return {
    ...event,
    tableType: 'relay',
    resultsStatus: HOLD_STATUS,
    qualityHold: true,
    qualityMessage: HOLD_MESSAGE,
    heldResultCount: Number(event.heldResultCount || resultCount),
    results: [],
  };
}

function holdUnsafeRelayEvents(events, context = {}) {
  return (events || []).map((event) => {
    if (!shouldHoldRelayEvent(event, context.competitionName)) return event;
    return toRelayQualityHoldEvent(event);
  });
}

module.exports = {
  HOLD_MESSAGE,
  HOLD_STATUS,
  TIME_IN_TEXT,
  hasRelayResultTextPollution,
  holdUnsafeRelayEvents,
  isRelayCompetitionText,
  isResultEventOnQualityHold,
  shouldHoldRelayEvent,
  toRelayQualityHoldEvent,
};
