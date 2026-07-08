'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_PATH = path.join(__dirname, '..', '..', 'docs', 'data-candidates', 'missing-result-candidate.schema.json');
const CANDIDATE_FILE = 'candidate-records.jsonl';
const SOURCE_FILE = 'source-ledger.jsonl';
const YEAR_CHECKLIST_FILE = 'year-checklist.csv';

const SOURCE_REQUIRED_FIELDS = Object.freeze([
  'sourceId',
  'type',
  'url',
  'title',
  'checkedAt',
  'operator',
  'httpStatus',
  'contentHash',
  'storedOriginalPath',
  'privacyNotes',
]);

const SOURCE_ALLOWED_FIELDS = new Set(SOURCE_REQUIRED_FIELDS);

const SOURCE_TYPES = new Set([
  'kaaf_schedule_page',
  'kaaf_result_attachment',
  'kaaf_top_record_manual_check',
  'kaaf_athlete_history_manual_check',
  'world_athletics_result',
  'jaaf_result',
  'taiwan_federation_result',
  'host_official_result',
  'submitted_proof',
]);

const CHECKLIST_REQUIRED_COLUMNS = Object.freeze([
  'year',
  'domestic_schedule_url',
  'international_schedule_url',
  'status',
  'private_originals_path',
  'source_ledger_count',
  'candidate_count',
  'reviewer',
  'notes',
]);

const CHECKLIST_STATUSES = Object.freeze([
  'not_started',
  'schedule_checked',
  'attachments_downloaded_private',
  'source_ledger_done',
  'candidate_review_needed',
  'candidate_review_done',
  'blocked',
  'complete',
]);

const ALLOWED_RESTRICTED_DROPPED = new Set([
  'sourceAthleteIdentifier',
  'sourceTopRecordIdentifier',
  'birthData',
  'rawSourceMarkup',
  'institutionIdentifier',
  'residentRegistrationNumber',
  'phone',
  'email',
  'sessionMaterial',
]);

const RESTRICTED_KEYS = new Set([
  'person_no',
  'personNo',
  'PERSON_NO1',
  'birthDate',
  'birthdate',
  'birthYear',
  'rawAthleteHistoryHtml',
  'institutionIdentifier',
  'residentRegistrationNumber',
  'phone',
  'email',
  'cookie',
  'sessionId',
  'rawHtml',
  'rawAthleteHistoryJson',
]);

const SAFE_DETAIL_KEYS = new Set([
  'code',
  'rowIndex',
  'lineNumber',
  'field',
  'file',
  'aliasIndex',
  'refIndex',
  'candidateId',
  'firstCandidateId',
  'year',
  'expected',
  'actual',
]);

const SAFE_FIELD_NAMES = new Set([
  ...SOURCE_REQUIRED_FIELDS,
  ...CHECKLIST_REQUIRED_COLUMNS,
  'candidateId',
  'status',
  'discoveryMethod',
  'discoveredAt',
  'operator',
  'competitionName',
  'competitionAliases',
  'date',
  'event',
  'round',
  'place',
  'record',
  'athleteDisplayName',
  'teamDisplayName',
  'category',
  'sourceRefs',
  'restrictedFieldsDropped',
  'notes',
]);

function readSchema() {
  return JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
}

function addError(errors, code, details = {}) {
  errors.push({ code, ...details });
}

function addSafeError(errors, code, details = {}) {
  const safe = {};
  for (const [key, value] of Object.entries(details)) {
    if (key === 'value' || key === 'ref' || key === 'sourceId' || key === 'fieldValue') continue;
    if (!SAFE_DETAIL_KEYS.has(key)) continue;
    if (key === 'field' && !SAFE_FIELD_NAMES.has(value)) continue;
    if ((key === 'candidateId' || key === 'firstCandidateId') && !/^MRC-[0-9]{8}-[0-9]{4}$/.test(String(value))) continue;
    safe[key] = value;
  }
  addError(errors, code, safe);
}

