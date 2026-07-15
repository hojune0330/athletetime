'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { buildLegacyNormalizationPlan } = require('./legacyResultNormalizationService');
const { buildLegacyXlsDryRunReport } = require('./legacyXlsConverterDryRunService');
const { readLegacyXlsTextWorkbook } = require('./legacyXlsTextExtractor');
const {
  extractHorizontalPodiumCandidates,
  firstTitle,
} = require('./legacyXlsHorizontalPodiumCandidateExtractor');
const { getIndex } = require('./recordAnalyticsService');
const {
  FORBIDDEN_REPORT_TEXT,
  sanitizeReportString,
  sha256Prefix,
} = require('./legacyReportSafety');

const ROOT = path.join(__dirname, '..', '..');

function resolveOriginalPath(root, sourcePath) {
  if (path.isAbsolute(sourcePath)) return sourcePath;
  return path.join(root, sourcePath);
}

function toSafeSource({ file, sheetName, workbookStatus }) {
  return {
    sourceTier: 'kaaf_backfill_xls_step2_dry_run',
    originalFilename: sanitizeReportString(file.originalFilename),
    sha256Prefix: sha256Prefix(file.sha256),
    sheetName: sanitizeReportString(sheetName),
    sheetLayout: 'horizontal_podium',
    workbookStatus,
  };
}

function byShaPrefix(files) {
  return new Map(files.map((file) => [sha256Prefix(file.sha256), file]));
}

function resultBlockedSheets(workbook) {
  return (workbook.sheets || [])
    .filter((sheet) => sheet.layout !== 'horizontal_podium')
    .filter((sheet) => sheet.layout !== 'summary_only')
    .map((sheet) => ({
      name: sanitizeReportString(sheet.name),
      layout: sheet.layout,
      resultRowEstimate: Number(sheet.resultRowEstimate || 0),
      blockReason: sheet.blockReason || workbook.blockReason,
    }));
}

function horizontalSheets(workbook) {
  return (workbook.sheets || []).filter((sheet) => sheet.layout === 'horizontal_podium');
}

function countBy(items, keyOf) {
  const counts = {};
  for (const item of items) counts[keyOf(item)] = (counts[keyOf(item)] || 0) + 1;
  return counts;
}

function buildDivisionStats(candidates) {
  const divisionKeys = countBy(candidates, (row) => row.divisionMeta?.divisionKey || 'unknown-unspecified');
  const unspecifiedRows = candidates.filter((row) => {
    const meta = row.divisionMeta || {};
    return meta.divisionLevel === 'unspecified' || meta.gender === 'unknown';
  }).length;
  return {
    totalRows: candidates.length,
    unspecifiedRows,
    unspecifiedRatio: candidates.length ? unspecifiedRows / candidates.length : 0,
    divisionKeys,
  };
}

function manualTopRecordDedup() {
  const stats = getIndex().manualTopRecordStats || {};
  return {
    skippedDuplicates: Number(stats.skippedDuplicates || 0),
    appended: Number(stats.appended || 0),
    totalCandidates: Number(stats.totalCandidates || 0),
  };
}

function safeWorkbookEvidence({ workbook, file, status }) {
  return {
    year: Number(workbook.year),
    originalFilename: sanitizeReportString(workbook.originalFilename),
    sha256Prefix: sha256Prefix(file?.sha256 || workbook.sha256Prefix),
    blockReason: workbook.blockReason,
    status,
    promotedSheets: horizontalSheets(workbook).map((sheet) => sanitizeReportString(sheet.name)),
    blockedSheets: resultBlockedSheets(workbook),
  };
}

function extractWorkbookCandidates({ workbookSummary, file, root }) {
  const workbookStatus = workbookSummary.promotable ? 'fully_promotable' : 'partially_promoted';
  const workbook = readLegacyXlsTextWorkbook(resolveOriginalPath(root, file.sourcePath));
  const sheetByName = new Map(workbook.sheets.map((sheet) => [sheet.name, sheet]));
  const competitionName = firstTitle(workbook.sheets[0]?.rows || []) || workbookSummary.originalFilename;
  const candidates = [];

  for (const sheetSummary of horizontalSheets(workbookSummary)) {
    const sheet = sheetByName.get(sheetSummary.name);
    if (!sheet) continue;
    candidates.push(...extractHorizontalPodiumCandidates({
      sheet,
      sheetSummary,
      year: workbookSummary.year,
      competitionName,
      source: toSafeSource({ file, sheetName: sheet.name, workbookStatus }),
    }));
  }
  return candidates;
}

