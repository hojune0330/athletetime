'use strict';

const fs = require('fs');
const path = require('path');

const MAP_PATH = path.join(__dirname, '..', '..', 'data', 'identity', 'athlete-map.json');
const IDENTITY_MAP_VERSION = 2;
const AUTO_MERGE_THRESHOLD = 0.85;
const CACHE_STAT_TTL_MS = 5000;
const ALLOWED_ENTRY_FIELDS = new Set([
  'canonicalId',
  'matchConfidence',
  'decisionBasis',
  'sourceRefs',
  'matchedAthleteKeys',
]);
const CANONICAL_ID_PATTERN = /^at_[a-z0-9_-]{8,80}$/;
const ATHLETE_KEY_PATTERN = /^[a-f0-9]{16}$/;
const SOURCE_REF_PATTERN = /^ledger:[a-zA-Z0-9._/-]{1,200}$/;

function parseStringArray(value, pattern, maxItems) {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) return null;

  const parsed = [];
  for (const item of value) {
    if (typeof item !== 'string') return null;
    const normalized = item.trim();
    if (!pattern.test(normalized)) return null;
    parsed.push(normalized);
  }
  return [...new Set(parsed)];
}

function parseCandidate(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (Object.keys(entry).some((key) => !ALLOWED_ENTRY_FIELDS.has(key))) return null;

  const canonicalId = typeof entry.canonicalId === 'string'
    ? entry.canonicalId.trim()
    : '';
  const confidence = entry.matchConfidence;
  const sourceRefs = parseStringArray(entry.sourceRefs, SOURCE_REF_PATTERN, 10);
  const athleteKeys = parseStringArray(entry.matchedAthleteKeys, ATHLETE_KEY_PATTERN, 100);

  if (!CANONICAL_ID_PATTERN.test(canonicalId)) return null;
  if (!Number.isFinite(confidence)) return null;
  if (confidence < AUTO_MERGE_THRESHOLD || confidence > 1) return null;
  if (entry.decisionBasis !== 'manual_verified') return null;
  if (!sourceRefs || !athleteKeys) return null;

  return { canonicalId, athleteKeys };
}

function emptyIndex(rejectedEntries = 0) {
  return {
    byAthleteKey: new Map(),
    count: 0,
    rejectedEntries,
  };
}

function buildIndex(parsed) {
  const entries = Array.isArray(parsed && parsed.entries) ? parsed.entries : [];
  if (!parsed || parsed.version !== IDENTITY_MAP_VERSION) return emptyIndex(entries.length);

  const candidates = [];
  let rejectedEntries = 0;

  for (const entry of entries) {
    const candidate = parseCandidate(entry);
    if (candidate) {
      candidates.push(candidate);
    } else {
      rejectedEntries += 1;
    }
  }

  const canonicalIdCounts = new Map();
  const athleteKeyOwners = new Map();
  for (const candidate of candidates) {
    canonicalIdCounts.set(
      candidate.canonicalId,
      (canonicalIdCounts.get(candidate.canonicalId) || 0) + 1,
    );
    for (const athleteKey of candidate.athleteKeys) {
      const owners = athleteKeyOwners.get(athleteKey) || new Set();
      owners.add(candidate.canonicalId);
      athleteKeyOwners.set(athleteKey, owners);
    }
  }

  const byAthleteKey = new Map();
  let count = 0;
  for (const candidate of candidates) {
    const duplicateCanonicalId = canonicalIdCounts.get(candidate.canonicalId) !== 1;
    const conflictingAthleteKey = candidate.athleteKeys.some(
      (athleteKey) => athleteKeyOwners.get(athleteKey).size !== 1,
    );
    if (duplicateCanonicalId || conflictingAthleteKey) {
      rejectedEntries += 1;
      continue;
    }

    for (const athleteKey of candidate.athleteKeys) {
      byAthleteKey.set(athleteKey, candidate.canonicalId);
    }
    count += 1;
  }

  return { byAthleteKey, count, rejectedEntries };
}

function createResolver({
  mapPath = MAP_PATH,
  statTtlMs = CACHE_STAT_TTL_MS,
} = {}) {
  let cache = null;
  let cacheMtimeMs = -1;
  let cacheCheckedAt = 0;

  function loadIndex() {
    const now = Date.now();
    if (cache && now - cacheCheckedAt < statTtlMs) return cache;
    cacheCheckedAt = now;

    let stat;
    try {
      stat = fs.statSync(mapPath);
    } catch {
      cache = emptyIndex();
      cacheMtimeMs = -1;
      return cache;
    }

    if (cache && stat.mtimeMs === cacheMtimeMs) return cache;

    try {
      cache = buildIndex(JSON.parse(fs.readFileSync(mapPath, 'utf8')));
    } catch {
      cache = emptyIndex();
    }
    cacheMtimeMs = stat.mtimeMs;
    return cache;
  }

  function resolve(input) {
    const index = loadIndex();
    const athleteKey = input && typeof input.athleteKey === 'string'
      ? input.athleteKey
      : '';
    return athleteKey ? index.byAthleteKey.get(athleteKey) || null : null;
  }

  function getStatus() {
    const index = loadIndex();
    return {
      enabled: index.count > 0,
      mappedAthleteKeys: index.byAthleteKey.size,
      matchKeys: 0,
      canonicalGroups: index.count,
      rejectedEntries: index.rejectedEntries,
      mtimeMs: cacheMtimeMs,
      threshold: AUTO_MERGE_THRESHOLD,
    };
  }

  function clearCache() {
    cache = null;
    cacheMtimeMs = -1;
    cacheCheckedAt = 0;
  }

  return { resolve, getStatus, clearCache };
}

const defaultResolver = createResolver();

module.exports = {
  ...defaultResolver,
  createResolver,
  IDENTITY_MAP_VERSION,
  AUTO_MERGE_THRESHOLD,
  MAP_PATH,
};
