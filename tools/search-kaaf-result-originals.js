#!/usr/bin/env node
'use strict';

const search = require('../card-studio/services/kaafResultOriginalSearchService');

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

function main() {
  const manifest = search.readManifest(readArg('--manifest') || undefined);
  const query = readArg('--query');

  if (hasFlag('--audit')) {
    writeJson(search.auditManifest(manifest));
    return;
  }

  if (!query) {
    writeJson({ ok: false, error: { code: 'QUERY_REQUIRED' } });
    process.exitCode = 1;
    return;
  }

  writeJson({
    ok: true,
    ...search.searchOriginals(manifest, query, { limit: Number(readArg('--limit') || 20) }),
  });
}

main();
