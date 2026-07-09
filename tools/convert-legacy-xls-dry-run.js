#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  DEFAULT_BACKFILL_MANIFEST_PATH,
} = require('../card-studio/services/legacyResultNormalizationService');
const {
  buildLegacyXlsDryRunReport,
  renderLegacyXlsDryRunMarkdown,
} = require('../card-studio/services/legacyXlsConverterDryRunService');

const ROOT = path.join(__dirname, '..');
const DEFAULT_OUT_DIR = path.join(ROOT, '.omo', 'evidence', 'a3-xls-converter-dry-run', 'sanitized');

function readArg(name, fallback = null) {
  const index = process.argv.lastIndexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function parseYears(value) {
  const tokens = String(value || '2015,2016,2017')
    .split(',')
    .map((year) => year.trim());
  const years = tokens.map((year) => Number(year));
  if (tokens.some((year) => !year) || years.some((year) => !Number.isInteger(year))) {
    throw new Error('Invalid --years value');
  }
  if (!years.length) throw new Error('Invalid --years value');
  return years;
}

function parseLimit(value) {
  if (value === null) return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error('Invalid --limit value');
  return number;
}

function resolveFromRoot(value) {
  return path.resolve(ROOT, value);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function main() {
  const years = parseYears(readArg('--years'));
  const limit = parseLimit(readArg('--limit'));
  const manifestPath = path.resolve(ROOT, readArg('--manifest', DEFAULT_BACKFILL_MANIFEST_PATH));
  const outDir = resolveFromRoot(readArg('--out-dir', DEFAULT_OUT_DIR));
  const report = buildLegacyXlsDryRunReport({ years, manifestPath, limit });
  const markdown = renderLegacyXlsDryRunMarkdown(report);

  fs.mkdirSync(outDir, { recursive: true });
  writeJson(path.join(outDir, 'xls-dry-run-report.json'), report);
  fs.writeFileSync(path.join(outDir, 'xls-dry-run-report.md'), markdown, 'utf8');

  const payload = {
    ok: true,
    outDir: path.relative(ROOT, outDir).replace(/\\/gu, '/') || '.',
    report,
  };
  if (hasFlag('--json')) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else process.stdout.write(`${markdown}\nWrote: ${payload.outDir}\n`);
}

try {
  main();
} catch (error) {
  const payload = {
    ok: false,
    code: 'LEGACY_XLS_DRY_RUN_FAILED',
    message: error instanceof Error ? error.message : String(error),
  };
  if (hasFlag('--json')) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else process.stderr.write(`error: ${payload.code}: ${payload.message}\n`);
  process.exitCode = 1;
}
