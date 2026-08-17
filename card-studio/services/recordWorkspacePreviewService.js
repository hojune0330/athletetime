const recordAnalyticsService = require('./recordAnalyticsService');
const divisionHierarchyService = require('./divisionHierarchyService');
const {
  RecordWorkspacePreviewError,
  encodeCursor,
  parseRecordWorkspacePreviewInput,
} = require('./recordWorkspacePreviewInput');

function createRecordWorkspacePreviewService({ getIndex = recordAnalyticsService.getIndex } = {}) {
  return {
    getRecordWorkspacePreview(input) {
      const request = parseRecordWorkspacePreviewInput(input);
      const index = getIndex();
      const athleteByKey = index?.athleteByKey;
      if (!(athleteByKey instanceof Map)) throw new Error('Public analytics index is unavailable.');

      const subjects = [];
      const unavailableSubjectKeys = [];
      for (const subjectKey of request.subjectKeys) {
        const athlete = athleteByKey.get(subjectKey);
        if (!athlete) {
          unavailableSubjectKeys.push(subjectKey);
          continue;
        }
        subjects.push(toSubject(athlete));
      }

      if (subjects.length === 0) throw new RecordWorkspacePreviewError('WORKSPACE_NOT_AVAILABLE', 404);

      const records = collectPublicRecords(subjects, athleteByKey).sort(sortByDateDescThenIdAsc);
      const pageRecords = pageAfterCursor(records, request.cursor).slice(0, request.limit);
      const hasMore = pageAfterCursor(records, request.cursor).length > pageRecords.length;
      const lastRecord = pageRecords.at(-1);

      return {
        subjects,
        unavailableSubjectKeys,
        identity: buildIdentity(subjects),
        affiliations: buildAffiliations(records),
        coverage: buildCoverage(records, pageRecords, hasMore, lastRecord),
        events: buildEvents(records),
        records: pageRecords.map(toPublicRecord),
      };
    },
  };
}

function collectPublicRecords(subjects, athleteByKey) {
  const recordById = new Map();
  for (const subject of subjects) {
    const athlete = athleteByKey.get(subject.athleteKey);
    for (const record of athlete.records || []) {
      if (record?.id && !recordById.has(record.id)) recordById.set(record.id, record);
    }
  }
  return [...recordById.values()];
}

function pageAfterCursor(records, cursor) {
  if (!cursor) return records;
  return records.filter((record) => isAfterCursor(record, cursor));
}

function isAfterCursor(record, cursor) {
  const date = String(record.date || '');
  if (date < cursor.date) return true;
  if (date > cursor.date) return false;
  return String(record.id || '') > cursor.id;
}

function sortByDateDescThenIdAsc(left, right) {
  const dateOrder = String(right.date || '').localeCompare(String(left.date || ''));
  if (dateOrder !== 0) return dateOrder;
  return String(left.id || '').localeCompare(String(right.id || ''));
}

function toSubject(athlete) {
  return {
    athleteKey: athlete.athleteKey,
    name: cleanText(athlete.name, 100),
    team: cleanText(athlete.team, 100),
    teams: sortedTexts(athlete.teams),
    years: sortedNumbers(athlete.years),
    events: sortedTexts(athlete.events),
    divisions: sortedTexts(athlete.divisions),
    recordCount: Array.isArray(athlete.records) ? athlete.records.length : 0,
    ambiguity: 'name_team',
    note: '',
  };
}

