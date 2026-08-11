const DEFAULT_POST_LIST_LIMIT = 20;
const MAX_POST_LIST_LIMIT = 50;
const MAX_POST_LIST_PAGE = 200;

function parseBoundedPositiveInteger(value, fallback, maximum) {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  if (!/^\d+$/.test(text)) return fallback;

  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function normalizePostListPagination(query) {
  const limit = parseBoundedPositiveInteger(query?.limit, DEFAULT_POST_LIST_LIMIT, MAX_POST_LIST_LIMIT);
  const page = parseBoundedPositiveInteger(query?.page, 1, MAX_POST_LIST_PAGE);

  return { limit, offset: (page - 1) * limit, page };
}

module.exports = {
  DEFAULT_POST_LIST_LIMIT,
  MAX_POST_LIST_LIMIT,
  MAX_POST_LIST_PAGE,
  normalizePostListPagination,
};
