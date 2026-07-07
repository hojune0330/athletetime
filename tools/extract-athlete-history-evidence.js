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
    '# 선수이력 기반 해외대회 발견 힌트',
    '',
    `- 힌트 수: ${result.hints.length}`,
    `- 입력 처리: ${result.inputHandling}`,
    `- 저장 원칙: ${result.storagePolicy}`,
    '',
    '## 힌트',
    '',
    ...result.hints.map((hint) => [
      `- ${hint.date || '날짜 미확인'} ${hint.competitionName}`,
      `  - 종목/기록/순위: ${hint.event || '-'} / ${hint.record || '-'} / ${hint.rank || '-'}`,
      `  - 상태: ${hint.confirmationStatus}`,
      `  - 다음 확인: ${hint.searchQueries.join(' | ')}`,
    ].join('\n')),
    '',
    '## 운영 원칙',
    '',
    '- 선수이력조회 내용은 자동 확정 원천이 아니라 해외대회 발견 힌트로만 쓴다.',
    '- 선수 이름, 생년 정보, 기관 식별자, 원본 이력 전문은 저장하지 않는다.',
    '- 서비스 반영 전 외부 공식 결과 또는 본인 제출 증빙으로 한 번 더 확인한다.',
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
