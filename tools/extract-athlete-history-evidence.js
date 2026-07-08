#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const evidence = require('../card-studio/services/athleteHistoryEvidenceService');

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function writeFile(filePath, content) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function renderReport(result) {
  const lines = [
    '# Athlete history overseas-result discovery hints',
    '',
    `- Hints: ${result.hints.length}`,
    `- Input handling: ${result.inputHandling}`,
    `- Storage policy: ${result.storagePolicy}`,
    `- Update mode: ${result.updateMode}`,
    `- Ranking policy: ${result.rankingPolicy}`,
    '',
    '## Hints',
    '',
    ...result.hints.map((hint) => [
      `- ${hint.date || 'date unknown'} ${hint.competitionName}`,
      `  - Event/record/place: ${hint.event || '-'} / ${hint.record || '-'} / ${hint.rank || '-'}`,
      `  - Status: ${hint.confirmationStatus}`,
      `  - Next confirmation: ${hint.searchQueries.join(' | ')}`,
    ].join('\n')),
    '',
    '## Operating policy',
    '',
    '- Athlete-history screens are discovery hints only, not an automatic source of record truth.',
    '- The operator or owner manually maintains the high-value watchlist and any ranking-related updates.',
    '- Do not store athlete names, birth data, institution identifiers, or the raw athlete-history text.',
    '- Do not publish a hint until it is confirmed against an external official result or a submitted proof package.',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  try {
    const inputPath = readArg('--input');
    if (!inputPath) throw Object.assign(new Error('--input is required'), { code: 'ATHLETE_HISTORY_INPUT_REQUIRED' });
    const result = evidence.extractHistoryEvidenceHints(fs.readFileSync(inputPath, 'utf8'), {
      consentBasis: hasFlag('--self-submitted') ? 'self_submitted' : 'operator_manual_review',
    });
    writeFile(readArg('--output'), `${JSON.stringify(result, null, 2)}\n`);
    writeFile(readArg('--report'), renderReport(result));

    const summary = {
      ok: true,
      hints: result.hints.length,
      outputPath: readArg('--output'),
      reportPath: readArg('--report'),
    };
    if (hasFlag('--json')) process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    else process.stdout.write(`hints: ${summary.hints}\n`);
  } catch (error) {
    const payload = { ok: false, error: { code: error.code || 'ATHLETE_HISTORY_EVIDENCE_FAILED', message: error.message } };
    if (hasFlag('--json')) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    else process.stderr.write(`${payload.error.code}: ${payload.error.message}\n`);
    process.exitCode = 1;
  }
}

main();