function buildIdentity(subjects) {
  const distinctNames = [...new Set(subjects.map((subject) => subject.name).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  if (distinctNames.length === 1) {
    return { displayName: distinctNames[0], distinctNames, warning: subjects.length > 1 ? 'same_name' : 'none' };
  }
  return { displayName: '선택한 공개 기록', distinctNames, warning: 'different_names' };
}

function buildAffiliations(records) {
  const groups = new Map();
  for (const record of records) {
    const label = cleanText(record.team, 100);
    if (!label) continue;
    const current = groups.get(label) || { label, seasons: new Set(), recordCount: 0 };
    if (Number.isInteger(record.season) && record.season > 0) current.seasons.add(record.season);
    current.recordCount += 1;
    groups.set(label, current);
  }
  const latestSeason = Math.max(0, ...records.map((record) => Number(record.season) || 0));
  const latestGroups = [...groups.values()].filter((group) => group.seasons.has(latestSeason)).length;
  return [...groups.values()]
    .map((group) => {
      const seasons = [...group.seasons].sort((left, right) => left - right);
      const lastObservedSeason = seasons.at(-1) || 0;
      return {
        label: group.label,
        firstObservedSeason: seasons[0] || 0,
        lastObservedSeason,
        recordCount: group.recordCount,
        status: lastObservedSeason < latestSeason ? 'past_observed' : latestGroups > 1 ? 'needs_review' : 'latest_observed',
      };
    })
    .sort((left, right) => right.lastObservedSeason - left.lastObservedSeason || left.label.localeCompare(right.label));
}

function buildCoverage(records, pageRecords, hasMore, lastRecord) {
  const observedSeasons = [...new Set(records.map((record) => Number(record.season)).filter(Number.isInteger))].sort((left, right) => right - left);
  const competitionCount = new Set(records.map((record) => record.competitionId || record.competitionName).filter(Boolean)).size;
  const sourceCount = new Set(records.map((record) => record.source?.sourceId).filter(Boolean)).size;
  const capturedAt = records.map((record) => cleanText(record.source?.capturedAt, 40)).filter(Boolean).sort().at(-1) || null;
  const completeSource = records.every((record) => cleanText(record.source?.sourceUrl, 300) && cleanText(record.source?.capturedAt, 40));
  return {
    totalMatched: records.length,
    returned: pageRecords.length,
    hasMore,
    nextCursor: hasMore && lastRecord ? encodeCursor(lastRecord) : null,
    observedSeasons,
    competitionCount,
    sourceCount,
    lastCapturedAt: capturedAt,
    qualityState: completeSource ? 'visible_index' : 'partial_source',
  };
}

function buildEvents(records) {
  const groups = new Map();
  for (const record of records) {
    const key = cleanText(record.eventKey, 80);
    if (!key) continue;
    const group = groups.get(key) || { eventKey: key, eventLabel: cleanText(record.eventLabel, 160), records: [] };
    group.records.push(record);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({
      eventKey: group.eventKey,
      eventLabel: group.eventLabel,
      recordCount: group.records.length,
      best: toPublicRecord(pickBest(group.records)),
    }))
    .sort((left, right) => right.recordCount - left.recordCount || left.eventLabel.localeCompare(right.eventLabel));
}

function pickBest(records) {
  const comparable = records.filter((record) => record.isComparable && Number.isFinite(record.recordValue));
  if (comparable.length === 0) return null;
  return comparable.reduce((best, record) => {
    const higherIsBetter = record.direction === 'higher';
    const isBetter = higherIsBetter ? record.recordValue > best.recordValue : record.recordValue < best.recordValue;
    return isBetter ? record : best;
  }, comparable[0]);
}

function toPublicRecord(record) {
  return {
    id: record.id,
    athleteKey: record.athleteKey,
    name: cleanText(record.name, 100),
    team: cleanText(record.team, 100),
    season: Number(record.season) || 0,
    competitionName: cleanText(record.competitionName, 220),
    date: cleanText(record.date, 20),
    venue: cleanText(record.venue, 120),
    eventKey: cleanText(record.eventKey, 80),
    eventLabel: cleanText(record.eventLabel, 160),
    divisionKey: cleanText(record.divisionKey, 120),
    divisionLabel: cleanText(record.divisionLabel, 120),
    gender: cleanText(record.gender, 20),
    divisionLevel: cleanText(record.divisionLevel, 40),
    divisionDetail: cleanText(record.divisionDetail, 120) || null,
    sourceDivisionLabel: divisionHierarchyService.toPublicSourceDivisionLabel(record.sourceDivisionLabel),
    phase: cleanText(record.phase, 60),
    record: cleanText(record.recordDisplay, 40),
    recordValue: Number(record.recordValue) || 0,
    direction: record.direction === 'higher' ? 'higher' : 'lower',
    rank: Number.isInteger(record.rank) ? record.rank : null,
    wind: cleanText(record.wind, 20) || null,
    windLegal: Boolean(record.windLegal),
    isComparable: Boolean(record.isComparable),
    note: cleanText(record.note, 120),
    source: toPublicSource(record.source),
  };
}

function toPublicSource(source = {}) {
  const sourceLabel = cleanText(source.sourceLabel, 160);
  return {
    provider: cleanText(source.provider, 80),
    sourceType: cleanText(source.sourceType, 80),
    ...(sourceLabel ? { sourceLabel } : {}),
    sourceUrl: cleanText(source.sourceUrl, 300),
    capturedAt: cleanText(source.capturedAt, 40),
  };
}

function cleanText(value, maxLength) {
  return String(value || '').trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, maxLength);
}

function sortedTexts(values) {
  return [...new Set(Array.from(values || [], (value) => cleanText(value, 160)).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function sortedNumbers(values) {
  return [...new Set(Array.from(values || [], Number).filter(Number.isInteger))].sort((left, right) => left - right);
}

module.exports = {
  createRecordWorkspacePreviewService,
  RecordWorkspacePreviewError,
};
