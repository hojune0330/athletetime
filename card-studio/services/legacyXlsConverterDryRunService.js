'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  buildLegacyNormalizationPlan,
} = require('./legacyResultNormalizationService');
const {
  readLegacyXlsTextWorkbook,
} = require('./legacyXlsTextExtractor');

const ROOT = path.join(__dirname, '..', '..');
const FORBIDDEN_REPORT_TEXT = /privateStoragePath|sourcePath|data[\\/]sources[\\/]import[\\/]originals|PERSON_NO|birthdate|phone|email|address|secret|010-\d{3,4}-\d{4}/iu;

function normalizeYears(years) {
  return [...new Set(years.map(Number).filter(Number.isInteger))].sort((a, b) => a - b);
}

function sha256Prefix(value) {
  return String(value || '').slice(0, 12);
}

function sanitizeReportString(value) {
  const text = String(value || '');
  return FORBIDDEN_REPORT_TEXT.test(text) ? '[redacted]' : text;
}

function resolveOriginalPath(root, sourcePath) {
  if (path.isAbsolute(sourcePath)) return sourcePath;
  return path.join(root, sourcePath);
}

function sanitizeXlsWorkbookSummary(input) {
  return {
    year: Number(input.year),
    originalFilename: sanitizeReportString(input.originalFilename || ''),
    extension: sanitizeReportString(input.extension || '.xls'),
    sha256Prefix: sha256Prefix(input.sha256 || input.sha256Prefix),
    sheetNames: Array.isArray(input.sheetNames) ? input.sheetNames.map(sanitizeReportString) : [],
    sheetCount: Number(input.sheetCount || (Array.isArray(input.sheetNames) ? input.sheetNames.length : 0)),
    rowCount: Number(input.rowCount || 0),
    status: String(input.status || 'converted_for_dry_run'),
  };
}

function summarizeWorkbook({ file, workbook }) {
  const rowCount = workbook.sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0);
  return sanitizeXlsWorkbookSummary({
    year: file.year,
    originalFilename: file.originalFilename,
    extension: file.extension,
    sha256: file.sha256,
    sheetNames: workbook.sheetNames,
    sheetCount: workbook.sheetNames.length,
    rowCount,
    status: 'converted_for_dry_run',
  });
}

function inspectFile({ file, root }) {
  const absolutePath = resolveOriginalPath(root, file.sourcePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      summary: null,
      error: {
        year: Number(file.year),
        originalFilename: sanitizeReportString(file.originalFilename),
        sha256Prefix: sha256Prefix(file.sha256),
        code: 'ORIGINAL_FILE_NOT_FOUND',
      },
    };
  }

  try {
    const workbook = readLegacyXlsTextWorkbook(absolutePath);
    return {
      summary: summarizeWorkbook({ file, workbook }),
      error: null,
    };
  } catch (error) {
    return {
      summary: null,
      error: {
        year: Number(file.year),
        originalFilename: sanitizeReportString(file.originalFilename),
        sha256Prefix: sha256Prefix(file.sha256),
        code: 'XLS_CONVERSION_FAILED',
        message: sanitizeReportString(error instanceof Error ? error.message : String(error)),
      },
    };
  }
}

function buildLegacyXlsDryRunReport({
  years,
  manifestPath,
  limit = null,
  root = ROOT,
}) {
  const normalizedYears = normalizeYears(years);
  const plan = buildLegacyNormalizationPlan({ manifestPath, years: normalizedYears });
  const queue = plan.files
    .filter((file) => file.status === 'legacy_xls_needs_conversion')
    .slice(0, limit === null ? undefined : limit);
  const inspections = queue.map((file) => inspectFile({ file, root }));
  const workbooks = inspections
    .filter((inspection) => inspection.summary)
    .map((inspection) => inspection.summary);
  const errors = inspections
    .filter((inspection) => inspection.error)
    .map((inspection) => inspection.error);

  return {
    title: 'A-3 Legacy XLS Converter Dry Run',
    status: errors.length ? 'dry_run_with_errors' : 'dry_run_complete',
    years: normalizedYears,
    attemptedFiles: queue.length,
    convertedFiles: workbooks.length,
    failedFiles: errors.length,
    totalQueuedFiles: plan.totals.statusCounts.legacy_xls_needs_conversion || 0,
    serviceDataMutated: false,
    privatePathsExcluded: true,
    rawOriginalsTrackedByGit: plan.totals.rawOriginalsTrackedByGit,
    workbooks,
    errors,
  };
}

function renderLegacyXlsDryRunMarkdown(report) {
  return [
    '# A-3 Legacy XLS Converter Dry Run',
    '',
    `- Years: ${report.years.join(', ')}`,
    `- Attempted files: ${report.attemptedFiles}`,
    `- Converted files: ${report.convertedFiles}`,
    `- Failed files: ${report.failedFiles}`,
    `- Total queued .xls files: ${report.totalQueuedFiles}`,
    `- Service data mutated: ${report.serviceDataMutated ? 'yes' : 'no'}`,
    `- Private paths excluded: ${report.privatePathsExcluded ? 'yes' : 'no'}`,
    '',
    '## Workbooks',
    '',
    ...(report.workbooks.length
      ? report.workbooks.map((workbook) => (
        `- ${workbook.year} ${workbook.originalFilename}: ${workbook.sheetCount} sheets, ${workbook.rowCount} rows, sha=${workbook.sha256Prefix}`
      ))
      : ['- Converted workbook 없음']),
    '',
    '## Errors',
    '',
    ...(report.errors.length
      ? report.errors.map((error) => `- ${error.year} ${error.originalFilename}: ${error.code}`)
      : ['- Error 없음']),
    '',
  ].join('\n');
}

module.exports = {
  buildLegacyXlsDryRunReport,
  readLegacyXlsTextWorkbook,
  renderLegacyXlsDryRunMarkdown,
  sanitizeXlsWorkbookSummary,
};
