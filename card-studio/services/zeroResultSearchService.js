const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const VERSION = 1;
const DEFAULT_STORE = path.join(__dirname, '..', '..', 'data', 'analytics', 'zero-result-searches.json');

function storePath() {
  return process.env.ZERO_RESULT_SEARCH_STORE || DEFAULT_STORE;
}

function currentDateBucket() {
  return new Date().toISOString().slice(0, 10);
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

function recordZeroResultSearch({ query, surface = 'records' }) {
  const normalized = normalizeQuery(query);
  if (normalized.length < 2) return null;

  const store = readStore();
  const id = fingerprint(normalized);
  if (!id) return null;
  const dateBucket = currentDateBucket();
  const current = store.items[id] || {
    fingerprint: id,
    surface,
    queryLengthBucket: lengthBucket(normalized),
    queryScript: queryScript(normalized),
    count: 0,
    firstSeenDate: dateBucket,
    lastSeenDate: '',
  };

  current.count += 1;
  current.lastSeenDate = dateBucket;
  store.items[id] = current;
  store.totalEvents = Object.values(store.items).reduce((sum, item) => sum + item.count, 0);
  store.updatedDate = dateBucket;
  writeStore(store);
  return current;
}

function getZeroResultSearchSummary({ limit = 20 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number.parseInt(limit, 10) || 20, 100));
  const store = readStore();
  const items = Object.values(store.items)
    .sort((a, b) => b.count - a.count || String(b.lastSeenDate || '').localeCompare(String(a.lastSeenDate || '')))
    .slice(0, safeLimit);

  return {
    version: VERSION,
    totalEvents: store.totalEvents || 0,
    updatedDate: store.updatedDate || '',
    privacy: {
      rawQueryStored: false,
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
