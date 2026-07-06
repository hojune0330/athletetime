#!/usr/bin/env node
'use strict';

const harvester = require('../card-studio/services/kaafScheduleResultHarvesterService');

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function numberArg(name, fallback) {
  const value = readArg(name);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw Object.assign(new Error(`${name} must be an integer`), {
    code: 'KAAF_HARVEST_INVALID_ARG',
  });
  return parsed;
}

function writeResult(result) {
  if (hasFlag('--json')) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (!result.ok) {
    process.stdout.write(`harvest failed: ${result.error.code}\n`);
    return;
  }
  process.stdout.write(
    `harvested ${result.downloaded}/${result.totalCandidates} KAAF result files ` +
    `(${result.failed} failed, ${result.excludedCount} excluded)\n` +
    `manifest: ${result.manifestPath}\n` +
    `report: ${result.reportPath}\n`,
  );
}

async function main() {
  try {
    const fromYear = numberArg('--from-year', new Date().getFullYear());
    const toYear = numberArg('--to-year', fromYear);
    const batchName = readArg('--batch-name') || undefined;
    const storageRoot = readArg('--storage-root') || undefined;
    const reportDir = readArg('--report-dir') || undefined;
    const discovery = await harvester.harvestYearPages({ fromYear, toYear });
    const run = await harvester.downloadScheduleResultFiles(discovery.candidates, {
      batchName,
      storageRoot,
      reportDir,
      excludedCount: discovery.excluded.length,
    });
    writeResult({ ok: run.ok, pages: discovery.pages, ...run });
    if (!run.ok) process.exitCode = 1;
  } catch (error) {
    writeResult({
      ok: false,
      error: {
        code: error.code || 'KAAF_HARVEST_CLI_FAILED',
        message: error.message,
      },
    });
    process.exitCode = 1;
  }
}

main();
