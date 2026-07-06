#!/usr/bin/env node
'use strict';

const sourceInventory = require('../card-studio/services/sourceInventoryService');
const sourceLedger = require('../card-studio/services/sourceLedgerService');

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function main() {
  const batch = readArg('--batch') || 'B';
  const index = Number.parseInt(readArg('--index') || '0', 10);
  const ledgerPath = readArg('--ledger');
  const dryRun = process.argv.includes('--dry-run');
  const explicitReviewStatus = process.argv.includes('--approved') ? 'approved' : readArg('--review-status');
  const inventory = sourceInventory.buildSourceInventory({ batch });
  const candidate = inventory.candidates[index];

  if (!candidate) {
    process.stderr.write(`No candidate at batch ${batch} index ${index}\n`);
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    process.stdout.write(`${JSON.stringify({ dryRun: true, candidate }, null, 2)}\n`);
    return;
  }

  const result = sourceLedger.createSource({
    ...candidate,
    reviewStatus: explicitReviewStatus || candidate.reviewStatus,
  }, {
    ledgerPath: ledgerPath || undefined,
    licenseType: readArg('--license') || candidate.licenseGuess || 'unknown',
    extractionMethod: readArg('--extraction-method') || 'source_inventory',
    sha256: readArg('--sha256') || null,
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

main();