function readJsonl(filePath, label, errors) {
  if (!fs.existsSync(filePath)) {
    addError(errors, 'MISSING_FILE', { file: label });
    return [];
  }

  const text = fs.readFileSync(filePath, 'utf8');
  return text
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter(({ line }) => line.length > 0)
    .map(({ line, lineNumber }) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        addError(errors, 'INVALID_JSONL', { file: label, lineNumber });
        return null;
      }
    })
    .filter(Boolean);
}

function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function readCsv(filePath, label, errors) {
  if (!fs.existsSync(filePath)) {
    addError(errors, 'MISSING_FILE', { file: label });
    return { headers: [], rows: [] };
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    addError(errors, 'EMPTY_CSV', { file: label });
    return { headers: [], rows: [] };
  }

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line);
    return headers.reduce((row, header, cellIndex) => {
      row[header] = cells[cellIndex] ?? '';
      return row;
    }, { __lineNumber: index + 2 });
  });
  return { headers, rows };
}

function validateDate(value) {
  return typeof value === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value);
}

function validateDateTime(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) && /T/.test(value);
}

function valueMatchesType(value, type) {
  if (Array.isArray(type)) return type.some((item) => valueMatchesType(value, item));
  if (type === 'array') return Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'null') return value === null;
  return typeof value === type;
}

function validateCandidateShape(candidate, rowIndex, schema, errors) {
  for (const field of schema.required) {
    if (!Object.prototype.hasOwnProperty.call(candidate, field)) {
      addError(errors, 'MISSING_REQUIRED_FIELD', { rowIndex, field });
    }
  }

  const allowedFields = new Set(Object.keys(schema.properties));
  for (const field of Object.keys(candidate)) {
    if (!allowedFields.has(field)) {
      addSafeError(errors, 'ADDITIONAL_PROPERTY', { rowIndex, field });
    }
  }

  for (const [field, rules] of Object.entries(schema.properties)) {
    if (!Object.prototype.hasOwnProperty.call(candidate, field)) continue;
    const value = candidate[field];

    if (rules.type && !valueMatchesType(value, rules.type)) {
      addError(errors, 'INVALID_FIELD_TYPE', { rowIndex, field });
      continue;
    }
    if (rules.enum && !rules.enum.includes(value)) {
      addSafeError(errors, 'INVALID_ENUM_VALUE', { rowIndex, field, value });
    }
    if (rules.minLength && typeof value === 'string' && value.trim().length < rules.minLength) {
      addError(errors, 'EMPTY_REQUIRED_VALUE', { rowIndex, field });
    }
    if (rules.minItems && Array.isArray(value) && value.length < rules.minItems) {
      addError(errors, 'EMPTY_REQUIRED_ARRAY', { rowIndex, field });
    }
    if (rules.pattern && typeof value === 'string' && !new RegExp(rules.pattern).test(value)) {
      addError(errors, 'INVALID_PATTERN', { rowIndex, field });
    }
    if (rules.minimum && Number.isInteger(value) && value < rules.minimum) {
      addError(errors, 'INVALID_MINIMUM', { rowIndex, field });
    }
  }

  if (candidate.discoveredAt && !validateDateTime(candidate.discoveredAt)) {
    addError(errors, 'INVALID_DATETIME', { rowIndex, field: 'discoveredAt' });
  }
  if (candidate.date && !validateDate(candidate.date)) {
    addError(errors, 'INVALID_DATE', { rowIndex, field: 'date' });
  }
  if (Array.isArray(candidate.competitionAliases)) {
    candidate.competitionAliases.forEach((alias, aliasIndex) => {
      if (typeof alias !== 'string') addError(errors, 'INVALID_ARRAY_ITEM', { rowIndex, field: 'competitionAliases', aliasIndex });
    });
  }
  if (Array.isArray(candidate.sourceRefs)) {
    candidate.sourceRefs.forEach((ref, refIndex) => {
      if (typeof ref !== 'string' || !ref.trim()) {
        addError(errors, 'INVALID_SOURCE_REF', { rowIndex, refIndex });
      }
    });
  }
  if (Array.isArray(candidate.restrictedFieldsDropped)) {
    candidate.restrictedFieldsDropped.forEach((field) => {
      if (!ALLOWED_RESTRICTED_DROPPED.has(field)) {
        addSafeError(errors, 'INVALID_RESTRICTED_DROPPED_FIELD', { rowIndex, value: field });
      }
    });
  }
}

