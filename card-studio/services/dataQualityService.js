const resultsStore = require('./resultsStore');
const {
  isIndexableAthleteName,
  normalizeEvent,
  normalizeTeam,
  parseRecord,
} = require('./recordAnalyticsService');
const { classifyTeamStage, isSafeProgressionSegments } = require('./identityPolicy');

const MAX_SAMPLES = 8;
const FUTURE_GRACE_DAYS = 1;

const EVENT_CODE_MAP = {
  11: { gender: 'male', ageBand: 'elementary' },
  12: { gender: 'male', ageBand: 'middle_school' },
  13: { gender: 'male', ageBand: 'high_school' },
  14: { gender: 'male', ageBand: 'university' },
  15: { gender: 'male', ageBand: 'open' },
  21: { gender: 'female', ageBand: 'elementary' },
  22: { gender: 'female', ageBand: 'middle_school' },
  23: { gender: 'female', ageBand: 'high_school' },
  24: { gender: 'female', ageBand: 'university' },
  25: { gender: 'female', ageBand: 'open' },
  32: { gender: 'mixed', ageBand: 'middle_school' },
  33: { gender: 'mixed', ageBand: 'high_school' },
  34: { gender: 'mixed', ageBand: 'university' },
  35: { gender: 'mixed', ageBand: 'open' },
};

const STATUS_ONLY_MARK = /^(dns|dnf|dq|dsq|nm|nt|nr|-)?$/i;

const STANDARD_EVENT_KEYS = new Set([
  '80m',
  '100m',
  '200m',
  '400m',
  '800m',
  '1500m',
  '3000m',
  '5000m',
  '10000m',
  '5km',
  '10km',
  'marathon',
  'half-marathon',
  '100m-hurdles',
  '110m-hurdles',
  '400m-hurdles',
  '100m-relay',
  '400m-relay',
  '800m-relay',
  'high-jump',
  'long-jump',
  'triple-jump',
  'shot-put',
  'discus',
  'javelin',
  'hammer',
  'pole-vault',
  'combined-5\uC885\uACBD\uAE30-\uB0A8',
  'combined-5\uC885\uACBD\uAE30-\uC5EC',
  'combined-7\uC885\uACBD\uAE30',
  'combined-10\uC885\uACBD\uAE30',
  '\uACF5\uB358\uC9C0\uAE30',
]);

let cachedReport = null;
let cachedSignature = '';

function getDataQualityReport() {
  const signature = buildSignature();
  if (cachedReport && cachedSignature === signature) return cachedReport;

  cachedReport = scanResults();
  cachedSignature = signature;
  return cachedReport;
}

