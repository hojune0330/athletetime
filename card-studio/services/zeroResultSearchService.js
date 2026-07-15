const fs = require('fs');
const path = require('path');
const dataRequestService = require('./dataRequestService');

const VERSION = 2;
const DEFAULT_STORE = path.join(__dirname, '..', '..', 'data', 'analytics', 'zero-result-searches.json');
const SURFACES = ['records', 'competitions', 'insights'];

function storePath() {
  return process.env.ZERO_RESULT_SEARCH_STORE || DEFAULT_STORE;
}

function dateBucket(value) {
  const candidate = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate)
    ? candidate
    : new Date().toISOString().slice(0, 10);
}

function normalizeQuery(query) {
  return String(query || '')
    .trim()
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 100);
}

function queryScript(value) {
  if (/^[가-힣\s]+$/.test(value)) return 'hangul';
  if (/^[a-z\s]+$/i.test(value)) return 'latin';
  if (/^[0-9\s]+$/.test(value)) return 'numeric';
  return 'mixed';
}

function queryLengthBucket(value) {
  const length = [...value].length;
  if (length <= 3) return '2-3';
  if (length <= 6) return '4-6';
  if (length <= 10) return '7-10';
  return '11+';
}

function classify({ query, surface = 'records', observedDate } = {}) {
  const normalized = normalizeQuery(query);
  if (normalized.length < 2) return null;
  return {
    metricDate: dateBucket(observedDate),
    surface: SURFACES.includes(surface) ? surface : 'records',
    queryScript: queryScript(normalized),
    queryLengthBucket: queryLengthBucket(normalized),
  };
}

function emptyStore() {
  return { version: VERSION, totalEvents: 0, items: {} };
}

function readStore() {
  const file = storePath();
  if (!fs.existsSync(file)) return emptyStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed?.version === VERSION && parsed.items ? parsed : emptyStore();
  } catch {
    return emptyStore();
  }
}

function writeStore(store) {
  const file = storePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store, null, 2), 'utf8');
}

function recordFileMetric(metric) {
  const store = readStore();
  const id = [metric.metricDate, metric.surface, metric.queryScript, metric.queryLengthBucket].join('|');
  const current = store.items[id] || { ...metric, count: 0 };
  current.count += 1;
  store.items[id] = current;
  store.totalEvents += 1;
  store.updatedDate = metric.metricDate;
  writeStore(store);
  return current;
}

function recordZeroResultSearch(input = {}) {
  const metric = classify(input);
  if (!metric) return null;
  if (process.env.TEST_DATABASE_URL || process.env.DATABASE_URL) {
    return dataRequestService.recordSearchMetric(metric).then(() => metric);
  }
  return recordFileMetric(metric);
}

function fileSummary(limit) {
  const store = readStore();
  return {
    version: VERSION,
    totalEvents: store.totalEvents || 0,
    updatedDate: store.updatedDate || '',
    privacy: {
      rawQueryStored: false,
      fingerprintStored: false,
      ipStored: false,
      userAgentStored: false,
      userIdStored: false,
    },
    items: Object.values(store.items)
      .sort((a, b) => b.count - a.count || String(b.metricDate).localeCompare(String(a.metricDate)))
      .slice(0, limit),
  };
}

function getZeroResultSearchSummary({ limit = 20 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number.parseInt(limit, 10) || 20, 100));
  if (process.env.TEST_DATABASE_URL || process.env.DATABASE_URL) {
    return dataRequestService.getSearchMetricSummary(safeLimit).then((rows) => {
      const items = rows.map((row) => ({
        metricDate: row.metric_date || row.metricDate,
        surface: row.surface,
        queryScript: row.query_script || row.queryScript,
        queryLengthBucket: row.query_length_bucket || row.queryLengthBucket,
        count: Number(row.count || 0),
      }));
      return {
        version: VERSION,
        totalEvents: Number(rows[0]?.total_count || 0),
        updatedDate: rows[0]?.metric_date || '',
        privacy: {
          rawQueryStored: false,
          fingerprintStored: false,
          ipStored: false,
          userAgentStored: false,
          userIdStored: false,
        },
        items,
      };
    });
  }
  return fileSummary(safeLimit);
}

module.exports = {
  classify,
  getZeroResultSearchSummary,
  recordZeroResultSearch,
};
