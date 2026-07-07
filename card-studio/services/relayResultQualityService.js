const TIME_IN_TEXT = /\d{1,2}:\d{2}/;
const LONG_DIGITS = /\d{3,}/;
const NUMERIC_ONLY_TEXT = /^\d+(?:\.\d+)?$/;
const COMBINED_EVENT_TEXT = /10종경기|7종경기|5종경기|혼성경기|decathlon|heptathlon|pentathlon/i;
const RELAY_TEXT = /역전|구간/;
const HOLD_STATUS = 'source_reverify_needed';
const HOLD_MESSAGE = '기록 확인 중이에요';

function cleanText(value) {
  return String(value || '').replace(/\u00a0/g, ' ').trim();
}

function isRelayCompetitionText(...values) {
  return RELAY_TEXT.test(values.map(cleanText).join(' '));
}

function isCombinedEventText(...values) {
  return COMBINED_EVENT_TEXT.test(values.map(cleanText).join(' '));
}

function hasPollutedText(value) {
  const text = cleanText(value);
  return Boolean(text) && (TIME_IN_TEXT.test(text) || LONG_DIGITS.test(text));
}

function hasNumericOnlyName(result) {
  const text = cleanText(result && result.name);
  return Boolean(text) && NUMERIC_ONLY_TEXT.test(text);
}

function hasRelayResultTextPollution(result) {
  if (!result || result.parseStatus === 'unverified') return false;
  return ['name', 'team', 'affiliation', 'note'].some((field) => hasPollutedText(result[field]));
}

function hasResultTextPollution(result) {
  if (!result || result.parseStatus === 'unverified') return false;
  return hasNumericOnlyName(result) || ['name', 'team'].some((field) => hasPollutedText(result[field]));
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

function shouldHoldCombinedEvent(event) {
  if (!event) return false;
  if (isResultEventOnQualityHold(event)) return true;
  if (!isCombinedEventText(event.event, event.division)) return false;
  return (event.results || []).some(hasNumericOnlyName);
}

function toQualityHoldEvent(event, tableType) {
  const resultCount = Array.isArray(event.results) ? event.results.length : 0;
  return {
    ...event,
    tableType,
    resultsStatus: HOLD_STATUS,
    qualityHold: true,
    qualityMessage: HOLD_MESSAGE,
    heldResultCount: Number(event.heldResultCount || resultCount),
    results: [],
  };
}

function toRelayQualityHoldEvent(event) {
  return toQualityHoldEvent(event, 'relay');
}

function holdUnsafeRelayEvents(events, context = {}) {
  return (events || []).map((event) => {
    if (!shouldHoldRelayEvent(event, context.competitionName)) return event;
    return toRelayQualityHoldEvent(event);
  });
}

function holdUnsafeResultEvents(events, context = {}) {
  return (events || []).map((event) => {
    if (shouldHoldRelayEvent(event, context.competitionName)) {
      return toQualityHoldEvent(event, 'relay');
    }
    if (shouldHoldCombinedEvent(event)) {
      return toQualityHoldEvent(event, 'combined');
    }
    return event;
  });
}

module.exports = {
  COMBINED_EVENT_TEXT,
  HOLD_MESSAGE,
  HOLD_STATUS,
  NUMERIC_ONLY_TEXT,
  TIME_IN_TEXT,
  hasResultTextPollution,
  hasRelayResultTextPollution,
  holdUnsafeResultEvents,
  holdUnsafeRelayEvents,
  isCombinedEventText,
  isRelayCompetitionText,
  isResultEventOnQualityHold,
  shouldHoldCombinedEvent,
  shouldHoldRelayEvent,
  toQualityHoldEvent,
  toRelayQualityHoldEvent,
};
