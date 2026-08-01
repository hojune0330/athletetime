const CANONICAL_KEY = /^at_[a-z0-9_-]{8,80}$/;
const LEGACY_KEY = /^[a-f0-9]{16}$/;
const BASE64URL = /^[A-Za-z0-9_-]{1,240}$/;

class RecordWorkspacePreviewError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

function parseRecordWorkspacePreviewInput(input) {
  if (!isPlainObject(input)) throw new RecordWorkspacePreviewError('INVALID_SUBJECT_KEYS', 400);
  return {
    subjectKeys: parseSubjectKeys(input.subjectKeys),
    cursor: parseCursor(input.cursor),
    limit: parseLimit(input.limit),
  };
}

function parseSubjectKeys(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) {
    throw new RecordWorkspacePreviewError('INVALID_SUBJECT_KEYS', 400);
  }

  const keys = [];
  for (const rawKey of value) {
    if (typeof rawKey !== 'string') throw new RecordWorkspacePreviewError('INVALID_SUBJECT_KEYS', 400);
    const key = rawKey.trim().replace(/[\x00-\x1f\x7f]/g, '');
    if (key.length < 1 || key.length > 120 || (!LEGACY_KEY.test(key) && !CANONICAL_KEY.test(key))) {
      throw new RecordWorkspacePreviewError('INVALID_SUBJECT_KEYS', 400);
    }
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

function parseCursor(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || !BASE64URL.test(value)) {
    throw new RecordWorkspacePreviewError('INVALID_CURSOR', 400);
  }

  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (!isPlainObject(decoded) || !isBoundedText(decoded.date, 20) || !isBoundedText(decoded.id, 120)) {
      throw new RecordWorkspacePreviewError('INVALID_CURSOR', 400);
    }
    return { date: decoded.date, id: decoded.id };
  } catch (error) {
    if (error instanceof RecordWorkspacePreviewError) throw error;
    throw new RecordWorkspacePreviewError('INVALID_CURSOR', 400);
  }
}

function parseLimit(value) {
  if (value === undefined || value === null) return 50;
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new RecordWorkspacePreviewError('LIMIT_OUT_OF_RANGE', 400);
  }
  return value;
}

function encodeCursor(record) {
  return Buffer.from(JSON.stringify({ date: String(record.date || ''), id: String(record.id || '') })).toString('base64url');
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isBoundedText(value, maxLength) {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

module.exports = {
  RecordWorkspacePreviewError,
  encodeCursor,
  parseRecordWorkspacePreviewInput,
};