function scanForRestrictedKeys(value, errors, location) {
  if (Array.isArray(value)) {
    value.forEach((item) => scanForRestrictedKeys(item, errors, location));
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    if (key === 'restrictedFieldsDropped') continue;
    if (RESTRICTED_KEYS.has(key)) {
      addError(errors, 'RESTRICTED_FIELD_PRESENT', { location });
    }
    scanForRestrictedKeys(child, errors, location);
  }
}

function scanForSessionMaterial(value, errors, location) {
  const serialized = JSON.stringify(value);
  if (/JSESSIONID\s*=/i.test(serialized) || /Cookie\s*:/i.test(serialized) || /Set-Cookie\s*:/i.test(serialized)) {
    addError(errors, 'SESSION_MATERIAL_PRESENT', { location });
  }
  if (/<html[\s>]/i.test(serialized) || /<table[\s>]/i.test(serialized)) {
    addError(errors, 'RAW_HTML_PRESENT', { location });
  }
}

function validateSources(sources, errors) {
  const ids = new Set();

  sources.forEach((source, index) => {
    const rowIndex = index + 1;
    for (const field of SOURCE_REQUIRED_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(source, field)) {
        addError(errors, 'SOURCE_MISSING_REQUIRED_FIELD', { rowIndex, field });
      }
    }
    for (const field of Object.keys(source)) {
      if (!SOURCE_ALLOWED_FIELDS.has(field)) {
        addSafeError(errors, 'SOURCE_ADDITIONAL_PROPERTY', { rowIndex, field });
      }
    }
    if (!SOURCE_TYPES.has(source.type)) {
      addError(errors, 'SOURCE_INVALID_TYPE', { rowIndex });
    }
    if (typeof source.url !== 'string' || !/^https?:\/\//i.test(source.url)) {
      addError(errors, 'SOURCE_INVALID_URL', { rowIndex });
    }
    if (typeof source.title !== 'string' || !source.title.trim()) {
      addError(errors, 'SOURCE_EMPTY_REQUIRED_VALUE', { rowIndex, field: 'title' });
    }
    if (typeof source.operator !== 'string' || !source.operator.trim()) {
      addError(errors, 'SOURCE_EMPTY_REQUIRED_VALUE', { rowIndex, field: 'operator' });
    }
    if (!validateDateTime(source.checkedAt)) {
      addError(errors, 'SOURCE_INVALID_DATETIME', { rowIndex, field: 'checkedAt' });
    }
    if (!(Number.isInteger(source.httpStatus) || source.httpStatus === null)) {
      addError(errors, 'SOURCE_INVALID_HTTP_STATUS', { rowIndex });
    }
    if (!(typeof source.contentHash === 'string' || source.contentHash === null)) {
      addError(errors, 'SOURCE_INVALID_CONTENT_HASH', { rowIndex });
    }
    if (!(typeof source.storedOriginalPath === 'string' || source.storedOriginalPath === null)) {
      addError(errors, 'SOURCE_INVALID_ORIGINAL_PATH', { rowIndex });
    }
    if (typeof source.privacyNotes !== 'string') {
      addError(errors, 'SOURCE_INVALID_PRIVACY_NOTES', { rowIndex });
    }
    if (typeof source.sourceId !== 'string' || !/^SRC-[0-9]{8}-[0-9]{4}$/.test(source.sourceId)) {
      addSafeError(errors, 'SOURCE_INVALID_ID', { rowIndex, sourceId: source.sourceId });
    }
    if (ids.has(source.sourceId)) {
      addSafeError(errors, 'DUPLICATE_SOURCE_ID', { rowIndex, sourceId: source.sourceId });
    }
    ids.add(source.sourceId);
    scanForRestrictedKeys(source, errors, `source:${rowIndex}`);
    scanForSessionMaterial(source, errors, `source:${rowIndex}`);
  });

  return ids;
}

