const crypto = require('crypto');

const resultsStore = require('./resultsStore');
const dataRequestService = require('./dataRequestService');
const { assessPublicIndexRow } = require('./publicIndexQualityService');
const { classifyEvent } = require('../eventClassifier');

const TRACK_EVENT_GROUPS = [
  { group: 'hurdle', pattern: /(h|hurdle|110m|100m|400m).*(h|hurdle)|h$/i },
  { group: 'relay', pattern: /(relay|4x|4X|1600mR|400mR)/i },
  { group: 'middle', pattern: /(800m|1500m|3000m|5000m|10000m|half|marathon|road|10km|5km)/i },
];

const FIELD_HINTS = /(jump|throw|vault|hj|lj|tj|pv|sp|dt|jt|ht|field)/i;
const ROUND_FINAL_HINTS = /(final|championship)/i;
const ROUND_SEMI_HINTS = /(semi)/i;
const ROUND_HEAT_HINTS = /(heat|prelim|qual)/i;

let cachedProfiles = null;
let cachedSignature = '';

function getAthleteProfiles() {
  const signature = _signature();
  if (cachedProfiles && cachedSignature === signature) {
    return cachedProfiles;
  }

  const profiles = _buildProfiles();
  cachedProfiles = profiles;
  cachedSignature = signature;
  return profiles;
}

function getFeaturedProfiles(limit = 6) {
  const safeLimit = _safeLimit(limit, 6);
  return getAthleteProfiles()
    .filter(profile => profile.records.length >= 2)
    .sort((a, b) => {
      const rankA = _bestRank(a.records);
      const rankB = _bestRank(b.records);
      if (rankA !== rankB) return rankA - rankB;
      return b.records.length - a.records.length;
    })
    .slice(0, safeLimit);
}

function searchProfiles(query, limit = 12) {
  const q = _sanitizeQuery(query).toLowerCase();
  if (!q) return [];

  const safeLimit = _safeLimit(limit, 12);
  return getAthleteProfiles()
    .filter(profile => _profileText(profile).includes(q))
    .slice(0, safeLimit);
}

function getProfileById(id) {
  const safeId = _sanitizeQuery(id, 120);
  if (!safeId) return null;
  return getAthleteProfiles().find(profile => profile.id === safeId) || null;
}

function _buildProfiles() {
  const byAthlete = new Map();
  const filenames = resultsStore.listFilenames();
  const activeSuppressions = dataRequestService.getActiveSuppressions();

  for (const filename of filenames) {
    const data = resultsStore.getRawByFilename(filename);
    if (!data) continue;

    const meta = data.meta || {};
    const competitionName = meta.competition_name || '';
    const competitionId = meta.competition_id || meta.to_cd || filename;
    const competitionDate = _dateFromPeriod(meta.period) || String(meta.year || '');
    const competitionVenue = meta.venue || '';
    const sourceUrl = meta.source_url || '';
    const capturedAt = meta.crawled_at || new Date(0).toISOString();

    for (const event of data.events || []) {
      const eventName = event.event || '';
      const pureEvent = _pureEvent(eventName);
      const eventGroup = _eventGroup(pureEvent || eventName);
      const direction = eventGroup === 'field' ? 'higher' : 'lower';
      const phase = _phase(eventName);
      const eventDate = event.date || competitionDate;
      const eventVenue = event.venue || competitionVenue;

      const selectedRows = _selectPublicProfileRows({
        event,
        eventGroup,
        activeSuppressions,
        competitionName,
      });
      for (const { result, name, value } of selectedRows) {
        const team = _clean(result.affiliation);
        const profileKey = `${name}|${team}`;
        const profileId = _stableId(profileKey);
        const recordId = _stableId([
          profileKey,
          competitionId,
          eventName,
          result.rank,
          result.record,
          eventDate,
        ].join('|'));

        if (!byAthlete.has(profileKey)) {
          byAthlete.set(profileKey, {
            id: profileId,
            name,
            team,
            displayGroup: team || 'Public record',
            primaryEvent: pureEvent || eventName,
            sourceNote: 'KAAF public result feed',
            records: [],
          });
        }

        const profile = byAthlete.get(profileKey);
        profile.records.push({
          id: recordId,
          competitionId: String(competitionId || filename),
          competitionName,
          date: eventDate || competitionDate || '',
          venue: eventVenue || competitionVenue || '',
          event: pureEvent || eventName,
          eventGroup,
          phase,
          rank: Number(result.rank) || 0,
          mark: String(result.record || ''),
          value,
          direction,
          wind: result.wind || event.wind || undefined,
          source: {
            provider: 'KAAF',
            sourceType: 'public_result',
            sourceTier: 'L',
            sourceId: `${filename}:${recordId}`,
            sourceUrl,
            capturedAt,
            sourceLabel: '대한육상연맹 공개 경기결과',
            scopeNotice: '공개 경기기록을 모아 정리했어요. 공식 기록 서비스는 아니에요.',
            correctionUrl: '/data-request',
          },
        });

        profile.primaryEvent = _mostCommonEvent(profile.records) || profile.primaryEvent;
      }
    }
  }

  return [...byAthlete.values()]
    .map(profile => ({
      ...profile,
      records: profile.records
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-12),
    }))
    .filter(profile => profile.records.length > 0);
}

