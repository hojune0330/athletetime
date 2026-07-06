'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const DEFAULT_MANIFEST_PATH = path.join(
  config.dirs.root,
  '.ultra',
  'docs',
  'research',
  'kaaf-schedule-results-2010-2026-20260625-manifest.json',
);
const POLICY_PATTERNS = [/recordsport/i, /생활체육/i, /대축전/i, /result\.kaaf\.or\.kr/i];

function readManifest(manifestPath = DEFAULT_MANIFEST_PATH) {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function resolveFilePath(file) {
  if (file.filePath && path.isAbsolute(file.filePath)) return file.filePath;
  const privatePath = file.privateStoragePath || file.filePath;
  return path.resolve(config.dirs.root, privatePath);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function magicType(buffer) {
  if (buffer.subarray(0, 4).equals(Buffer.from('%PDF'))) return 'pdf';
  if (buffer.subarray(0, 2).equals(Buffer.from('PK'))) return 'zip_office';
  if (buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) {
    return 'compound_office';
  }
  return 'unknown';
}

function hasPolicyViolation(file) {
  const searchable = [
    file.originalFilename,
    file.title,
    file.downloadUrl,
    file.sourceUrl,
    file.privateStoragePath,
  ].join(' ');
  return POLICY_PATTERNS.some((pattern) => pattern.test(searchable));
}

function auditManifest(manifest) {
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  const audit = {
    total: files.length,
    existing: 0,
    missing: [],
    sizeMismatches: [],
    hashMismatches: 0,
    hashMismatchFiles: [],
    policyViolations: [],
    magicCounts: {},
  };

  for (const file of files) {
    const filePath = resolveFilePath(file);
    if (!fs.existsSync(filePath)) {
      audit.missing.push({ originalFilename: file.originalFilename, filePath });
      continue;
    }

    const body = fs.readFileSync(filePath);
    audit.existing += 1;
    const type = magicType(body);
    audit.magicCounts[type] = (audit.magicCounts[type] || 0) + 1;

    if (Number(file.fileSize) !== body.length) {
      audit.sizeMismatches.push({ originalFilename: file.originalFilename, expected: file.fileSize, actual: body.length });
    }
    if (file.sha256 && file.sha256 !== sha256(body)) {
      audit.hashMismatches += 1;
      audit.hashMismatchFiles.push(file.originalFilename);
    }
    if (hasPolicyViolation(file)) {
      audit.policyViolations.push({ originalFilename: file.originalFilename, downloadUrl: file.downloadUrl });
    }
  }

  return audit;
}

function queryBuffers(query) {
  return [
    { type: 'content_utf8', body: Buffer.from(query, 'utf8') },
    { type: 'content_utf16le', body: Buffer.from(query, 'utf16le') },
  ];
}

function metadataMatches(file, normalizedQuery) {
  const haystack = [file.originalFilename, file.title, file.downloadUrl, file.sourceUrl]
    .join(' ')
    .toLocaleLowerCase();
  return haystack.includes(normalizedQuery);
}

function searchOriginals(manifest, query, options = {}) {
  const normalizedQuery = String(query || '').trim().toLocaleLowerCase();
  if (!normalizedQuery) return { query, hits: [] };

  const limit = options.limit || 20;
  const hits = [];
  const probes = queryBuffers(String(query).trim());

  for (const file of Array.isArray(manifest.files) ? manifest.files : []) {
    const matchTypes = [];
    if (metadataMatches(file, normalizedQuery)) matchTypes.push('metadata');

    const filePath = resolveFilePath(file);
    if (fs.existsSync(filePath)) {
      const body = fs.readFileSync(filePath);
      for (const probe of probes) {
        if (body.includes(probe.body)) matchTypes.push(probe.type);
      }
    }

    if (matchTypes.length > 0) {
      hits.push({
        originalFilename: file.originalFilename,
        sourceUrl: file.sourceUrl,
        downloadUrl: file.downloadUrl,
        privateStoragePath: file.privateStoragePath,
        year: file.year || null,
        matchTypes: [...new Set(matchTypes)],
      });
      if (hits.length >= limit) break;
    }
  }

  return { query, hits };
}

module.exports = {
  DEFAULT_MANIFEST_PATH,
  auditManifest,
  readManifest,
  searchOriginals,
};