function validateCandidates(candidates, sourceIds, schema, errors) {
  const candidateIds = new Set();
  const identityKeys = new Map();

  candidates.forEach((candidate, index) => {
    const rowIndex = index + 1;
    validateCandidateShape(candidate, rowIndex, schema, errors);
    scanForRestrictedKeys(candidate, errors, `candidate:${rowIndex}`);
    scanForSessionMaterial(candidate, errors, `candidate:${rowIndex}`);

    if (candidateIds.has(candidate.candidateId)) {
      addSafeError(errors, 'DUPLICATE_CANDIDATE_ID', { rowIndex, candidateId: candidate.candidateId });
    }
    candidateIds.add(candidate.candidateId);

    const identityKey = [
      candidate.athleteDisplayName || '',
      candidate.teamDisplayName || '',
      candidate.competitionName || '',
      candidate.date || '',
      candidate.event || '',
      candidate.record || '',
    ].join('|');
    if (identityKeys.has(identityKey)) {
      addSafeError(errors, 'DUPLICATE_CANDIDATE_FACT', {
        rowIndex,
        candidateId: candidate.candidateId,
        firstCandidateId: identityKeys.get(identityKey),
      });
    } else {
      identityKeys.set(identityKey, candidate.candidateId);
    }

    if (Array.isArray(candidate.sourceRefs)) {
      candidate.sourceRefs.forEach((ref) => {
        if (!sourceIds.has(ref)) {
          addSafeError(errors, 'MISSING_SOURCE_REF', { rowIndex, candidateId: candidate.candidateId, ref });
        }
      });
    }
  });
}

function numericCell(value) {
  const text = String(value ?? '').trim();
  if (!/^[0-9]+$/.test(text)) return null;
  return Number.parseInt(text, 10);
}

function summarizeCandidateYears(candidates) {
  const summary = new Map();

  for (const candidate of candidates) {
    if (!validateDate(candidate.date)) continue;
    const year = Number.parseInt(candidate.date.slice(0, 4), 10);
    const current = summary.get(year) || { candidateCount: 0, sourceRefs: new Set() };
    current.candidateCount += 1;
    if (Array.isArray(candidate.sourceRefs)) {
      candidate.sourceRefs.forEach((ref) => {
        if (typeof ref === 'string' && ref.trim()) current.sourceRefs.add(ref);
      });
    }
    summary.set(year, current);
  }

  return summary;
}