function scanResults() {
  const startedAt = Date.now();
  const issues = createIssueBuckets();
  const identityScan = createIdentityScan();
  const totals = {
    competitions: 0,
    events: 0,
    resultRows: 0,
    resultSets: resultsStore.listFilenames().length,
  };

  const todayLimit = startOfDay(addDays(new Date(), FUTURE_GRACE_DAYS));

  for (const filename of resultsStore.listFilenames()) {
    const data = resultsStore.getRawByFilename(filename);
    if (!data) continue;

    totals.competitions += 1;
    const meta = data.meta || {};
    const competitionYear = toYear(meta.year) || toYear(meta.period);
    const competitionLabel = clean(meta.competition_name, 220);
    const competitionId = clean(meta.competition_id || meta.to_cd || filename, 120);

    for (const event of data.events || []) {
      totals.events += 1;
      const eventLabel = clean(event.event, 160);
      const divisionLabel = clean(event.division, 120);
      const eventCode = decodeEventCode(eventLabel);
      const eventMeta = normalizeEvent(eventLabel, divisionLabel);
      const context = {
        filename,
        competitionId,
        competitionLabel,
        event: eventCode?.eventLabel || eventLabel,
        rawEvent: eventCode ? eventLabel : undefined,
        division: divisionLabel,
        date: clean(event.date, 20),
      };

      if (eventCode) {
        addIssue(issues.codedEventLabel, {
          ...context,
          code: eventCode.code,
          gender: eventCode.gender,
          ageBand: eventCode.ageBand,
          affectedRows: (event.results || []).length,
        });
      }

      if (!isStandardEvent(eventMeta.eventKey)) {
        addIssue(issues.nonStandardEvent, {
          ...context,
          eventKey: eventMeta.eventKey || '',
        });
      }

      checkEventDate(issues, context, event.date, competitionYear, todayLimit);
      checkWind(issues, context, event.wind);
      scanRanks(issues, context, event.results || []);
      scanDuplicateRows(issues, context, event.results || []);

      for (const result of event.results || []) {
        totals.resultRows += 1;
        const name = clean(result.name, 100);
        const team = clean(result.affiliation, 100);
        collectIdentitySignal(identityScan, {
          name,
          team,
          season: competitionYear,
        });
        if (!isIndexableAthleteName(name)) {
          addIssue(issues.nonIndexableAthleteName, {
            ...context,
            nameClass: classifyNameForIndex(name),
            nameLength: name.length,
          });
        }
        checkRecord(issues, context, result.record, eventMeta.direction);
        if (result.wind) checkWind(issues, context, result.wind);
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    scope: 'data/results/*.json',
    mutation: 'none',
    totals,
    summary: Object.fromEntries(
      Object.entries(issues).map(([key, bucket]) => [key, bucket.count])
    ),
    identity: summarizeIdentityScan(identityScan),
    issues,
  };
}

function checkRecord(issues, context, record, direction) {
  const raw = clean(record, 40);
  const parsed = parseRecord(raw, direction);
  if (!parsed) {
    const statusKind = classifyRecordStatus(raw);
    addIssue(issues.invalidRecord, { ...context, record: raw, statusKind });
    if (statusKind === 'malformed') {
      addIssue(issues.malformedRecord, { ...context, record: raw });
    } else {
      addIssue(issues.statusOnlyRecord, { ...context, record: raw, statusKind });
    }
    return;
  }
  if (!Number.isFinite(parsed.value) || parsed.value <= 0) {
    addIssue(issues.nonPositiveRecord, { ...context, record: raw, value: parsed.value });
  }
}

function checkEventDate(issues, context, value, competitionYear, todayLimit) {
  const raw = clean(value, 30);
  if (!raw) return;

  const date = parseDate(raw);
  if (!date) {
    addIssue(issues.invalidDate, { ...context, date: raw });
    return;
  }

  if (date > todayLimit) {
    addIssue(issues.futureDate, { ...context, date: raw });
  }

  if (competitionYear && date.getUTCFullYear() !== competitionYear) {
    addIssue(issues.yearMismatch, {
      ...context,
      date: raw,
      competitionYear,
      eventYear: date.getUTCFullYear(),
    });
  }
}

function checkWind(issues, context, value) {
  const raw = clean(value, 20);
  if (!raw) return;

  const numeric = Number.parseFloat(raw.replace(/[^\d+-.]/g, ''));
  if (!Number.isFinite(numeric) || Math.abs(numeric) > 10) {
    addIssue(issues.invalidWind, { ...context, wind: raw });
  }
}

function scanRanks(issues, context, results) {
  const seen = new Map();
  const positiveRanks = [];

  results.forEach((result, index) => {
    const rank = Number.parseInt(result.rank, 10);
    if (!Number.isFinite(rank) || rank <= 0) {
      addIssue(issues.invalidRank, { ...context, rowIndex: index, rank: result.rank ?? '' });
      return;
    }

    positiveRanks.push(rank);
    seen.set(rank, (seen.get(rank) || 0) + 1);
  });

  for (const [rank, count] of seen.entries()) {
    if (count > 1) addIssue(issues.duplicateRank, { ...context, rank, count });
  }

  if (positiveRanks.length > 0) {
    const unique = new Set(positiveRanks);
    const maxRank = Math.max(...positiveRanks);
    for (let rank = 1; rank <= maxRank; rank += 1) {
      if (!unique.has(rank)) {
        addIssue(issues.missingRank, { ...context, missingRank: rank });
        break;
      }
    }
  }
}

function scanDuplicateRows(issues, context, results) {
  const seen = new Map();
  for (const result of results) {
    const name = clean(result.name, 100).toLowerCase();
    if (!name) continue;
    const key = [
      context.competitionId,
      context.event,
      context.division,
      name,
      clean(result.record, 40),
    ].join('|');
    seen.set(key, (seen.get(key) || 0) + 1);
  }

  for (const [key, count] of seen.entries()) {
    if (count > 1) {
      addIssue(issues.duplicateAthleteEventRow, {
        ...context,
        duplicateKey: hashKey(key),
        count,
      });
    }
  }
}

function createIssueBuckets() {
  return {
    invalidRecord: bucket('Record cannot be parsed into a positive numeric mark.'),
    nonPositiveRecord: bucket('Record parsed to zero or a negative value.'),
    invalidDate: bucket('Event date cannot be parsed.'),
    futureDate: bucket('Event date is more than one day in the future.'),
    yearMismatch: bucket('Event date year differs from competition year.'),
    invalidWind: bucket('Wind value is not numeric or exceeds +/-10.0 m/s.'),
    invalidRank: bucket('Rank is missing, non-numeric, or zero.'),
    duplicateRank: bucket('Same rank appears more than once in one event.'),
    missingRank: bucket('Rank sequence has a gap.'),
    duplicateAthleteEventRow: bucket('Same competition, event, athlete, and record appears more than once.'),
    nonIndexableAthleteName: bucket('Athlete name is numeric, blank, broken, or otherwise unsafe for search indexing.'),
    codedEventLabel: bucket('Event label starts with a source-specific numeric class code.'),
    nonStandardEvent: bucket('Normalized event key is outside the standard dictionary.'),
    statusOnlyRecord: bucket('Record field has no mark because it represents a race status such as DNS/DNF/DQ/NM/blank.'),
    malformedRecord: bucket('Record field is non-empty but cannot be parsed as a mark or known race status.'),
  };
}

function createIdentityScan() {
  return {
    byName: new Map(),
    totalRowsWithIndexableName: 0,
  };
}

function collectIdentitySignal(scan, { name, team, season }) {
  const safeName = clean(name, 100);
  if (!isIndexableAthleteName(safeName)) return;

  scan.totalRowsWithIndexableName += 1;
  if (!scan.byName.has(safeName)) {
    scan.byName.set(safeName, {
      name: safeName,
      rows: 0,
      teams: new Set(),
      rawTeams: new Set(),
      teamBySeason: new Map(),
      rawTeamBySeason: new Map(),
    });
  }

  const item = scan.byName.get(safeName);
  const normalizedTeam = normalizeTeam(team);
  const rawTeam = clean(team, 100);
  item.rows += 1;
  if (rawTeam) item.rawTeams.add(rawTeam);
  if (normalizedTeam) item.teams.add(normalizedTeam);
  if (season && rawTeam) {
    if (!item.rawTeamBySeason.has(season)) item.rawTeamBySeason.set(season, new Set());
    item.rawTeamBySeason.get(season).add(rawTeam);
  }
  if (season && normalizedTeam) {
    if (!item.teamBySeason.has(season)) item.teamBySeason.set(season, new Set());
    item.teamBySeason.get(season).add(normalizedTeam);
  }
}

function summarizeIdentityScan(scan) {
  let multiTeamNames = 0;
  let multiTeamNamesRaw = 0;
  let sameYearMultiTeamNames = 0;
  let sameYearMultiTeamNamesRaw = 0;
  let progressionCandidateNames = 0;
  let safeProgressionCandidateNames = 0;
  let homonymSuspicionRows = 0;

  for (const item of scan.byName.values()) {
    if (item.rawTeams.size >= 2) multiTeamNamesRaw += 1;
    if ([...item.rawTeamBySeason.values()].some((teams) => teams.size > 1)) {
      sameYearMultiTeamNamesRaw += 1;
    }

    if (item.teams.size < 2) continue;
    multiTeamNames += 1;
    homonymSuspicionRows += item.rows;

    const hasSameYearMultiTeam = [...item.teamBySeason.values()].some((teams) => teams.size > 1);
    if (hasSameYearMultiTeam) {
      sameYearMultiTeamNames += 1;
    } else {
      progressionCandidateNames += 1;
      if (isSafeProgressionName(item)) safeProgressionCandidateNames += 1;
    }
  }

  return {
    policy: 'homonyms_are_not_auto_merged',
    totalIndexableNames: scan.byName.size,
    totalRowsWithIndexableName: scan.totalRowsWithIndexableName,
    multiTeamNames,
    multiTeamNamesRaw,
    homonymNames: sameYearMultiTeamNames,
    homonymNamesRaw: sameYearMultiTeamNamesRaw,
    progressionCandidateNames,
    safeProgressionCandidateNames,
    homonymSuspicionRows,
    note: 'progressionCandidateNames are estimate-only candidates, not merged identities.',
  };
}

function isSafeProgressionName(item) {
  const segments = [...item.teams].map((team) => {
    const years = [];
    for (const [season, teams] of item.teamBySeason.entries()) {
      if (teams.has(team)) years.push(season);
    }
    years.sort((a, b) => a - b);
    return {
      teamLabel: team,
      teamStage: classifyTeamStage(team),
      years,
      fromYear: years[0] || null,
      toYear: years[years.length - 1] || null,
    };
  }).sort((a, b) => (a.fromYear || 0) - (b.fromYear || 0));

  return isSafeProgressionSegments(segments);
}

function classifyNameForIndex(name) {
  const text = clean(name, 100);
  if (!text) return 'blank';
  if (text.length < 2) return 'too_short';
  if (/^\d+$/.test(text)) return 'numeric';
  if (/^[\s._-]+$/.test(text)) return 'punctuation_only';
  return 'non_indexable';
}

function bucket(description) {
  return { count: 0, affectedRows: 0, description, samples: [] };
}

function addIssue(bucketRef, sample) {
  bucketRef.count += 1;
  if (Number.isFinite(sample.affectedRows)) {
    bucketRef.affectedRows += sample.affectedRows;
  }
  if (bucketRef.samples.length < MAX_SAMPLES) {
    bucketRef.samples.push(redactSample(sample));
  }
}

function redactSample(sample) {
  const blocked = new Set(['name', 'affiliation', 'team', 'athleteKey', 'canonicalId']);
  return Object.fromEntries(
    Object.entries(sample).filter(([key]) => !blocked.has(key))
  );
}

function isStandardEvent(eventKey) {
  if (!eventKey) return false;
  if (STANDARD_EVENT_KEYS.has(eventKey)) return true;
  if (eventKey.endsWith('-combined')) {
    return STANDARD_EVENT_KEYS.has(eventKey.replace(/-combined$/, ''));
  }
  return false;
}

function decodeEventCode(eventLabel) {
  const match = clean(eventLabel, 160).match(/^(\d{2})\s+(.+)$/);
  if (!match) return null;
  const code = match[1];
  const mapped = EVENT_CODE_MAP[code];
  if (!mapped) return null;
  return {
    code,
    gender: mapped.gender,
    ageBand: mapped.ageBand,
    eventLabel: match[2].trim(),
  };
}

function classifyRecordStatus(record) {
  const raw = clean(record, 40);
  if (STATUS_ONLY_MARK.test(raw)) return raw ? raw.toLowerCase() : 'blank';
  return 'malformed';
}

function parseDate(value) {
  const match = String(value || '').match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function toYear(value) {
  const match = String(value || '').match(/\b(19|20)\d{2}\b/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function buildSignature() {
  return resultsStore
    .listFilenames()
    .map((filename) => {
      const raw = resultsStore.getRawByFilename(filename);
      const meta = raw?.meta || {};
      return `${filename}:${meta.year || ''}:${(raw?.events || []).length}`;
    })
    .join('|');
}

function hashKey(value) {
  let hash = 0;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return `dq_${Math.abs(hash).toString(36)}`;
}

function clean(value, max = 500) {
  return String(value || '').trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, max);
}

module.exports = {
  getDataQualityReport,
};
