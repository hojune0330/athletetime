#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  DEFAULT_BACKFILL_MANIFEST_PATH,
} = require('../card-studio/services/legacyResultNormalizationService');
const {
  buildLegacyXlsStep2CandidateDryRun,
  renderLegacyXlsStep2CandidateMarkdown,
} = require('../card-studio/services/legacyXlsStep2CandidateDryRunService');

const ROOT = path.join(__dirname, '..');
const DEFAULT_OUT_DIR = path.join(ROOT, '.omo', 'evidence', 'a3-xls-step2-candidate-dry-run');

function readArg(name, fallback = null) {
  const index = process.argv.lastIndexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`);
  return value;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function parseYears(value) {
  const tokens = String(value || '2015,2016,2017').split(',').map((year) => year.trim());
  const years = tokens.map((year) => Number(year));
  if (!tokens.length || tokens.some((year) => !year) || years.some((year) => !Number.isInteger(year))) {
    throw new Error('Invalid --years value');
  }
  return years;
}

function parseThreshold(value) {
  if (value === null) return 0.2;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error('Invalid --division-review-threshold value');
  }
  return parsed;
}

function resolveFromRoot(value) {
  return path.resolve(ROOT, value);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeJsonl(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
}

function publicReport(report) {
  const { candidates, blockedWorkbookEvidence, ...summary } = report;
  return summary;
}

function main() {
  const years = parseYears(readArg('--years'));
  const manifestPath = path.resolve(ROOT, readArg('--manifest', DEFAULT_BACKFILL_MANIFEST_PATH));
  const outDir = resolveFromRoot(readArg('--out-dir', DEFAULT_OUT_DIR));
  const divisionReviewThreshold = parseThreshold(readArg('--division-review-threshold'));
  const report = buildLegacyXlsStep2CandidateDryRun({ years, manifestPath, divisionReviewThreshold });
  const markdown = renderLegacyXlsStep2CandidateMarkdown(report);

  fs.mkdirSync(outDir, { recursive: true });
  writeJsonl(path.join(outDir, 'normalized-candidates.jsonl'), report.candidates);
  writeJsonl(path.join(outDir, 'normalized-candidates.sample.jsonl'), report.candidates.slice(0, 50));
  writeJson(path.join(outDir, 'blocked-workbooks.json'), report.blockedWorkbookEvidence);
  writeJson(path.join(outDir, 'step2-report.json'), publicReport(report));
  fs.writeFileSync(path.join(outDir, 'step2-review-report.md'), markdown, 'utf8');

  const payload = {
    ok: true,
    outDir: path.relative(ROOT, outDir).replace(/\\/gu, '/') || '.',
    report: publicReport(report),
  };
  if (hasFlag('--json')) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else process.stdout.write(`${markdown}\nWrote: ${payload.outDir}\n`);
}

try {
  main();
} catch (error) {
  const payload = {
    ok: false,
    code: 'LEGACY_XLS_STEP2_CANDIDATE_DRY_RUN_FAILED',
    message: error instanceof Error ? error.message : String(error),
  };
  if (hasFlag('--json')) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else process.stderr.write(`error: ${payload.code}: ${payload.message}\n`);
  process.exitCode = 1;
}
