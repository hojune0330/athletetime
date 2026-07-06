const recordAnalyticsService = require('./recordAnalyticsService');

const DEFAULT_LIMIT = 8;
const DEFAULT_MIN_GROUP_SIZE = 5;
const DEFAULT_WINDOW_DAYS = 90;

const REGION_PATTERNS = [
  ['seoul', '\uC11C\uC6B8'],
  ['busan', '\uBD80\uC0B0'],
  ['daegu', '\uB300\uAD6C'],
  ['incheon', '\uC778\uCC9C'],
  ['gwangju', '\uAD11\uC8FC'],
  ['daejeon', '\uB300\uC804'],
  ['ulsan', '\uC6B8\uC0B0'],
  ['sejong', '\uC138\uC885'],
  ['gyeonggi', '\uACBD\uAE30'],
  ['gangwon', '\uAC15\uC6D0'],
  ['chungbuk', '\uCDA9\uBD81|\uCDA9\uCCAD\uBD81'],
  ['chungnam', '\uCDA9\uB0A8|\uCDA9\uCCAD\uB0A8'],
  ['jeonbuk', '\uC804\uBD81|\uC804\uB77C\uBD81'],
  ['jeonnam', '\uC804\uB0A8|\uC804\uB77C\uB0A8'],
  ['gyeongbuk', '\uACBD\uBD81|\uACBD\uC0C1\uBD81'],
  ['gyeongnam', '\uACBD\uB0A8|\uACBD\uC0C1\uB0A8'],
  ['jeju', '\uC81C\uC8FC'],
];

const REGION_LABELS = {
  seoul: 'Seoul',
  busan: 'Busan',
  daegu: 'Daegu',
  incheon: 'Incheon',
  gwangju: 'Gwangju',
  daejeon: 'Daejeon',
  ulsan: 'Ulsan',
  sejong: 'Sejong',
  gyeonggi: 'Gyeonggi',
  gangwon: 'Gangwon',
  chungbuk: 'Chungbuk',
  chungnam: 'Chungnam',
  jeonbuk: 'Jeonbuk',
  jeonnam: 'Jeonnam',
  gyeongbuk: 'Gyeongbuk',
  gyeongnam: 'Gyeongnam',
  jeju: 'Jeju',
  unknown: 'Unknown',
};

function getAnonymousInsights(options = {}) {
  const idx = recordAnalyticsService.getIndex();
  const safeLimit = clampInt(options.limit, DEFAULT_LIMIT, 1, 24);
  const minGroupSize = clampInt(options.minGroupSize, DEFAULT_MIN_GROUP_SIZE, 2, 50);
  const windowDays = clampInt(options.windowDays, DEFAULT_WINDOW_DAYS, 7, 730);
  const season = Number.parseInt(options.season, 10) || idx.latestSeason;

  return {
    generatedAt: new Date().toISOString(),
    scope: 'anonymous_aggregate_only',
    privacy: {
      includesNames: false,
      includesTeams: false,
      includesAthleteKeys: false,
      minGroupSize,
    },
    season,
    eventConcentration: buildEventConcentration(idx, season, safeLimit, minGroupSize),
    regionActivity: buildRegionActivity(idx, season, safeLimit, minGroupSize),
    seasonPulse: buildSeasonPulse(idx, windowDays, minGroupSize),
  };
}

function buildEventConcentration(idx, season, limit, minGroupSize) {
  const byEvent = new Map();
  for (const record of idx.records) {
    if (record.season !== season) continue;
    if (!record.eventKey) continue;
    if (!byEvent.has(record.eventKey)) {
      byEvent.set(record.eventKey, {
        eventKey: record.eventKey,
        eventLabel: record.eventLabel || record.eventKey,
        recordCount: 0,
      });
    }
    byEvent.get(record.eventKey).recordCount += 1;
  }

  return [...byEvent.values()]
    .filter((bucket) => bucket.recordCount >= minGroupSize)
    .sort((a, b) => b.recordCount - a.recordCount || a.eventLabel.localeCompare(b.eventLabel))
    .slice(0, limit);
}

function buildRegionActivity(idx, season, limit, minGroupSize) {
  const byRegion = new Map();
  for (const record of idx.records) {
    if (record.season !== season) continue;
    const regionCode = inferRegionCode(record.team);
    if (!byRegion.has(regionCode)) {
      byRegion.set(regionCode, {
        regionCode,
        regionLabel: REGION_LABELS[regionCode] || REGION_LABELS.unknown,
        recordCount: 0,
        eventKeys: new Set(),
      });
    }
    const bucket = byRegion.get(regionCode);
    bucket.recordCount += 1;
    if (record.eventKey) bucket.eventKeys.add(record.eventKey);
  }

  return [...byRegion.values()]
    .filter((bucket) => bucket.recordCount >= minGroupSize)
    .map((bucket) => ({
      regionCode: bucket.regionCode,
      regionLabel: bucket.regionLabel,
      recordCount: bucket.recordCount,
      eventCount: bucket.eventKeys.size,
    }))
    .sort((a, b) => b.recordCount - a.recordCount || a.regionCode.localeCompare(b.regionCode))
    .slice(0, limit);
}

function buildSeasonPulse(idx, windowDays, minGroupSize) {
  const datedRecords = idx.records
    .map((record) => ({ date: parseDate(record.date), season: record.season }))
    .filter((item) => item.date);

  const latestDate = pickLatestSafeDate(datedRecords.map((item) => item.date));
  if (!latestDate) {
    return { windowDays, buckets: [] };
  }

  const startDate = addDays(latestDate, -(windowDays - 1));
  const byWeek = new Map();

  for (const item of datedRecords) {
    if (item.date < startDate || item.date > latestDate) continue;
    const weekStart = startOfWeek(item.date);
    const key = formatDate(weekStart);
    byWeek.set(key, (byWeek.get(key) || 0) + 1);
  }

  const buckets = [];
  for (const [weekStart, recordCount] of [...byWeek.entries()].sort()) {
    if (recordCount < minGroupSize) continue;
    buckets.push({
      weekStart,
      weekEnd: formatDate(addDays(parseDate(weekStart), 6)),
      recordCount,
    });
  }

  return {
    windowDays,
    from: formatDate(startDate),
    to: formatDate(latestDate),
    buckets,
  };
}

function inferRegionCode(team) {
  const text = String(team || '');
  for (const [code, pattern] of REGION_PATTERNS) {
    if (new RegExp(pattern).test(text)) return code;
  }
  return 'unknown';
}

function pickLatestSafeDate(dates) {
  const todayLimit = addDays(startOfDay(new Date()), 1);
  return dates
    .filter((date) => date <= todayLimit)
    .sort((a, b) => b - a)[0] || null;
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

function startOfDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfWeek(date) {
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(startOfDay(date), offset);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

module.exports = {
  getAnonymousInsights,
};
