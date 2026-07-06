#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const catalogService = require('../card-studio/services/kaafResultCatalogService');

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function renderReport(catalog) {
  const lines = [
    '# KAAF Canonical Result Catalog',
    '',
    `- total: ${catalog.stats.total}`,
    `- duplicate groups: ${catalog.stats.duplicateGroups.length}`,
    '',
    '## By Season',
    '',
    ...Object.entries(catalog.stats.bySeason).map(([key, count]) => `- ${key}: ${count}`),
    '',
    '## By Extension',
    '',
    ...Object.entries(catalog.stats.byExtension).map(([key, count]) => `- ${key}: ${count}`),
    '',
    '## By Magic Type',
    '',
    ...Object.entries(catalog.stats.byMagicType).map(([key, count]) => `- ${key}: ${count}`),
    '',
    '## By Category Hint',
    '',
    ...Object.entries(catalog.stats.byCategoryHint).map(([key, count]) => `- ${key}: ${count}`),
    '',
    '## Notes',
    '',
    '- Originals are not modified or deleted.',
    '- Duplicate groups are review hints only.',
    '- Public search integration still requires row-level import.',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  try {
    const manifest = catalogService.readManifest(readArg('--manifest') || undefined);
    const catalog = catalogService.buildCatalog(manifest);
    const searchQuery = readArg('--search');

    if (searchQuery) {
      writeJson({
        ok: true,
        hits: catalogService.searchCatalog(catalog, {
          query: searchQuery,
          season: readArg('--season'),
          extension: readArg('--extension'),
        }).slice(0, Number(readArg('--limit') || 20)),
      });
      return;
    }

    const outputPath = readArg('--output');
    const reportPath = readArg('--report');
    if (outputPath) writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
    if (reportPath) writeFile(reportPath, renderReport(catalog));

    const result = {
      ok: true,
      total: catalog.stats.total,
      duplicateGroups: catalog.stats.duplicateGroups.length,
      outputPath: outputPath || null,
      reportPath: reportPath || null,
    };
    if (hasFlag('--json')) writeJson(result);
    else process.stdout.write(`catalog entries: ${result.total}\n`);
  } catch (error) {
    const result = { ok: false, error: { code: error.code || 'KAAF_CATALOG_FAILED', message: error.message } };
    if (hasFlag('--json')) writeJson(result);
    else process.stderr.write(`${result.error.code}: ${result.error.message}\n`);
    process.exitCode = 1;
  }
}

main();
