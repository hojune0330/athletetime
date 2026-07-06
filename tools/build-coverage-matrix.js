#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  buildCoverageMatrix,
  renderCoverageMatrixMarkdown,
} = require('../card-studio/services/coverageMatrixService');

function readArg(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function parseYear(value, fallback) {
  if (!value) return fallback;
  const year = Number(value);
  if (!Number.isInteger(year)) {
    throw new TypeError(`Invalid year: ${value}`);
  }
  return year;
}

function writeFileEnsuringDirectory(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function main() {
  const args = process.argv.slice(2);
  const fromYear = parseYear(readArg(args, '--from-year'), 2010);
  const toYear = parseYear(readArg(args, '--to-year'), new Date().getFullYear());
  const dataRoot = readArg(args, '--data-root') || path.join(__dirname, '..', 'data');
  const generatedAt = readArg(args, '--generated-at') || new Date().toISOString();
  const outJson = readArg(args, '--out-json');
  const outMarkdown = readArg(args, '--out-md');

  const matrix = buildCoverageMatrix({ dataRoot, fromYear, toYear, generatedAt });
  const markdown = renderCoverageMatrixMarkdown(matrix);

  if (outJson) {
    writeFileEnsuringDirectory(outJson, `${JSON.stringify(matrix, null, 2)}\n`);
  }

  if (outMarkdown) {
    writeFileEnsuringDirectory(outMarkdown, markdown);
  }

  process.stdout.write(`coverage:${fromYear}-${toYear}\n`);
  process.stdout.write(`${matrix.truthStatement.headline}\n`);
  process.stdout.write(`localCompetitionYears:${matrix.summary.localCompetitionYears}/${matrix.summary.totalYears}\n`);
  process.stdout.write(`localResultYears:${matrix.summary.localResultYears}/${matrix.summary.totalYears}\n`);
  process.stdout.write(`partialYears:${matrix.summary.partialYears}\n`);
}

try {
  main();
} catch (error) {
  if (error instanceof Error) {
    process.stderr.write(`error: ${error.message}\n`);
    process.exitCode = 1;
  } else {
    process.stderr.write('error: unknown failure\n');
    process.exitCode = 1;
  }
}
