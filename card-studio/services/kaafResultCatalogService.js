'use strict';

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

function readManifest(manifestPath = DEFAULT_MANIFEST_PATH) {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function resolveFilePath(file) {
  if (file.filePath && path.isAbsolute(file.filePath)) return file.filePath;
  return path.resolve(config.dirs.root, file.privateStoragePath || file.filePath || '');
}

function magicType(buffer) {
  if (buffer.subarray(0, 4).equals(Buffer.from('%PDF'))) return 'pdf';
  if (buffer.subarray(0, 2).equals(Buffer.from('PK'))) return 'zip_office';
  const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (buffer.subarray(0, 8).equals(ole)) return 'compound_office';
  return 'unknown';
}

function extension(filename) {
  return path.extname(String(filename || '')).toLowerCase() || '(none)';
}

function normalizeTitle(filename) {
  return String(filename || '')
    .normalize('NFC')
    .replace(/\.[^.]+$/, '')
    .replace(/\(\d+\)$/g, '')
    .replace(/[_`]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^(?:복사본|copy)\s+/i, '')
    .replace(/\s*\d{0,2}(?:(?:19|20)\d{6}|\d{6})+$/g, '')
    .replace(/\s*\(\d+\)$/g, '')
    .replace(/\s*\d{0,2}(?:(?:19|20)\d{6}|\d{6})+$/g, '')
    .trim();
}

function seasonFrom(file) {
  if (Number.isInteger(file.year)) return file.year;
  const fromUrl = String(file.downloadUrl || '').match(/\/DATA\/schedule\/(\d{4})\//i);
  if (fromUrl) return Number(fromUrl[1]);
  const fromName = String(file.originalFilename || '').match(/(?:19|20)\d{2}/);
  return fromName ? Number(fromName[0]) : null;
}

function categoryHint(title) {
  if (/마라톤|하프|10km|5km|로드|경보/i.test(title)) return 'road';
  if (/투척|포환|원반|창던|해머|장대|높이|멀리|세단/i.test(title)) return 'field';
  if (/소년|중학|고등|청소년|꿈나무|U18|U20/i.test(title)) return 'youth';
  if (/실업|KTFL/i.test(title)) return 'professional';
  return 'track_field';
}

function makeCanonicalId(file, season, duplicateIndex) {
  const hash = String(file.sha256 || 'unknownhash000').slice(0, 12).toLowerCase();
  const suffix = duplicateIndex > 1 ? `-${duplicateIndex}` : '';
  return `kaaf-result-${season || 'unknown'}-${hash}${suffix}`;
}

function increment(stats, bucket, key) {
  stats[bucket][key] = (stats[bucket][key] || 0) + 1;
}

function toEntry(file, duplicateIndex) {
  const filePath = resolveFilePath(file);
  const body = fs.existsSync(filePath) ? fs.readFileSync(filePath) : Buffer.alloc(0);
  const normalizedTitle = normalizeTitle(file.originalFilename);
  const season = seasonFrom(file);
  const ext = extension(file.originalFilename);
  const competitionName = String(file.competitionName || '').trim();
  const competitionText = [
    competitionName,
    file.competitionPeriod,
    file.venue,
    file.detailUrl,
  ].filter(Boolean).join(' ');
  const categoryText = [competitionName, normalizedTitle].filter(Boolean).join(' ');
  return {
    canonicalId: makeCanonicalId(file, season, duplicateIndex),
    provider: 'KAAF',
    sourceTier: 'kaaf_schedule_result_file',
    originalFilename: file.originalFilename,
    competitionName: competitionName || null,
    competitionPeriod: file.competitionPeriod || null,
    venue: file.venue || null,
    detailUrl: file.detailUrl || null,
    normalizedTitle,
    season,
    extension: ext,
    magicType: magicType(body),
    fileSize: Number(file.fileSize || body.length || 0),
    sha256: file.sha256 || null,
    categoryHint: categoryHint(categoryText),
    sourceUrl: file.sourceUrl || '',
    downloadUrl: file.downloadUrl || '',
    privateStoragePath: file.privateStoragePath || '',
    searchText: [
      competitionText,
      normalizedTitle,
      file.originalFilename,
      season,
      ext,
      file.sourceUrl,
      file.downloadUrl,
    ].join(' ').toLocaleLowerCase(),
  };
}

function duplicateGroups(entries) {
  const byHash = new Map();
  for (const entry of entries) {
    if (!entry.sha256) continue;
    if (!byHash.has(entry.sha256)) byHash.set(entry.sha256, []);
    byHash.get(entry.sha256).push(entry);
  }
  return [...byHash.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([sha256, group]) => ({
      sha256,
      count: group.length,
      canonicalIds: group.map((entry) => entry.canonicalId),
      filenames: group.map((entry) => entry.originalFilename),
    }));
}

function buildCatalog(manifest) {
  const duplicateSeen = new Map();
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  const entries = files.map((file) => {
    const key = [seasonFrom(file), String(file.sha256 || '').slice(0, 12).toLowerCase()].join(':');
    const duplicateIndex = (duplicateSeen.get(key) || 0) + 1;
    duplicateSeen.set(key, duplicateIndex);
    return toEntry(file, duplicateIndex);
  });
  const stats = {
    total: entries.length,
    bySeason: {},
    byExtension: {},
    byMagicType: {},
    byCategoryHint: {},
  };
  for (const entry of entries) {
    increment(stats, 'bySeason', entry.season || 'unknown');
    increment(stats, 'byExtension', entry.extension);
    increment(stats, 'byMagicType', entry.magicType);
    increment(stats, 'byCategoryHint', entry.categoryHint);
  }
  stats.duplicateGroups = duplicateGroups(entries);
  return { entries, stats };
}

function searchCatalog(catalog, filters = {}) {
  const query = String(filters.query || '').trim().toLocaleLowerCase();
  const season = filters.season == null ? null : Number(filters.season);
  const ext = filters.extension ? String(filters.extension).toLowerCase() : null;
  return (catalog.entries || [])
    .filter((entry) => season == null || entry.season === season)
    .filter((entry) => !ext || entry.extension === ext)
    .map((entry) => {
      const matchFields = [];
      if (query && `${entry.normalizedTitle} ${entry.originalFilename}`.toLocaleLowerCase().includes(query)) {
        matchFields.push('title');
      }
      if (query && `${entry.competitionName || ''} ${entry.venue || ''}`.toLocaleLowerCase().includes(query)) {
        matchFields.push('competition');
      }
      if (query && String(entry.season).includes(query)) matchFields.push('season');
      if (query && entry.extension.includes(query)) matchFields.push('extension');
      if (!query || matchFields.length > 0) return { ...entry, matchFields };
      return null;
    })
    .filter(Boolean);
}

module.exports = {
  DEFAULT_MANIFEST_PATH,
  buildCatalog,
  readManifest,
  searchCatalog,
};
