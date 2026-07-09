'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  buildLegacyNormalizationPlan,
} = require('./legacyResultNormalizationService');
const {
  buildPromotedResults,
} = require('./legacyResultPromotionService');

const ROOT = path.join(__dirname, '..', '..');
const DEFAULT_YEARS = Object.freeze([2015, 2016, 2017]);
const DEFAULT_CANDIDATE_FILE = path.join(
  ROOT,
  '.omo',
  'evidence',
  'legacy-results-normalization',
  'track-a-2015-2017',
  'normalized-candidates.jsonl',
);
const DEFAULT_INSPECTION_FILE = path.join(
  ROOT,
  '.omo',
  'evidence',
  'legacy-results-normalization',
  'track-a-2015-2017',
  'xlsx-inspection.json',
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeYears(years = DEFAULT_YEARS) {
  return [...new Set(years.map(Number).filter(Number.isInteger))].sort((a, b) => a - b);
}

function sha256Prefix(value) {
  return String(value || '').slice(0, 12);
}

function countByYear(rows) {
  return rows.reduce((accumulator, row) => {
    const year = String(row.year);
    accumulator[year] = (accumulator[year] || 0) + 1;
    return accumulator;
  }, {});
}

function sanitizeWorkbook(file) {
  return {
    year: Number(file.year),
    originalFilename: file.originalFilename,
    extension: file.extension,
    sha256Prefix: sha256Prefix(file.sha256),
    status: file.status,
  };
}

function sanitizeSheetLayouts(workbook) {
  if (!workbook) return [];
  return workbook.sheetLayouts.map((sheet) => ({
    name: sheet.name,
    layout: sheet.layout,
    resultRowCount: sheet.resultRowCount,
  }));
}

function buildRequiredParserRules() {
  return [
    {
      id: 'strip-indoor-heat-suffix',
      label: '60m 4처럼 조/레인 숫자가 붙은 실내 종목명을 종목+보조정보로 분리',
    },
    {
      id: 'drop-header-pollution',
      label: '성명/소속/기록 헤더 행은 선수 결과로 승격하지 않음',
    },
    {
      id: 'preserve-indoor-event-keys',
      label: '실내 60m와 60mH는 실외 100m 계열과 별도 eventKey로 보존',
    },
    {
      id: 'still-held-on-ambiguity',
      label: '파서가 확신하지 못한 행은 삭제하지 않고 still-held로 보류',
    },
  ];
}

function buildA2HeldIndoorSummary({ candidateFile, inspectionFile }) {
  const inspection = readJson(inspectionFile);
  const promotion = buildPromotedResults({ candidateFile, inspectionFile }).report;
  const byFilename = new Map(inspection.workbooks.map((workbook) => [workbook.originalFilename, workbook]));
  const heldWorkbooks = promotion.heldWorkbooks.map((held) => {
    const workbook = byFilename.get(held.sourceFile);
    const sheetLayouts = sanitizeSheetLayouts(workbook);
    return {
      year: held.year,
      competitionName: held.competitionName,
      sourceFile: held.sourceFile,
      candidateRows: held.candidateRows,
      reason: held.reason,
      unsafeEventRows: held.unsafeEventRows,
      headerRows: held.headerRows,
      indoor: /실내/u.test(`${held.competitionName} ${held.sourceFile}`),
      sheetLayouts,
    };
  });

  return {
    status: heldWorkbooks.length ? 'blocked_pending_parser' : 'clear',
    heldWorkbooks,
    heldRows: promotion.heldRows,
    requiredParserRules: buildRequiredParserRules(),
  };
}

function buildA3XlsQueueSummary({ years }) {
  const plan = buildLegacyNormalizationPlan({ years });
  const workbooks = plan.files
    .filter((file) => file.status === 'legacy_xls_needs_conversion')
    .map(sanitizeWorkbook)
    .sort((a, b) => {
      const yearCompare = a.year - b.year;
      if (yearCompare !== 0) return yearCompare;
      return a.originalFilename.localeCompare(b.originalFilename, 'ko');
    });

  return {
    status: workbooks.length ? 'blocked_pending_converter_approval' : 'clear',
    years: plan.years,
    spreadsheetFiles: plan.totals.spreadsheetFiles,
    xlsxFiles: plan.totals.xlsxFiles,
    xlsFiles: workbooks.length,
    byYear: countByYear(workbooks),
    workbooks,
    requiresDependencyApproval: workbooks.length > 0,
    conversionAttempted: false,
    approvalNote: 'SheetJS 같은 BIFF .xls 파서 의존성은 승인 후 추가하고, 변환 결과는 기존 정규화 파이프라인으로 다시 검증한다.',
    rawOriginalsTrackedByGit: plan.totals.rawOriginalsTrackedByGit,
  };
}

function buildLegacyExpansionPreflightReport({
  years = DEFAULT_YEARS,
  candidateFile = DEFAULT_CANDIDATE_FILE,
  inspectionFile = DEFAULT_INSPECTION_FILE,
} = {}) {
  const normalizedYears = normalizeYears(years);
  const a3XlsQueue = buildA3XlsQueueSummary({ years: normalizedYears });
  return {
    title: 'A-2/A-3 Legacy Expansion Preflight',
    generatedAt: new Date().toISOString(),
    years: normalizedYears,
    a2HeldIndoor: buildA2HeldIndoorSummary({ candidateFile, inspectionFile }),
    a3XlsQueue,
    safety: {
      serviceDataMutated: false,
      rawOriginalsTrackedByGit: a3XlsQueue.rawOriginalsTrackedByGit,
      privatePathsExcluded: true,
      rawOriginalsCommitted: a3XlsQueue.rawOriginalsTrackedByGit > 0,
    },
    nextActions: [
      'A-2 실내 보류 파일 전용 파서를 테스트 먼저 추가한다.',
      'A-3 .xls 변환 의존성은 PR에서 승인받은 뒤 추가한다.',
      '변환 성공 파일만 normalized-candidates -> dry-run promotion -> reviewer 승인 순서로 이동한다.',
      '애매한 파일은 still-held 사유를 남기고 서비스 데이터에는 올리지 않는다.',
    ],
  };
}

function renderByYear(byYear) {
  return Object.entries(byYear).map(([year, count]) => `${year}=${count}`).join(', ');
}

function renderCompetitionLabel(held) {
  const name = String(held.competitionName || '');
  if (name.startsWith(String(held.year))) return name;
  return `${held.year} ${name}`;
}

function renderLegacyExpansionPreflightMarkdown(report) {
  const heldLines = report.a2HeldIndoor.heldWorkbooks.length
    ? report.a2HeldIndoor.heldWorkbooks.map((held) => (
      `- ${renderCompetitionLabel(held)}: ${held.candidateRows}행 보류, `
      + `reason=${held.reason}, headerRows=${held.headerRows}, source=${held.sourceFile}`
    ))
    : ['- 보류 파일 없음'];
  const parserRules = report.a2HeldIndoor.requiredParserRules
    .map((rule) => `- ${rule.id}: ${rule.label}`);

  return [
    '# A-2/A-3 Legacy Expansion Preflight',
    '',
    `- Years: ${report.years.join(', ')}`,
    `- 서비스 데이터는 변경하지 않음: ${report.safety.serviceDataMutated ? '아니오' : '예'}`,
    `- 원본 파일 git 추적 수: ${report.safety.rawOriginalsTrackedByGit}`,
    `- 내부 원본 경로 제외: ${report.safety.privatePathsExcluded ? '예' : '아니오'}`,
    '',
    '## A-2 Held Indoor Workbook',
    '',
    ...heldLines,
    '',
    '### Parser Rules Required',
    '',
    ...parserRules,
    '',
    '## A-3 Legacy XLS Queue',
    '',
    `- Status: ${report.a3XlsQueue.status}`,
    `- .xls files: ${report.a3XlsQueue.xlsFiles}`,
    `- By year: ${renderByYear(report.a3XlsQueue.byYear)}`,
    `- Dependency approval required: ${report.a3XlsQueue.requiresDependencyApproval ? 'yes' : 'no'}`,
    `- Conversion attempted: ${report.a3XlsQueue.conversionAttempted ? 'yes' : 'no'}`,
    `- Note: ${report.a3XlsQueue.approvalNote}`,
    '',
    '## Next Actions',
    '',
    ...report.nextActions.map((action) => `- ${action}`),
    '',
  ].join('\n');
}

module.exports = {
  DEFAULT_CANDIDATE_FILE,
  DEFAULT_INSPECTION_FILE,
  DEFAULT_YEARS,
  buildLegacyExpansionPreflightReport,
  renderLegacyExpansionPreflightMarkdown,
};
