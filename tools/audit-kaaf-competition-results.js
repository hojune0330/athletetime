#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const audit = require('../card-studio/services/kaafCompetitionResultAuditService');

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
  if (!Number.isInteger(parsed)) {
    throw Object.assign(new Error(`${name} must be an integer`), { code: 'KAAF_COMPETITION_AUDIT_INVALID_ARG' });
  }
  return parsed;
}

function writeFile(filePath, content) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function compactResult(result) {
  return {
    ok: true,
    query: result.query,
    fromYear: result.fromYear || result.year || null,
    toYear: result.toYear || result.year || null,
    pages: result.pages ? result.pages.length : 1,
    candidates: result.candidates.length,
    missingResultRows: result.missingResultRows.length,
    outputPath: readArg('--output'),
    reportPath: readArg('--report'),
  };
}

function renderReport(result) {
  const lines = [
    '# KAAF 대회명 기반 결과파일 누락 감사',
    '',
    `- 검색어: ${result.query}`,
    `- 범위: ${result.fromYear || result.year || '(fixture)'} ~ ${result.toYear || result.year || '(fixture)'}`,
    `- 결과파일 후보: ${result.candidates.length}`,
    `- 결과파일 없는 매칭 행: ${result.missingResultRows.length}`,
    '',
    '## 결과파일 후보',
    '',
    ...result.candidates.map((item) => [
      `- ${item.year || result.year || 'unknown'} ${item.competitionName}`,
      `  - 파일: ${item.originalFilename}`,
      `  - 출처: ${item.detailUrl || item.sourceUrl}`,
      `  - 다운로드: ${item.downloadUrl}`,
    ].join('\n')),
    '',
    '## 결과파일 없는 매칭 행',
    '',
    ...result.missingResultRows.map((item) => [
      `- ${item.year || result.year || 'unknown'} ${item.competitionName}`,
      `  - 기간/장소: ${item.competitionPeriod || '-'} / ${item.venue || '-'}`,
      `  - 출처: ${item.detailUrl || item.sourceUrl || '-'}`,
      `  - 상태: ${item.reason}`,
    ].join('\n')),
    '',
    '## 원칙',
    '',
    '- 파일명이 애매하면 같은 표 행의 대회명으로 결과파일을 판정합니다.',
    '- 대한육상연맹 공개 국내경기 페이지와 `FILEs_4` 결과첨부만 후보로 인정합니다.',
    '- 원본 파일 본문은 이 감사 보고서에 저장하지 않습니다.',
  ];
  return `${lines.join('\n')}\n`;
}

async function fromPageFile() {
  const pageFile = readArg('--page-file');
  if (!pageFile) return null;
  const sourceUrl = readArg('--source-url') || 'https://kaaf.or.kr/ver3/info/internal.asp';
  const year = numberArg('--year', Number(new URL(sourceUrl).searchParams.get('currentYear')) || null);
  const html = fs.readFileSync(pageFile, 'utf8');
  return audit.auditCompetitionResultRows(html, {
    query: readArg('--query'),
    sourceUrl,
    year,
  });
}

async function main() {
  try {
    const query = readArg('--query');
    if (!query) throw Object.assign(new Error('--query is required'), { code: 'KAAF_COMPETITION_AUDIT_QUERY_REQUIRED' });

    const fixture = await fromPageFile();
    const result = fixture || await audit.auditCompetitionResults({
      query,
      fromYear: numberArg('--from-year', new Date().getFullYear()),
      toYear: numberArg('--to-year', numberArg('--from-year', new Date().getFullYear())),
      timeoutMs: numberArg('--timeout-ms', 30000),
    });

    writeFile(readArg('--output'), `${JSON.stringify(result, null, 2)}\n`);
    writeFile(readArg('--report'), renderReport(result));
    const summary = compactResult(result);
    if (hasFlag('--json')) process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    else process.stdout.write(`candidates ${summary.candidates}, missing ${summary.missingResultRows}\n`);
  } catch (error) {
    const payload = { ok: false, error: { code: error.code || 'KAAF_COMPETITION_AUDIT_FAILED', message: error.message } };
    if (hasFlag('--json')) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    else process.stderr.write(`${payload.error.code}: ${payload.error.message}\n`);
    process.exitCode = 1;
  }
}

main();