function auditPublicIndexEligibility() {
  const audit = {
    inspectedEvents: 0,
    inspectedRows: 0,
    selectedRows: 0,
    quarantinedRows: [],
  };
  const activeSuppressions = dataRequestService.getActiveSuppressions();

  for (const filename of resultsStore.listFilenames()) {
    const data = resultsStore.getRawByFilename(filename);
    if (!data) continue;
    const competitionName = data.meta?.competition_name || '';
    for (const event of data.events || []) {
      audit.inspectedEvents += 1;
      audit.inspectedRows += (event.results || []).length;
      const selectedRows = _selectPublicProfileRows({
        event,
        eventGroup: _eventGroup(_pureEvent(event.event) || event.event),
        activeSuppressions,
        competitionName,
      });
      audit.selectedRows += selectedRows.length;
      for (const { result } of selectedRows) {
        const assessment = assessPublicIndexRow({ eventLabel: event.event, row: result });
        if (assessment.indexable) continue;
        audit.quarantinedRows.push({
          filename,
          competition: competitionName,
          event: String(event.event || ''),
          reason: assessment.reason,
          ...result,
        });
      }
    }
  }

  return audit;
}

function _selectPublicProfileRows({ event, eventGroup, activeSuppressions, competitionName }) {
  const selectedRows = [];
  for (const result of event.results || []) {
    if (!assessPublicIndexRow({ eventLabel: event.event, row: result }).indexable) continue;
    const name = _clean(result.name);
    if (!name) continue;
    if (_checkSuppression(activeSuppressions, {
      name,
      affiliation: result.affiliation,
      competition: competitionName,
    })) continue;
    const value = _parseValue(result.record, eventGroup);
    if (value == null) continue;
    selectedRows.push({ result, name, value });
  }
  return selectedRows;
}

function _signature() {
  const filenames = resultsStore.listFilenames().join('|');
  const suppressions = dataRequestService
    .getActiveSuppressions()
    .map(item => `${item.key}:${item.mode}:${item.since}`)
    .join('|');
  return `${filenames}::${suppressions}`;
}

function _profileText(profile) {
  return [
    profile.name,
    profile.team,
    profile.displayGroup,
    profile.primaryEvent,
    ...profile.records.flatMap(record => [
      record.event,
      record.competitionName,
      record.venue,
      record.mark,
    ]),
  ]
    .join(' ')
    .toLowerCase();
}

function _safeLimit(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(parsed, 30));
}

function _sanitizeQuery(value, max = 100) {
  return String(value || '')
    .trim()
    .replace(/[\x00-\x1f\x7f]/g, '')
    .slice(0, max);
}

function _clean(value) {
  return String(value || '').trim();
}

function _stableId(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 16);
}

function _bestRank(records) {
  return Math.min(...records.map(record => record.rank || 999));
}

function _dateFromPeriod(period) {
  const text = typeof period === 'string' ? period : '';
  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
}

function _pureEvent(eventName) {
  return String(eventName || '')
    .replace(/^(men|women|male|female)\s*/i, '')
    .replace(/\s*(final|semi-final|semi|heat|prelim|qualifying)\s*$/i, '')
    .trim();
}

function _phase(eventName) {
  const text = String(eventName || '');
  if (ROUND_SEMI_HINTS.test(text)) return 'semi-final';
  if (ROUND_HEAT_HINTS.test(text)) return 'heat';
  if (ROUND_FINAL_HINTS.test(text)) return 'final';
  return 'final';
}

function _eventGroup(eventName) {
  const text = String(eventName || '');
  const normalized = text.replace(/\s+/g, '');

  if (FIELD_HINTS.test(normalized)) return 'field';
  if (classifyEvent(text) === 'field') return 'field';
  for (const item of TRACK_EVENT_GROUPS) {
    if (item.pattern.test(normalized)) return item.group;
  }
  if (/h$/i.test(normalized) || /hurdle/i.test(normalized)) return 'hurdle';
  return 'sprint';
}

function _parseValue(mark, eventGroup = 'sprint') {
  const text = String(mark || '').trim();
  if (!text || /^(dns|dnf|dq|nm|-|)$/i.test(text)) return null;

  const numericText = text
    .replace(/,/g, '')
    .replace(/[^\d:.]/g, '');
  if (!numericText) return null;

  if (numericText.includes(':')) {
    const parts = numericText.split(':').map(Number);
    if (parts.some(part => Number.isNaN(part))) return null;
    return parts.reduce((total, part) => total * 60 + part, 0);
  }

  const value = Number.parseFloat(numericText);
  if (!Number.isFinite(value)) return null;
  return eventGroup === 'field' ? value : value;
}

function _checkSuppression(suppressions, { name, affiliation, competition } = {}) {
  if (!Array.isArray(suppressions) || suppressions.length === 0) return null;

  const nm = _clean(name);
  const aff = _clean(affiliation);
  const comp = _clean(competition);

  // mask(검토 중) / hide(검색 비노출) / remove(삭제) 모두 인사이트 후보에서 제외한다.
  // (호출부 line ~97: `if (suppression) continue;` — non-null 이면 무조건 제외)
  const KNOWN_MODES = ['mask', 'hide', 'remove'];
  for (const item of suppressions) {
    if (!item.athleteName || item.athleteName !== nm) continue;
    if (item.affiliation && item.affiliation !== aff) continue;
    if (item.competition && item.competition !== comp) continue;
    return KNOWN_MODES.includes(item.mode) ? item.mode : 'mask';
  }

  return null;
}

function _mostCommonEvent(records) {
  const counts = new Map();
  for (const record of records) {
    counts.set(record.event, (counts.get(record.event) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

module.exports = {
  auditPublicIndexEligibility,
  getAthleteProfiles,
  getFeaturedProfiles,
  searchProfiles,
  getProfileById,
  _parseValue,
  _eventGroup,
  _pureEvent,
  _checkSuppression,
};
