#!/usr/bin/env node
'use strict';

const { validateBatch } = require('../card-studio/services/dataCandidateBatchService');

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function printHuman(result) {
  process.stdout.write(`ok:${result.ok}\n`);
  process.stdout.write(`batch:${result.batchName}\n`);
  process.stdout.write(`candidates:${result.counts.candidates}\n`);
  process.stdout.write(`sources:${result.counts.sources}\n`);
  process.stdout.write(`years:${result.years[0] || '-'}-${result.years[result.years.length - 1] || '-'} (${result.counts.years})\n`);

  if (result.errors.length > 0) {
    process.stdout.write('errors:\n');
    for (const error of result.errors) {
      process.stdout.write(`- ${error.code} ${JSON.stringify(error)}\n`);
    }
  }
}

function main() {
  const batchPath = readArg('--batch');
  const asJson = process.argv.includes('--json');

  if (!batchPath) {
    const result = { ok: false, error: { code: 'MISSING_BATCH_ARG', message: 'Usage: validate-data-candidates --batch <path> [--json]' } };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  const result = validateBatch(batchPath, {
    startYear: readArg('--start-year') || 2005,
    currentYear: readArg('--current-year') || new Date().getFullYear(),
  });

  if (asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    printHuman(result);
  }

  process.exitCode = result.ok ? 0 : 1;
}

main();