function validateChecklist(headers, rows, errors, options) {
  for (const column of CHECKLIST_REQUIRED_COLUMNS) {
    if (!headers.includes(column)) addError(errors, 'CHECKLIST_MISSING_COLUMN', { column });
  }

  const years = [];
  const seen = new Set();
  const candidateYearSummary = summarizeCandidateYears(options.candidates || []);
  rows.forEach((row) => {
    const year = Number.parseInt(row.year, 10);
    if (!Number.isInteger(year)) {
      addError(errors, 'CHECKLIST_INVALID_YEAR', { lineNumber: row.__lineNumber });
      return;
    }
    if (seen.has(year)) addError(errors, 'CHECKLIST_DUPLICATE_YEAR', { lineNumber: row.__lineNumber, year });
    seen.add(year);
    years.push(year);

    if (!CHECKLIST_STATUSES.includes(row.status)) {
      addError(errors, 'CHECKLIST_INVALID_STATUS', { lineNumber: row.__lineNumber, year });
    }
    if (!String(row.domestic_schedule_url || '').includes(`currentYear=${year}`)) {
      addError(errors, 'CHECKLIST_DOMESTIC_URL_YEAR_MISMATCH', { lineNumber: row.__lineNumber, year });
    }
    if (!String(row.international_schedule_url || '').includes(`currentYear=${year}`)) {
      addError(errors, 'CHECKLIST_INTERNATIONAL_URL_YEAR_MISMATCH', { lineNumber: row.__lineNumber, year });
    }
    if (!String(row.private_originals_path || '').startsWith('data/sources/import/originals/')) {
      addError(errors, 'CHECKLIST_UNSAFE_ORIGINAL_PATH', { lineNumber: row.__lineNumber, year });
    }

    const sourceLedgerCount = numericCell(row.source_ledger_count);
    const candidateCount = numericCell(row.candidate_count);
    if (sourceLedgerCount === null) {
      addError(errors, 'CHECKLIST_INVALID_SOURCE_COUNT', { lineNumber: row.__lineNumber, year });
    }
    if (candidateCount === null) {
      addError(errors, 'CHECKLIST_INVALID_CANDIDATE_COUNT', { lineNumber: row.__lineNumber, year });
    }

    const yearSummary = candidateYearSummary.get(year) || { candidateCount: 0, sourceRefs: new Set() };
    if (candidateCount !== null && candidateCount !== yearSummary.candidateCount) {
      addError(errors, 'CHECKLIST_CANDIDATE_COUNT_MISMATCH', {
        lineNumber: row.__lineNumber,
        year,
        expected: yearSummary.candidateCount,
        actual: candidateCount,
      });
    }
    if (sourceLedgerCount !== null && sourceLedgerCount !== yearSummary.sourceRefs.size) {
      addError(errors, 'CHECKLIST_SOURCE_REF_COUNT_MISMATCH', {
        lineNumber: row.__lineNumber,
        year,
        expected: yearSummary.sourceRefs.size,
        actual: sourceLedgerCount,
      });
    }
  });

  const expectedYears = [];
  for (let year = options.startYear; year <= options.currentYear; year += 1) expectedYears.push(year);
  for (const year of expectedYears) {
    if (!seen.has(year)) addError(errors, 'CHECKLIST_MISSING_YEAR', { year });
  }

  return years.sort((a, b) => a - b);
}

function summarizeErrors(errors) {
  return errors.reduce((summary, error) => {
    summary[error.code] = (summary[error.code] || 0) + 1;
    return summary;
  }, {});
}

function safeBatchName(batchPath) {
  const name = path.basename(batchPath);
  if (
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(name)
    && !/JSESSIONID|Cookie|Set-Cookie|sessionId|person_no|PERSON_NO1|birthDate|birthYear|rawAthleteHistoryHtml|rawHtml/i.test(name)
  ) {
    return name;
  }
  return 'redacted-batch';
}

function validateBatch(batchPath, options = {}) {
  const resolvedBatchPath = path.resolve(batchPath);
  const errors = [];
  const schema = readSchema();
  const startYear = Number.parseInt(options.startYear ?? '2005', 10);
  const currentYear = Number.parseInt(options.currentYear ?? new Date().getFullYear(), 10);

  const sources = readJsonl(path.join(resolvedBatchPath, SOURCE_FILE), SOURCE_FILE, errors);
  const candidates = readJsonl(path.join(resolvedBatchPath, CANDIDATE_FILE), CANDIDATE_FILE, errors);
  const checklist = readCsv(path.join(resolvedBatchPath, YEAR_CHECKLIST_FILE), YEAR_CHECKLIST_FILE, errors);

  const sourceIds = validateSources(sources, errors);
  validateCandidates(candidates, sourceIds, schema, errors);
  const years = validateChecklist(checklist.headers, checklist.rows, errors, { startYear, currentYear, candidates });

  return {
    ok: errors.length === 0,
    batchName: safeBatchName(resolvedBatchPath),
    counts: {
      candidates: candidates.length,
      sources: sources.length,
      years: years.length,
    },
    years,
    errors,
    errorSummary: summarizeErrors(errors),
  };
}

module.exports = {
  validateBatch,
};
