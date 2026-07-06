#!/usr/bin/env node
'use strict';

const sourceDownload = require('../card-studio/services/sourceDownloadService');

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function asJson() {
  return process.argv.includes('--json');
}

function writeResult(result) {
  if (asJson()) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (!result.ok) {
    process.stdout.write(`download failed: ${result.error.code}\n`);
    return;
  }

  process.stdout.write(
    `downloaded ${result.source.sourceId}: ${result.privateStoragePath} (${result.bytes} bytes, sha256 ${result.sha256})\n`,
  );
}

async function main() {
  const sourceId = readArg('--source-id');
  if (!sourceId) {
    writeResult({ ok: false, error: { code: 'SOURCE_ID_REQUIRED' } });
    process.exitCode = 1;
    return;
  }

  try {
    const result = await sourceDownload.downloadSource(sourceId, {
      ledgerPath: readArg('--ledger') || undefined,
      storageRoot: readArg('--storage-root') || undefined,
    });
    writeResult(result);
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    writeResult({
      ok: false,
      error: {
        code: error.code || 'SOURCE_DOWNLOAD_CLI_FAILED',
        message: error.message,
      },
    });
    process.exitCode = 1;
  }
}

main();
