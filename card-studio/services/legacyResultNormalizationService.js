'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readXlsxTextWorkbook } = require('./xlsxTextExtractor');

const ROOT = path.join(__dirname, '..', '..');
const DEFAULT_BACKFILL_MANIFEST_PATH = path.join(
  ROOT,
  'data',
  'sources',
  'manifests',
  '20260708-kaaf-backfill-2005-2017-manifest.json',
);

function toPortable(value) {
  return String(value || '').split(path.sep).join('/');
}

function readManifest(manifestPath = DEFAULT_BACKFILL_MANIFEST_PATH) {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function gitTrackedOriginalCount() {
  const result = spawnSync('git', ['ls-files', 'data/sources/import/originals'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) return null;
  return result.stdout.trim() ? result.stdout.trim().split(/\r?\n/).length : 0;
}

function isSpreadsheet(file) {
  return file.extension === '.xls' || file.extension === '.xlsx';
}

function classifySpreadsheet(file) {
  const text = [file.originalFilename, file.archivePathInBackup].join(' ');
  if (/생활체육|마스터즈|대축전/i.test(text)) return 'excluded_non_elite';
  if (file.extension === '.xls') return 'legacy_xls_needs_conversion';
  if (file.extension === '.xlsx') return 'xlsx_inspect_candidate';
  return 'unsupported_extension';
}

function buildLegacyNormalizationPlan({ manifestPath = DEFAULT_BACKFILL_MANIFEST_PATH, years }) {
  const selectedYears = new Set(years.map(Number));
  const manifest = readManifest(manifestPath);
  const files = manifest.files
    .filter((file) => selectedYears.has(Number(file.year)))
    .filter(isSpreadsheet)
    .map((file) => ({
      year: file.year,
      originalFilename: file.originalFilename,
      extension: file.extension,
      sha256: file.sha256,
      sourcePath: toPortable(file.privateStoragePath),
      status: classifySpreadsheet(file),
    }));
  const statusCounts = {};
  for (const file of files) statusCounts[file.status] = (statusCounts[file.status] || 0) + 1;

  return {
    batch: manifest.batch,
    years: [...selectedYears].sort(),
    files,
    totals: {
      spreadsheetFiles: files.length,
      xlsxFiles: files.filter((file) => file.extension === '.xlsx').length,
      xlsFiles: files.filter((file) => file.extension === '.xls').length,
      rawOriginalsTrackedByGit: gitTrackedOriginalCount(),
      statusCounts,
    },
  };
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function formatSeconds(seconds) {
  const rounded = Math.round(seconds * 100) / 100;
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded - hours * 3600) / 60);
  const remaining = rounded - hours * 3600 - minutes * 60;
  const secondText = remaining.toFixed(2).replace(/\.00$/u, '');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${secondText.padStart(5, '0')}`;
  if (minutes > 0) return `${minutes}:${secondText.padStart(5, '0')}`;
  return secondText;
}

function normalizeRecordCell(value) {
  const text = compact(value);
  if (!/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/iu.test(text)) return text;
  const numeric = Number(text);
  if (!Number.isFinite(numeric) || numeric <= 0) return text;
  if (numeric >= 1) {
    if (!text.includes('.') || text.split('.')[1].length <= 3) return text;
    return (Math.round(numeric * 1000) / 1000).toFixed(3).replace(/0+$/u, '').replace(/\.$/u, '');
  }
  return formatSeconds(numeric * 86400);
}

function detectHorizontalPodiumSheet(sheet) {
  for (let index = 0; index < sheet.rows.length; index += 1) {
    const row = (sheet.rows[index] || []).map(compact);
    const joined = row.join(' ');
    if (!joined.includes('성명') || !joined.includes('소속') || !joined.includes('기록')) continue;
    const groups = [];
    for (let column = 0; column < row.length - 2; column += 1) {
      if (row[column] === '성명' && row[column + 1] === '소속' && row[column + 2] === '기록') {
        groups.push({ rank: groups.length + 1, nameColumn: column, affiliationColumn: column + 1, recordColumn: column + 2 });
      }
    }
    if (groups.length < 2) continue;
    const resultRowCount = sheet.rows.slice(index + 1)
      .filter((candidate) => compact((candidate || [])[1]) && compact((candidate || [])[1]) !== '풍향풍속')
      .filter((candidate) => groups.some((group) => compact((candidate || [])[group.recordColumn]))).length;
    return {
      layout: 'horizontal_podium',
      headerRowNumber: index + 1,
      rankGroups: groups,
      resultRowCount,
    };
  }

  return {
    layout: 'unsupported',
    headerRowNumber: null,
    rankGroups: [],
    resultRowCount: 0,
  };
}

function inspectLegacyXlsxWorkbook(filePath) {
  const workbook = readXlsxTextWorkbook(filePath);
  const sheets = workbook.sheets.map((sheet) => ({
    name: sheet.name,
    rows: sheet.rows,
    ...detectHorizontalPodiumSheet(sheet),
  }));
  return {
    filePath,
    sheetNames: workbook.sheetNames,
    sheets,
  };
}

function sourceInfo(sourcePath) {
  return {
    sourceTier: 'kaaf_backfill_original_file',
    privateStoragePath: sourcePath,
    originalFilename: path.posix.basename(sourcePath),
  };
}

function extractHorizontalPodiumResults({ competitionName, sourcePath, workbook, year }) {
  const results = [];
  for (const sheet of workbook.sheets.filter((item) => item.layout === 'horizontal_podium')) {
    for (const row of sheet.rows.slice(sheet.headerRowNumber)) {
      const safeRow = row || [];
      const event = compact(safeRow[1]);
      if (!event || event === '풍향풍속') continue;
      for (const group of sheet.rankGroups) {
        const name = compact(safeRow[group.nameColumn]);
        const affiliation = compact(safeRow[group.affiliationColumn]);
        const record = normalizeRecordCell(safeRow[group.recordColumn]);
        if (!name || !affiliation || !record) continue;
        results.push({
          year,
          competitionName,
          division: sheet.name,
          event: `${sheet.name} ${event}`,
          rank: group.rank,
          name,
          affiliation,
          record,
          note: '',
          newRecord: '',
          source: sourceInfo(sourcePath),
        });
      }
    }
  }
  return results;
}

module.exports = {
  DEFAULT_BACKFILL_MANIFEST_PATH,
  buildLegacyNormalizationPlan,
  extractHorizontalPodiumResults,
  inspectLegacyXlsxWorkbook,
};