function buildLegacyXlsStep2CandidateDryRun({
  years,
  manifestPath,
  root = ROOT,
  divisionReviewThreshold = 0.2,
}) {
  const layoutReport = buildLegacyXlsDryRunReport({ years, manifestPath, root });
  const plan = buildLegacyNormalizationPlan({ manifestPath, years: layoutReport.years });
  const fileBySha = byShaPrefix(plan.files);
  const candidates = [];
  const blockedWorkbookEvidence = [];
  const candidateWorkbookStatuses = [];

  for (const workbook of layoutReport.workbooks) {
    const file = fileBySha.get(workbook.sha256Prefix);
    const hasHorizontal = horizontalSheets(workbook).length > 0;
    const status = workbook.promotable ? 'fully_promotable' : hasHorizontal ? 'partially_promoted' : 'blocked';

    if (!workbook.promotable) {
      blockedWorkbookEvidence.push(safeWorkbookEvidence({ workbook, file, status }));
    }
    if ((workbook.promotable || status === 'partially_promoted') && file) {
      candidateWorkbookStatuses.push(status);
      candidates.push(...extractWorkbookCandidates({ workbookSummary: workbook, file, root }));
    }
  }

  const divisionStats = buildDivisionStats(candidates);
  const status = divisionStats.unspecifiedRatio > divisionReviewThreshold
    ? 'candidate_dry_run_needs_division_review'
    : 'candidate_dry_run_complete';

  const report = {
    title: 'A-3 Legacy XLS Step 2 Candidate Dry Run',
    status,
    years: layoutReport.years,
    attemptedFiles: layoutReport.attemptedFiles,
    serviceDataMutated: false,
    privatePathsExcluded: true,
    servicePromotionAllowed: false,
    fableApprovedPromotableWorkbooks: layoutReport.promotableWorkbooks,
    blockedWorkbooks: layoutReport.blockedWorkbooks,
    partialPromotedWorkbooks: candidateWorkbookStatuses.filter((item) => item === 'partially_promoted').length,
    candidateRows: candidates.length,
    candidateWorkbooksByStatus: countBy(candidateWorkbookStatuses, (item) => item),
    blockReasonCounts: layoutReport.blockReasonCounts,
    divisionStats,
    manualTopRecordDedup: manualTopRecordDedup(),
    candidates,
    blockedWorkbookEvidence,
  };
  const text = JSON.stringify(report);
  if (FORBIDDEN_REPORT_TEXT.test(text)) {
    throw new Error('Unsafe private text detected in Step 2 candidate dry-run report');
  }
  return report;
}

function renderCountMap(counts) {
  return Object.entries(counts || {})
    .map(([key, value]) => `  - ${key}: ${value}`)
    .join('\n') || '  - 없음';
}

function renderLegacyXlsStep2CandidateMarkdown(report) {
  const skipped = Number(report.manualTopRecordDedup?.skippedDuplicates || 0).toLocaleString('en-US');
  const ratio = `${Math.round(Number(report.divisionStats?.unspecifiedRatio || 0) * 10000) / 100}%`;
  return [
    '# A-3 Legacy XLS Step 2 Candidate Dry Run',
    '',
    `- Years: ${report.years.join(', ')}`,
    `- Attempted XLS files: ${report.attemptedFiles}`,
    `- 45 promotable workbooks boundary: ${report.fableApprovedPromotableWorkbooks}`,
    `- 38 blocked workbooks boundary: ${report.blockedWorkbooks}`,
    `- Partially promoted workbooks: ${report.partialPromotedWorkbooks}`,
    `- Candidate rows: ${report.candidateRows}`,
    `- Service data mutated: ${report.serviceDataMutated ? 'yes' : 'no'}`,
    `- Private paths excluded: ${report.privatePathsExcluded === false ? 'no' : 'yes'}`,
    `- TOP100 skipped duplicates invariant: ${skipped}`,
    `- Division unspecified ratio: ${ratio}`,
    '',
    '## Candidate Workbooks By Status',
    '',
    renderCountMap(report.candidateWorkbooksByStatus),
    '',
    '## Block Reasons',
    '',
    renderCountMap(report.blockReasonCounts),
    '',
    '## Rule',
    '',
    '- Parse only horizontal podium sheets.',
    '- Keep vertical and mixed residual sheets in blocked-workbooks evidence.',
    '- Allow partially promoted horizontal sheets only when blocked residual sheets stay blocked.',
    '- Do not create held-candidate stubs for blocked sheets.',
    '',
  ].join('\n');
}

module.exports = {
  buildLegacyXlsStep2CandidateDryRun,
  renderLegacyXlsStep2CandidateMarkdown,
};
