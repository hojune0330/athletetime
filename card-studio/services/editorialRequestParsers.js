const ISSUE_LIMITS = Object.freeze({
  sectionKey: 80,
  title: 200,
  content: 20000,
  author: 50,
  summary: 1000,
  whyNow: 1000,
  discussionQuestion: 500,
  relatedUrl: 2000,
  subjectAgeGroup: 10,
});
const SECTION_KEYS = Object.freeze([
  'competition-preview', 'record-story', 'international', 'road-marathon', 'indoor', 'archive',
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const ISO_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/u;
const PACKAGE_ROLES = Object.freeze(['preview', 'result_context', 'record_story']);

function assertPlainObject(value, label = 'body') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

function assertExactKeys(input, allowed) {
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) throw new TypeError(`unexpected field: ${key}`);
  }
}

function textField(input, field, maximum, optional = false) {
  const value = input[field];
  if (optional && value == null) return undefined;
  if (typeof value !== 'string' || value.trim() === '' || value.trim().length > maximum) {
    throw new TypeError(`${field} must be a non-empty string of at most ${maximum} characters`);
  }
  return value.trim();
}

function positiveInteger(input, field) {
  const value = input[field];
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${field} must be a positive integer`);
  return value;
}

function issueFields(input) {
  const parsed = {};
  for (const [field, maximum] of Object.entries(ISSUE_LIMITS)) {
    parsed[field] = textField(input, field, maximum);
  }
  if (!['adult', 'minor', 'unknown'].includes(parsed.subjectAgeGroup)) {
    throw new TypeError('subjectAgeGroup is not supported');
  }
  return parsed;
}

function parseIssueCreateBody(value) {
  const input = assertPlainObject(value);
  const allowed = [
    'seasonYear', 'competitionId', 'packageRole', 'slot', 'calendarId',
    'expectedCalendarVersion', ...Object.keys(ISSUE_LIMITS),
  ];
  assertExactKeys(input, allowed);
  const parsed = {
    seasonYear: positiveInteger(input, 'seasonYear'),
    slot: positiveInteger(input, 'slot'),
    ...issueFields(input),
  };
  if (parsed.seasonYear < 2000 || parsed.seasonYear > 2200) {
    throw new TypeError('seasonYear must be between 2000 and 2200');
  }
  if (parsed.author !== '애타 편집팀') throw new TypeError('author must be 애타 편집팀');
  if (!SECTION_KEYS.includes(parsed.sectionKey)) throw new TypeError('sectionKey is not supported');
  if (input.competitionId != null) parsed.competitionId = positiveInteger(input, 'competitionId');
  if (input.packageRole != null) parsed.packageRole = textField(input, 'packageRole', 20);
  const hasCalendarId = input.calendarId != null;
  const hasCalendarVersion = input.expectedCalendarVersion != null;
  if (hasCalendarId !== hasCalendarVersion) {
    throw new TypeError('calendarId and expectedCalendarVersion must be provided together');
  }
  if (hasCalendarId) {
    parsed.calendarId = parseUuidParam(input.calendarId);
    parsed.expectedCalendarVersion = positiveInteger(input, 'expectedCalendarVersion');
  }
  return parsed;
}

function parseActionBody(value) {
  const input = assertPlainObject(value);
  assertExactKeys(input, ['expectedVersion', 'note']);
  const parsed = { expectedVersion: positiveInteger(input, 'expectedVersion') };
  const note = textField(input, 'note', 2000, true);
  if (note !== undefined) parsed.note = note;
  return parsed;
}

function parseScheduleBody(value) {
  const input = assertPlainObject(value);
  assertExactKeys(input, ['expectedVersion', 'scheduledFor', 'note']);
  const parsed = parseActionBody({ expectedVersion: input.expectedVersion, ...(input.note == null ? {} : { note: input.note }) });
  return { ...parsed, scheduledFor: parseTimestamp(input.scheduledFor) };
}

function parseTimestamp(value) {
  const scheduledFor = typeof value === 'string' ? value.trim() : '';
  const match = ISO_TIMESTAMP_PATTERN.exec(scheduledFor);
  if (!match) {
    throw new TypeError('scheduledFor must be an ISO timestamp');
  }
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction = '', zone] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const millisecond = Number(fraction.padEnd(3, '0'));
  let offsetMinutes = 0;
  if (zone !== 'Z') {
    const offsetHour = Number(zone.slice(1, 3));
    const offsetMinute = Number(zone.slice(4, 6));
    if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) {
      throw new TypeError('scheduledFor must be an ISO timestamp');
    }
    offsetMinutes = (zone.startsWith('+') ? 1 : -1) * ((offsetHour * 60) + offsetMinute);
  }
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) {
    throw new TypeError('scheduledFor must be an ISO timestamp');
  }
  const local = new Date(0);
  local.setUTCFullYear(year, month - 1, day);
  local.setUTCHours(hour, minute, second, millisecond);
  if (local.getUTCFullYear() !== year || local.getUTCMonth() !== month - 1
    || local.getUTCDate() !== day || local.getUTCHours() !== hour) {
    throw new TypeError('scheduledFor must be an ISO timestamp');
  }
  return new Date(local.getTime() - (offsetMinutes * 60000)).toISOString();
}

function parseCalendarCreateBody(value) {
  const input = assertPlainObject(value);
  assertExactKeys(input, [
    'seasonYear', 'competitionId', 'packageRole', 'sectionKey', 'slot', 'scheduledFor',
  ]);
  const parsed = {
    seasonYear: positiveInteger(input, 'seasonYear'),
    sectionKey: textField(input, 'sectionKey', ISSUE_LIMITS.sectionKey),
    slot: positiveInteger(input, 'slot'),
  };
  if (parsed.seasonYear < 2000 || parsed.seasonYear > 2200) throw new TypeError('seasonYear is not supported');
  if (!SECTION_KEYS.includes(parsed.sectionKey)) throw new TypeError('sectionKey is not supported');
  if (input.competitionId != null) parsed.competitionId = positiveInteger(input, 'competitionId');
  if (input.packageRole != null) {
    parsed.packageRole = textField(input, 'packageRole', 20);
    if (!PACKAGE_ROLES.includes(parsed.packageRole) || !parsed.competitionId) {
      throw new TypeError('packageRole requires a competitionId');
    }
  }
  if (input.scheduledFor != null) parsed.scheduledFor = parseTimestamp(input.scheduledFor);
  return parsed;
}

function parseCalendarUpdateBody(value) {
  const input = assertPlainObject(value);
  const mutable = ['seasonYear', 'competitionId', 'packageRole', 'sectionKey', 'slot', 'scheduledFor'];
  assertExactKeys(input, ['expectedVersion', ...mutable]);
  const parsed = { expectedVersion: positiveInteger(input, 'expectedVersion') };
  if (!mutable.some((field) => input[field] != null)) throw new TypeError('calendar update is empty');
  if (input.seasonYear != null) {
    parsed.seasonYear = positiveInteger(input, 'seasonYear');
    if (parsed.seasonYear < 2000 || parsed.seasonYear > 2200) throw new TypeError('seasonYear is not supported');
  }
  if (input.competitionId != null) parsed.competitionId = positiveInteger(input, 'competitionId');
  if (input.packageRole != null) {
    parsed.packageRole = textField(input, 'packageRole', 20);
    if (!PACKAGE_ROLES.includes(parsed.packageRole)) throw new TypeError('packageRole is not supported');
  }
  if (input.sectionKey != null) {
    parsed.sectionKey = textField(input, 'sectionKey', ISSUE_LIMITS.sectionKey);
    if (!SECTION_KEYS.includes(parsed.sectionKey)) throw new TypeError('sectionKey is not supported');
  }
  if (input.slot != null) parsed.slot = positiveInteger(input, 'slot');
  if (input.scheduledFor != null) parsed.scheduledFor = parseTimestamp(input.scheduledFor);
  return parsed;
}

function parseSourceBody(value) {
  const input = assertPlainObject(value);
  assertExactKeys(input, ['expectedVersion', 'sourceUrl', 'sourceKind', 'title', 'publisher']);
  const parsed = {
    expectedVersion: positiveInteger(input, 'expectedVersion'),
    sourceUrl: textField(input, 'sourceUrl', 2000),
    sourceKind: textField(input, 'sourceKind', 20),
    title: textField(input, 'title', 300),
  };
  if (!['official', 'primary', 'secondary', 'internal'].includes(parsed.sourceKind)) {
    throw new TypeError('sourceKind is not supported');
  }
  const publisher = textField(input, 'publisher', 200, true);
  if (publisher !== undefined) parsed.publisher = publisher;
  return parsed;
}

function parseCorrectionBody(value) {
  const input = assertPlainObject(value);
  const allowed = [
    'expectedVersion', 'reviewNote', 'publicSummary',
    ...Object.keys(ISSUE_LIMITS).filter((key) => !['sectionKey', 'author'].includes(key)),
  ];
  assertExactKeys(input, allowed);
  const parsed = {
    expectedVersion: positiveInteger(input, 'expectedVersion'),
    title: textField(input, 'title', ISSUE_LIMITS.title),
    content: textField(input, 'content', ISSUE_LIMITS.content),
    summary: textField(input, 'summary', ISSUE_LIMITS.summary),
    whyNow: textField(input, 'whyNow', ISSUE_LIMITS.whyNow),
    discussionQuestion: textField(input, 'discussionQuestion', ISSUE_LIMITS.discussionQuestion),
    relatedUrl: textField(input, 'relatedUrl', ISSUE_LIMITS.relatedUrl),
    subjectAgeGroup: textField(input, 'subjectAgeGroup', ISSUE_LIMITS.subjectAgeGroup),
    reviewNote: textField(input, 'reviewNote', 2000),
  };
  const publicSummary = textField(input, 'publicSummary', 300, true);
  if (publicSummary !== undefined) {
    if (/[\u0000-\u001f\u007f]/u.test(publicSummary)) {
      throw new TypeError('publicSummary must be plain text');
    }
    parsed.publicSummary = publicSummary;
  }
  return parsed;
}

function parsePostIdParam(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/u.test(value)) {
    throw new TypeError('postId must be a positive integer');
  }
  const postId = Number(value);
  if (!Number.isSafeInteger(postId)) throw new TypeError('postId must be a safe integer');
  return postId;
}

function parseUuidParam(value) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new TypeError('id must be a UUID');
  }
  return value.toLowerCase();
}

function parseMagazineSlug(value) {
  if (typeof value !== 'string' || !value.startsWith('magazine-')) {
    throw new TypeError('slug is not supported');
  }
  const issueId = parseUuidParam(value.slice('magazine-'.length));
  return `magazine-${issueId}`;
}

module.exports = {
  parseActionBody,
  parseCalendarCreateBody,
  parseCalendarUpdateBody,
  parseCorrectionBody,
  parseIssueCreateBody,
  parseMagazineSlug,
  parsePostIdParam,
  parseScheduleBody,
  parseSourceBody,
  parseUuidParam,
};
