const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const VERSION = 1;
const DEFAULT_STORE = path.join(__dirname, '..', '..', 'data', 'analytics', 'zero-result-searches.json');
const RAW_QUERY_DISTINCT_DAY_THRESHOLD = 3;

function storePath() {
  return process.env.ZERO_RESULT_SEARCH_STORE || DEFAULT_STORE;
}

function currentDateBucket() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDateBucket(value) {
  const bucket = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(bucket) ? bucket : currentDateBucket();
}

function normalizeQuery(query) {
  return String(query || '')
    .trim()
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 100)
    .toLowerCase();
}

function queryScript(value) {
  if (/^[가-힣\s]+$/.test(value)) return 'hangul';
  if (/^[a-z\s]+$/i.test(value)) return 'latin';
  if (/^[0-9\s]+$/.test(value)) return 'numeric';
  return 'mixed';
}

function lengthBucket(value) {
  const length = [...value].length;
  if (length <= 3) return '2-3';
  if (length <= 6) return '4-6';
  if (length <= 10) return '7-10';
  return '11+';
}

function fingerprint(value) {
  const secret = process.env.ZERO_RESULT_SEARCH_SECRET || process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') return null;
  const effectiveSecret = secret || 'athletetime-zero-result-dev-salt';
  return crypto.createHmac('sha256', effectiveSecret).update(value).digest('hex').slice(0, 16);
}

function emptyStore() {
  return { version: VERSION, totalEvents: 0, items: {} };
}

function mergeDateBuckets(item, dateBucket) {
  const buckets = Array.isArray(item.seenDateBuckets) ? item.seenDateBuckets : [];
  const legacyBuckets = [item.firstSeenDate, item.lastSeenDate].filter(Boolean);
  return [...new Set([...legacyBuckets, ...buckets, dateBucket])].sort();
}

function readStore() {
  const filePath = storePath();
  if (!fs.existsSync(filePath)) return emptyStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return parsed && parsed.version === VERSION && parsed.items ? parsed : emptyStore();
  } catch {
    return emptyStore();
  }
}

function writeStore(store) {
  const filePath = storePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf8');
}

function summaryItem(item, { includeRawQuery = false } = {}) {
  const rawQueryStored = typeof item.rawQuery === 'string' && item.rawQuery.length > 0;
  const summarized = {
    fingerprint: item.fingerprint,
    surface: item.surface,
    queryLengthBucket: item.queryLengthBucket,
    queryScript: item.queryScript,
    count: item.count || 0,
    firstSeenDate: item.firstSeenDate || '',
    lastSeenDate: item.lastSeenDate || '',
    distinctSeenDays: Array.isArray(item.seenDateBuckets) ? item.seenDateBuckets.length : 0,
    rawQueryStored,
  };

  if (includeRawQuery && rawQueryStored) {
    summarized.rawQuery = item.rawQuery;
  }

  return summarized;
}

function recordZeroResultSearch({ query, surface = 'records', observedDate } = {}) {
  const normalized = normalizeQuery(query);
  if (normalized.length < 2) return null;

  const store = readStore();
  const id = fingerprint(normalized);
  if (!id) return null;
  const dateBucket = normalizeDateBucket(observedDate);
  const current = store.items[id] || {
    fingerprint: id,
    surface,
    queryLengthBucket: lengthBucket(normalized),
    queryScript: queryScript(normalized),
    count: 0,
    firstSeenDate: dateBucket,
    lastSeenDate: '',
  };

  current.seenDateBuckets = mergeDateBuckets(current, dateBucket);
  current.count = (Number(current.count) || 0) + 1;
  current.firstSeenDate = current.seenDateBuckets[0] || dateBucket;
  current.lastSeenDate = dateBucket;
  current.rawQueryStored = current.seenDateBuckets.length >= RAW_QUERY_DISTINCT_DAY_THRESHOLD;
  if (current.rawQueryStored && !current.rawQuery) {
    current.rawQuery = normalized;
  }
  store.items[id] = current;
  store.totalEvents = Object.values(store.items).reduce((sum, item) => sum + item.count, 0);
  store.updatedDate = dateBucket;
  writeStore(store);
  return summaryItem(current, { includeRawQuery: true });
}

function getZeroResultSearchSummary({ limit = 20, includeRawQuery = false } = {}) {
  const safeLimit = Math.max(1, Math.min(Number.parseInt(limit, 10) || 20, 100));
  const store = readStore();
  const allItems = Object.values(store.items);
  const items = allItems
    .sort((a, b) => b.count - a.count || String(b.lastSeenDate || '').localeCompare(String(a.lastSeenDate || '')))
    .slice(0, safeLimit)
    .map((item) => summaryItem(item, { includeRawQuery }));

  return {
    version: VERSION,
    totalEvents: store.totalEvents || 0,
    updatedDate: store.updatedDate || '',
    privacy: {
      rawQueryStored: allItems.some((item) => typeof item.rawQuery === 'string' && item.rawQuery.length > 0),
      ipStored: false,
      userAgentStored: false,
      userIdStored: false,
    },
    items,
  };
}

module.exports = {
  getZeroResultSearchSummary,
  recordZeroResultSearch,
};
