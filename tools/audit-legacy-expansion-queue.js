#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  DEFAULT_YEARS,
  buildLegacyExpansionPreflightReport,
  renderLegacyExpansionPreflightMarkdown,
} = require('../card-studio/services/legacyExpansionPreflightService');

const ROOT = path.join(__dirname, '..');
const DEFAULT_OUT_DIR = path.join(ROOT, '.omo', 'evidence', 'a2-a3-preflight', 'final');

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function parseYears(value) {
  return String(value || DEFAULT_YEARS.join(','))
    .split(',')
    .map((year) => Number(year.trim()))
    .filter(Number.isInteger);
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
  const outDir = resolveFromRoot(readArg('--out-dir', DEFAULT_OUT_DIR));
  const report = buildLegacyExpansionPreflightReport({ years });
  const markdown = renderLegacyExpansionPreflightMarkdown(report);

  fs.mkdirSync(outDir, { recursive: true });
  writeJson(path.join(outDir, 'preflight-report.json'), report);
  fs.writeFileSync(path.join(outDir, 'preflight-report.md'), markdown, 'utf8');

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
  const message = error instanceof Error ? error.message : String(error);
  const payload = { ok: false, code: 'LEGACY_EXPANSION_PREFLIGHT_FAILED', message };
  if (hasFlag('--json')) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else process.stderr.write(`error: ${payload.code}: ${message}\n`);
  process.exitCode = 1;
}
