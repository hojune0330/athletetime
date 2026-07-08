#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  buildLegacyNormalizationPlan,
  extractHorizontalPodiumResults,
  inspectLegacyXlsxWorkbook,
} = require('../card-studio/services/legacyResultNormalizationService');

const ROOT = path.join(__dirname, '..');

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function parseYears(value) {
  return String(value || '2015,2016,2017')
    .split(',')
    .map((year) => Number(year.trim()))
    .filter(Number.isInteger);
}

function normalizeSourceTitle(filename) {
  return String(filename || '')
    .replace(/\.[^.]+$/u, '')
    .replace(/^\d+[_\s-]*/u, '')
    .replace(/[_`]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function firstTitle(workbook, fallback) {
  for (const sheet of workbook.sheets) {
    for (const row of sheet.rows.slice(0, 8)) {
      const text = (row || []).join(' ').replace(/\s+/g, ' ').trim();
      if (/^\d+\s+/u.test(text)) continue;
      if (/성명/u.test(text) && /소속/u.test(text) && /기록/u.test(text)) continue;
      if (/순위/u.test(text) && /성명|소속|기록/u.test(text)) continue;
      if (/대회|기록|선수권|체육|종합/u.test(text) && text.length >= 6) return text.slice(0, 120);
    }
  }
  return normalizeSourceTitle(fallback);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
}

function renderReport({ plan, inspection, years }) {
  const status = plan.totals.statusCounts;
  const byYearLines = years.map((year) => `- ${year}: ${inspection.byYear[String(year)] || 0} candidate rows`);
  return [
    '# Track A Legacy Result Normalization Evidence',
    '',
    `- Years: ${years.join(', ')}`,
    `- Spreadsheet files: ${plan.totals.spreadsheetFiles}`,
    `- XLSX inspect candidates: ${status.xlsx_inspect_candidate || 0}`,
    `- Legacy XLS waiting for converter: ${status.legacy_xls_needs_conversion || 0}`,
    `- Non-elite files excluded from service candidate flow: ${status.excluded_non_elite || 0}`,
    `- Horizontal podium workbooks detected: ${inspection.horizontalPodiumWorkbooks}`,
    `- Candidate result rows extracted: ${inspection.candidateRecords}`,
    `- Raw originals tracked by git: ${plan.totals.rawOriginalsTrackedByGit}`,
    '',
    '## Candidate Rows By Year',
    '',
    ...byYearLines,
    '',
    '## Operator Notes',
    '',
    '- This command writes normalized candidates only. It does not mutate `data/results/*.json`.',
    '- `.xls` files remain blocked until a safe converter step is added.',
    '- 생활체육/마스터즈-like files are separated from the elite service candidate path.',
    '- Candidate rows keep source filename and private storage path so Fable can spot-check before promotion.',
    '',
  ].join('\n');
}

function inspectCandidateFile(file) {
  const absolutePath = path.join(ROOT, file.sourcePath);
  if (!fs.existsSync(absolutePath)) {
    return { file, error: 'ORIGINAL_FILE_NOT_FOUND', workbook: null, candidates: [] };
  }
  try {
    const workbook = inspectLegacyXlsxWorkbook(absolutePath);
    const hasHorizontalPodium = workbook.sheets.some((sheet) => sheet.layout === 'horizontal_podium');
    const candidates = hasHorizontalPodium
      ? extractHorizontalPodiumResults({
        competitionName: firstTitle(workbook, file.originalFilename),
        sourcePath: file.sourcePath,
        workbook,
        year: file.year,
      })
      : [];
    return { file, error: null, workbook, candidates };
  } catch (error) {
    return { file, error: error.message, workbook: null, candidates: [] };
  }
}

function summarizeInspection(results) {
  const byYear = {};
  for (const result of results) {
    byYear[String(result.file.year)] = (byYear[String(result.file.year)] || 0) + result.candidates.length;
  }
  const workbooks = results.map((result) => ({
    year: result.file.year,
    originalFilename: result.file.originalFilename,
    sourcePath: result.file.sourcePath,
    error: result.error,
    sheetLayouts: result.workbook
      ? result.workbook.sheets.map((sheet) => ({
        name: sheet.name,
        layout: sheet.layout,
        resultRowCount: sheet.resultRowCount,
      }))
      : [],
    candidateRecords: result.candidates.length,
  }));

  return {
    workbooks,
    horizontalPodiumWorkbooks: workbooks
      .filter((item) => item.sheetLayouts.some((sheet) => sheet.layout === 'horizontal_podium')).length,
    candidateRecords: results.reduce((sum, result) => sum + result.candidates.length, 0),
    byYear,
    errors: workbooks.filter((item) => item.error).length,
  };
}

function main() {
  const years = parseYears(readArg('--years'));
  const outDir = path.resolve(ROOT, readArg(
    '--out-dir',
    '.omo/evidence/legacy-results-normalization/track-a-2015-2017',
  ));
  fs.mkdirSync(outDir, { recursive: true });

  const plan = buildLegacyNormalizationPlan({ years });
  const xlsxResults = plan.files
    .filter((file) => file.status === 'xlsx_inspect_candidate')
    .map(inspectCandidateFile);
  const inspection = summarizeInspection(xlsxResults);
  const candidates = xlsxResults.flatMap((result) => result.candidates);

  writeJson(path.join(outDir, 'plan.json'), plan);
  writeJson(path.join(outDir, 'xlsx-inspection.json'), inspection);
  writeJsonl(path.join(outDir, 'normalized-candidates.jsonl'), candidates);
  fs.writeFileSync(path.join(outDir, 'review-report.md'), renderReport({ plan, inspection, years }), 'utf8');

  const payload = { ok: true, outDir, plan, inspection };
  if (hasFlag('--json')) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else process.stdout.write(`${renderReport({ plan, inspection, years })}\nWrote: ${outDir}\n`);
}

main();
