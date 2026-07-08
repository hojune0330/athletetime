#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {
  TrackAPromotionError,
  writePromotion,
} = require('../card-studio/services/legacyResultPromotionService');

const ROOT = path.join(__dirname, '..');
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
const DEFAULT_EVIDENCE_DIR = path.join(ROOT, '.omo', 'evidence', 'track-a-xlsx-service-promotion');

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function resolveFromRoot(value) {
  return path.resolve(ROOT, value);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readManualTopStats() {
  const stdout = execFileSync(
    process.execPath,
    [
      '-e',
      "const s=require('./card-studio/services/recordAnalyticsService').warmup().manualTopRecords; process.stdout.write(JSON.stringify(s));",
    ],
    { cwd: ROOT, encoding: 'utf8' },
  );
  return JSON.parse(stdout);
}

function deltaStats(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const delta = {};
  for (const key of keys) {
    delta[key] = Number(after[key] || 0) - Number(before[key] || 0);
  }
  return delta;
}

function renderHumanReport(report) {
  return [
    '# Track A XLSX Promotion',
    '',
    `- Candidate rows: ${report.candidateRows}`,
    `- Promoted rows: ${report.promotedRows}`,
    `- Promoted workbooks: ${report.promotedWorkbooks}`,
    `- Held rows: ${report.heldRows || 0}`,
    `- Held workbooks: ${(report.heldWorkbooks || []).length}`,
    `- Years: ${report.years.join(', ')}`,
    `- By year: ${Object.entries(report.byYear).map(([year, count]) => `${year}=${count}`).join(', ')}`,
    `- Deferred .xls files: ${report.deferredXlsFiles}`,
    `- Excluded non-elite files: ${report.excludedNonEliteFiles}`,
    '',
  ].join('\n');
}

function main() {
  const dryRun = hasFlag('--dry-run');
  const write = hasFlag('--write');
  if (dryRun === write) {
    throw new TrackAPromotionError(
      'TRACK_A_PROMOTION_MODE_REQUIRED',
      'Pass exactly one of --dry-run or --write',
    );
  }

  const candidateFile = resolveFromRoot(readArg('--candidate-file', DEFAULT_CANDIDATE_FILE));
  const inspectionFile = resolveFromRoot(readArg('--inspection-file', DEFAULT_INSPECTION_FILE));
  const outDir = resolveFromRoot(readArg('--out-dir', path.join(ROOT, 'data', 'results')));
  const indexPath = resolveFromRoot(readArg('--index', path.join(outDir, 'index.json')));
  const evidenceDir = resolveFromRoot(readArg('--evidence-dir', DEFAULT_EVIDENCE_DIR));
  const manualTopDeltaPath = readArg('--manual-top-delta', null);

  const beforeManualTopStats = manualTopDeltaPath ? readManualTopStats() : null;
  const report = writePromotion({ candidateFile, inspectionFile, outDir, indexPath, evidenceDir });
  let manualTopRecordStats = null;

  if (manualTopDeltaPath) {
    const afterManualTopStats = readManualTopStats();
    manualTopRecordStats = {
      before: beforeManualTopStats,
      after: afterManualTopStats,
      delta: deltaStats(beforeManualTopStats, afterManualTopStats),
    };
    writeJson(resolveFromRoot(manualTopDeltaPath), manualTopRecordStats);
  }

  const payload = {
    ok: true,
    mode: write ? 'write' : 'dry-run',
    ...report,
    ...(manualTopRecordStats ? { manualTopRecordStats } : {}),
  };

  writeJson(path.join(evidenceDir, 'promotion-command-output.json'), payload);
  fs.writeFileSync(path.join(evidenceDir, 'promotion-report.md'), renderHumanReport(payload), 'utf8');

  if (hasFlag('--json')) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else process.stdout.write(`${renderHumanReport(payload)}\n`);
}

try {
  main();
} catch (error) {
  const code = error instanceof TrackAPromotionError ? error.code : 'TRACK_A_PROMOTION_FAILED';
  const payload = { ok: false, code, message: error.message };
  if (hasFlag('--json')) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else process.stderr.write(`error: ${code}: ${error.message}\n`);
  process.exitCode = 1;
}
