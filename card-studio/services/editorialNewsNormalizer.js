const crypto = require('node:crypto');

const { assertSafeSourceUrl } = require('./editorialSourceUrlPolicy');
const { QUERY_PROFILES } = require('./editorialNewsQueryProfile');

const TRACKING_PARAMETER_NAMES = new Set(['fbclid', 'gclid', 'igshid']);
const NAMED_ENTITIES = new Map([
  ['amp', '&'], ['apos', "'"], ['gt', '>'], ['lt', '<'], ['nbsp', ' '], ['quot', '"'],
]);
const RELEVANCE_RULES = [
  { tag: 'athletics', score: 50, terms: ['\uc721\uc0c1', '\ub9c8\ub77c\ud1a4', '\ud2b8\ub799', '100m', '100\uff4d', '\ud5c8\ub4e4', '\ub9b4\ub808\uc774', '\ub192\uc774\ub6f0\uae30', '\uba40\ub9ac\ub6f0\uae30', '\ucc3d\ub358\uc9c0\uae30', '\ud3ec\ud658', '\uacbd\ubcf4'] },
  { tag: 'athlete', score: 20, terms: ['\uad6d\uac00\ub300\ud45c', '\uc120\uc218\ub2e8'] },
  { tag: 'competition', score: 25, terms: ['\ub300\ud68c', '\uc120\uc218\uad8c', '\uc120\ubc1c\uc804'] },
  { tag: 'record', score: 25, terms: ['\uc2e0\uae30\ub85d', '\uae30\ub85d'] },
  { tag: 'results', score: 20, terms: ['\uacb0\uacfc', '\uc21c\uc704', '\uba54\ub2ec'] },
  { tag: 'schedule', score: 20, terms: ['\uc77c\uc815', '\uac1c\ucd5c', '\uc608\uc120'] },
];
const ATHLETICS_PROFILE_KEYS = new Set(Object.keys(QUERY_PROFILES));

function canonicalizeUrl(value) {
  const safeUrl = assertSafeSourceUrl(value);
  const url = new URL(safeUrl);
  url.hash = '';
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/u, '');

  const parameters = [...url.searchParams.entries()]
    .filter(([name]) => {
      const normalizedName = name.toLowerCase();
      return !normalizedName.startsWith('utm_') && !TRACKING_PARAMETER_NAMES.has(normalizedName);
    })
    .sort(([leftName, leftValue], [rightName, rightValue]) => (
      leftName.localeCompare(rightName) || leftValue.localeCompare(rightValue)
    ));
  url.search = '';
  for (const [name, parameterValue] of parameters) url.searchParams.append(name, parameterValue);
  const normalized = url.toString().replace(/\/$/u, url.pathname === '/' ? '/' : '');
  if (normalized.length > 2048) throw new TypeError('NAVER news item URL is too long');
  return normalized;
}

function firstSafeUrl(values) {
  for (const value of values) {
    if (typeof value !== 'string' || value.trim() === '') continue;
    try {
      return canonicalizeUrl(value);
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
    }
  }
  throw new TypeError('NAVER news item must contain a safe HTTPS source URL');
}

function optionalSafeUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    return canonicalizeUrl(value);
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}

function decodeEntity(_whole, entity) {
  const lowerEntity = entity.toLowerCase();
  if (NAMED_ENTITIES.has(lowerEntity)) return NAMED_ENTITIES.get(lowerEntity);
  const numeric = lowerEntity.startsWith('#x')
    ? Number.parseInt(lowerEntity.slice(2), 16)
    : lowerEntity.startsWith('#') ? Number.parseInt(lowerEntity.slice(1), 10) : Number.NaN;
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 0x10ffff) return `&${entity};`;
  try {
    return String.fromCodePoint(numeric);
  } catch {
    return `&${entity};`;
  }
}

function sanitizeTitle(value) {
  if (typeof value !== 'string') throw new TypeError('NAVER news item title must be a string');
  const plainText = value
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/giu, '')
    .replace(/<[^>]*>/gu, '')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/giu, decodeEntity)
    .replace(/[\u0000-\u001f\u007f-\u009f]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  if (plainText === '') throw new TypeError('NAVER news item title must not be empty');
  return plainText.slice(0, 300);
}

function parsePublishedAt(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError('NAVER news item pubDate must be a valid date');
  }
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/u.exec(value);
  if (dateOnly) {
    const [year, month, day] = dateOnly.slice(1).map(Number);
    const expected = new Date(Date.UTC(year, month - 1, day));
    if (expected.getUTCFullYear() !== year || expected.getUTCMonth() !== month - 1 || expected.getUTCDate() !== day) {
      throw new TypeError('NAVER news item pubDate must be a valid date');
    }
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) throw new TypeError('NAVER news item pubDate must be a valid date');
  return new Date(timestamp).toISOString();
}

function classifyEditorialNewsRelevance(queryKeys, title) {
  if (arguments.length !== 2) throw new TypeError('relevance classification accepts only queryKeys and title');
  if (!Array.isArray(queryKeys) || queryKeys.some((queryKey) => typeof queryKey !== 'string')) {
    throw new TypeError('queryKeys must be an array of strings');
  }
  if (typeof title !== 'string') throw new TypeError('title must be a string');

  const normalizedTitle = title.toLowerCase().replace(/\s+/gu, ' ').trim();
  const normalizedQueryKeys = queryKeys.map((queryKey) => queryKey.toLowerCase().replace(/\s+/gu, ' ').trim());
  const hasTerm = (terms, text) => terms.some((term) => text.includes(term));
  const athleticsRule = RELEVANCE_RULES[0];
  const isAthleticsTitle = hasTerm(athleticsRule.terms, normalizedTitle)
    || normalizedQueryKeys.some((queryKey) => ATHLETICS_PROFILE_KEYS.has(queryKey))
    || normalizedQueryKeys.some((queryKey) => (
      hasTerm(athleticsRule.terms, queryKey) && normalizedTitle.includes(queryKey)
    ));
  if (!isAthleticsTitle) return { relevanceScore: 0, relevanceTags: [] };

  const matchedRules = RELEVANCE_RULES.filter((rule) => (
    rule.tag === 'athletics' || hasTerm(rule.terms, normalizedTitle)
  ));
  return {
    relevanceScore: Math.min(100, matchedRules.reduce((score, rule) => score + rule.score, 0)),
    relevanceTags: matchedRules.map((rule) => rule.tag),
  };
}

function normalizeNaverNewsItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new TypeError('NAVER news item must be an object');
  }
  const originalUrl = firstSafeUrl([item.originallink, item.link]);
  const candidateNaverUrl = optionalSafeUrl(item.link);
  const naverUrl = candidateNaverUrl === originalUrl ? null : candidateNaverUrl;
  const title = sanitizeTitle(item.title);
  const publishedAt = parsePublishedAt(item.pubDate);

  return {
    canonicalUrlHash: crypto.createHash('sha256').update(originalUrl).digest('hex'),
    originalUrl,
    naverUrl,
    title,
    publishedAt,
  };
}

module.exports = { classifyEditorialNewsRelevance, normalizeNaverNewsItem };
