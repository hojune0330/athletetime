#!/usr/bin/env node
'use strict';

const { buildSourceInventory } = require('../card-studio/services/sourceInventoryService');

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function main() {
  const batch = readArg('--batch');
  const url = readArg('--url');
  const asJson = process.argv.includes('--json');
  const inventory = buildSourceInventory({ batch, url });

  if (asJson) {
    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
    return;
  }

  process.stdout.write(`batch:${inventory.batch}\n`);
  process.stdout.write(`downloaded:${inventory.downloaded}\n`);
  process.stdout.write(`candidates:${inventory.candidates.length}\n`);
  for (const candidate of inventory.candidates) {
    const label = candidate.originalFilename || candidate.datasetId || candidate.sourceUrl;
    process.stdout.write(`${candidate.collectionAction}\t${label}\t${candidate.sourceUrl || ''}\n`);
  }
}

main();
