'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  buildLegacyNormalizationPlan,
} = require('./legacyResultNormalizationService');
const {
  readLegacyXlsTextWorkbook,
} = require('./legacyXlsTextExtractor');
const {
  buildLegacyXlsLayoutSummary,
  classifyLegacyXlsWorkbook,
} = require('./legacyXlsLayoutClassifierService');
const {
  FORBIDDEN_REPORT_TEXT,
  sanitizeReportString,
  sha256Prefix,
} = require('./legacyReportSafety');

const ROOT = path.join(__dirname, '..', '..');

function normalizeYears(years) {
  return [...new Set(years.map(Number).filter(Number.isInteger))].sort((a, b) => a - b);
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
  const summary = sanitizeXlsWorkbookSummary({
    year: file.year,
    originalFilename: file.originalFilename,
    extension: file.extension,
    sha256: file.sha256,
    sheetNames: workbook.sheetNames,
    sheetCount: workbook.sheetNames.length,
    rowCount,
    status: 'converted_for_dry_run',
  });
  return {
    ...summary,
    ...classifyLegacyXlsWorkbook(workbook),
  };
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
  const layoutSummary = buildLegacyXlsLayoutSummary(workbooks);

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
    servicePromotionAllowed: false,
    layoutSummary,
    promotableWorkbooks: layoutSummary.promotableWorkbooks,
    blockedWorkbooks: layoutSummary.blockedWorkbooks,
    blockReasonCounts: layoutSummary.blockReasonCounts,
    workbooks,
    errors,
  };
}

function renderCountMap(counts) {
  return Object.entries(counts || {})
    .map(([key, value]) => `  - ${key}: ${value}`)
    .join('\n') || '  - 없음';
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
    `- Service promotion allowed: ${report.servicePromotionAllowed ? 'yes' : 'no'}`,
    `- Private paths excluded: ${report.privatePathsExcluded ? 'yes' : 'no'}`,
    `- Promotable workbooks: ${report.promotableWorkbooks}`,
    `- Blocked workbooks: ${report.blockedWorkbooks}`,
    '',
    '## Layout summary',
    '',
    '### Workbook layouts',
    '',
    renderCountMap(report.layoutSummary?.workbookLayouts),
    '',
    '### Sheet layouts',
    '',
    renderCountMap(report.layoutSummary?.sheetLayouts),
    '',
    '### Block reasons',
    '',
    renderCountMap(report.blockReasonCounts),
    '',
    '### By year',
    '',
    ...Object.entries(report.layoutSummary?.byYear || {}).map(([year, summary]) => (
      `- ${year}: total=${summary.total}, promotable=${summary.promotable}`
    )),
    '',
    '## Workbooks',
    '',
    ...(report.workbooks.length
      ? report.workbooks.map((workbook) => (
        `- ${workbook.year} ${workbook.originalFilename}: ${workbook.workbookLayout}, promotable=${workbook.promotable ? 'yes' : 'no'}, ${workbook.sheetCount} sheets, ${workbook.rowCount} rows, sha=${workbook.sha256Prefix}`
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
  FORBIDDEN_REPORT_TEXT,
};
