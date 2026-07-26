const { assertSafeSourceUrl } = require('./editorialSourceUrlPolicy');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Invalid discovery request');
  return value;
}

function exact(input, fields) {
  if (Object.keys(input).some((key) => !fields.includes(key))) throw new TypeError('Invalid discovery request');
}

function text(input, field, maximum) {
  const value = input[field];
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum || /[\u0000-\u001f\u007f]/u.test(value)) throw new TypeError(`Invalid ${field}`);
  return value.trim();
}

function parseConfirmedSourceBody(value) {
  const input = object(value); exact(input, ['sourceUrl', 'title', 'publisher', 'sourceKind']);
  const sourceKind = text(input, 'sourceKind', 20);
  if (!['official', 'primary', 'secondary'].includes(sourceKind)) throw new TypeError('Invalid sourceKind');
  return { sourceUrl: assertSafeSourceUrl(text(input, 'sourceUrl', 2048)), title: text(input, 'title', 300), publisher: text(input, 'publisher', 200), sourceKind };
}

function parseCalendarLinkBody(value) {
  const input = object(value); exact(input, ['calendarId', 'expectedCalendarVersion']);
  if (typeof input.calendarId !== 'string' || !UUID.test(input.calendarId)) throw new TypeError('Invalid calendarId');
  if (!Number.isInteger(input.expectedCalendarVersion) || input.expectedCalendarVersion <= 0) throw new TypeError('Invalid expectedCalendarVersion');
  return { calendarId: input.calendarId.toLowerCase(), expectedCalendarVersion: input.expectedCalendarVersion };
}

module.exports = { parseCalendarLinkBody, parseConfirmedSourceBody };
