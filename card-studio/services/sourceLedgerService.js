'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');

const SOURCES_DIR = path.join(config.dirs.data, 'sources');
const DEFAULT_LEDGER_PATH = path.join(SOURCES_DIR, 'ledger.json');

const REQUIRED_FIELDS = Object.freeze([
  'provider',
  'sourceClass',
  'collectionAction',
  'title',
  'sourceUrl',
  'licenseType',
  'reviewStatus',
  'extractionMethod',
]);

const DOWNLOAD_REQUIRED_FIELDS = Object.freeze(['downloadUrl', 'originalFilename']);
const RAW_BODY_FIELDS = Object.freeze(['rawFileBody', 'fileBody', 'body', 'content', 'rawContent']);
const RESTRICTED_FIELDS = Object.freeze([
  'person_no',
  'personNo',
  'birthdate',
  'birthDate',
  'fullBirthdate',
  'residentNumber',
  'contact',
  'address',
  'phone',
]);

function nowIso(options) {
  return options.now || new Date().toISOString();
}

function ledgerPath(options = {}) {
  return options.ledgerPath || DEFAULT_LEDGER_PATH;
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (_) {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function listSources(options = {}) {
  return readJson(ledgerPath(options), []);
}

function readSource(sourceId, options = {}) {
  return listSources(options).find((source) => source.sourceId === sourceId) || null;
}

function updateSource(sourceId, patch = {}, options = {}) {
  const file = ledgerPath(options);
  const sources = listSources({ ledgerPath: file });
  const index = sources.findIndex((source) => source.sourceId === sourceId);
  if (index === -1) {
    return { ok: false, error: { code: 'SOURCE_NOT_FOUND', sourceId } };
  }

  const restrictedField = findRestrictedField(patch);
  if (restrictedField) {
    return { ok: false, error: { code: 'SOURCE_LEDGER_RESTRICTED_FIELD', field: restrictedField } };
  }

  const updated = sanitizeInput({
    ...sources[index],
    ...patch,
    updatedAt: nowIso(options),
  });
  const next = sources.slice();
  next[index] = updated;
  writeJson(file, next);
  return { ok: true, source: updated };
}

function missingFields(input) {
  const missing = REQUIRED_FIELDS.filter((field) => !String(input[field] || '').trim());
  if (input.collectionAction === 'download_file') {
    missing.push(...DOWNLOAD_REQUIRED_FIELDS.filter((field) => !String(input[field] || '').trim()));
  }
  return missing;
}

function findRestrictedField(value) {
  const serialized = JSON.stringify(value || {});
  return RESTRICTED_FIELDS.find((field) => serialized.includes(field)) || null;
}

function sanitizeInput(input) {
  const source = { ...input };
  for (const field of RAW_BODY_FIELDS) {
    delete source[field];
  }
  return source;
}

function sourceDateStamp(isoString) {
  return isoString.slice(0, 10).replace(/-/g, '');
}

function nextSourceId(existing, isoString) {
  const prefix = `SRC-${sourceDateStamp(isoString)}-`;
  const maxSeq = existing.reduce((max, source) => {
    if (!String(source.sourceId || '').startsWith(prefix)) return max;
    const seq = Number.parseInt(source.sourceId.slice(prefix.length), 10);
    return Number.isFinite(seq) && seq > max ? seq : max;
  }, 0);
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

function uniqueKey(source) {
  return [
    source.sourceUrl || '',
    source.downloadUrl || '',
    source.originalFilename || '',
    source.datasetId || '',
  ].join('|');
}

function createSource(input = {}, options = {}) {
  const sourceInput = sanitizeInput({
    ...input,
    licenseType: options.licenseType || input.licenseType || input.licenseGuess,
    extractionMethod: options.extractionMethod || input.extractionMethod || 'source_inventory',
    sha256: options.sha256 || input.sha256 || null,
    fileSize: options.fileSize || input.fileSize || null,
    mimeType: options.mimeType || input.mimeType || null,
  });

  const restrictedField = findRestrictedField(sourceInput);
  if (restrictedField) {
    return { ok: false, error: { code: 'SOURCE_LEDGER_RESTRICTED_FIELD', field: restrictedField } };
  }

  const missing = missingFields(sourceInput);
  if (missing.length > 0) {
    return { ok: false, error: { code: 'SOURCE_LEDGER_VALIDATION_ERROR', missingFields: missing } };
  }

  const file = ledgerPath(options);
  const existing = listSources({ ledgerPath: file });
  const existingSource = existing.find((source) => uniqueKey(source) === uniqueKey(sourceInput));
  if (existingSource) return { ok: true, created: false, source: existingSource };

  const timestamp = nowIso(options);
  const source = {
    sourceId: nextSourceId(existing, timestamp),
    inventoryId: sourceInput.inventoryId || null,
    provider: sourceInput.provider,
    sourceClass: sourceInput.sourceClass,
    sourceType: sourceInput.sourceType || sourceInput.sourceClass,
    collectionAction: sourceInput.collectionAction,
    title: sourceInput.title,
    originalFilename: sourceInput.originalFilename || null,
    sourceUrl: sourceInput.sourceUrl,
    downloadUrl: sourceInput.downloadUrl || null,
    postedAt: sourceInput.postedAt || null,
    collectedAt: sourceInput.collectedAt || timestamp,
    licenseType: sourceInput.licenseType,
    allowedUse: sourceInput.allowedUse || null,
    sha256: sourceInput.sha256,
    fileSize: sourceInput.fileSize,
    mimeType: sourceInput.mimeType,
    extractionMethod: sourceInput.extractionMethod,
    reviewStatus: sourceInput.reviewStatus,
    robotsPosture: sourceInput.robotsPosture || null,
    priorityBatch: sourceInput.priorityBatch || null,
    notes: sourceInput.notes || '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const next = [...existing, source];
  writeJson(file, next);
  return { ok: true, created: true, source };
}

function clearLedgerForTests(options = {}) {
  const file = ledgerPath(options);
  if (fs.existsSync(file)) fs.rmSync(file);
}

module.exports = {
  DEFAULT_LEDGER_PATH,
  RESTRICTED_FIELDS,
  createSource,
  updateSource,
  listSources,
  readSource,
  clearLedgerForTests,
};
