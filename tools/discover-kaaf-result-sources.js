#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const harvester = require('../card-studio/services/kaafScheduleResultHarvesterService');

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
    throw Object.assign(new Error(`${name} must be an integer`), { code: 'KAAF_DISCOVERY_INVALID_ARG' });
  }
  return parsed;
}

function writeFile(filePath, content) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function summarizeByYear(pages = []) {
  const summary = {};
  for (const page of pages) {
    summary[page.year || 'unknown'] = {
      candidates: page.candidates,
      excluded: page.excluded,
    };
  }
  return summary;
}

function renderReport(result) {
  const lines = [
    '# KAAF 경기결과 후보 발견 보고서',
    '',
    `- 후보: ${result.totalCandidates}`,
    `- 제외: ${result.excludedCount}`,
    `- 범위: ${result.fromYear || '(fixture)'} ~ ${result.toYear || '(fixture)'}`,
    '',
    '## 연도별 후보',
    '',
    ...Object.entries(result.byYear).map(([year, row]) => (
      `- ${year}: 후보 ${row.candidates}, 제외 ${row.excluded}`
    )),
    '',
    '## 샘플',
    '',
    ...result.samples.map((item) => `- ${item.year}: ${item.title} — ${item.downloadUrl}`),
    '',
    '## 원칙',
    '',
    '- 파일 본문은 다운로드하지 않았습니다.',
    '- 대한육상연맹 공개 일정 페이지의 결과 첨부 후보만 목록화했습니다.',
    '- 차단 호스트와 생활체육 후보는 기존 수집 정책에 따라 제외됩니다.',
  ];
  return `${lines.join('\n')}\n`;
}

function fromPageFile() {
  const pageFile = readArg('--page-file');
  if (!pageFile) return null;
  const sourceUrl = readArg('--source-url') || 'https://kaaf.or.kr/ver3/info/internal.asp';
  const year = numberArg('--year', Number(new URL(sourceUrl).searchParams.get('currentYear')) || null);
  const html = fs.readFileSync(pageFile, 'utf8');
  const extracted = harvester.extractScheduleResultFiles(html, { sourceUrl, year });
  return {
    fromYear: year,
    toYear: year,
    pages: [{ sourceUrl, year, candidates: extracted.candidates.length, excluded: extracted.excluded.length }],
    candidates: extracted.candidates,
    excluded: extracted.excluded,
  };
}

async function discover() {
  const fixture = fromPageFile();
  if (fixture) return fixture;
  const fromYear = numberArg('--from-year', new Date().getFullYear());
  const toYear = numberArg('--to-year', fromYear);
  return harvester.harvestYearPages({ fromYear, toYear, timeoutMs: numberArg('--timeout-ms', 30000) })
    .then((result) => ({ fromYear, toYear, ...result }));
}

function toResult(discovery) {
  const candidates = discovery.candidates || [];
  return {
    ok: true,
    fromYear: discovery.fromYear,
    toYear: discovery.toYear,
    totalCandidates: candidates.length,
    excludedCount: (discovery.excluded || []).length,
    byYear: summarizeByYear(discovery.pages || []),
    pages: discovery.pages || [],
    candidates,
    samples: candidates.slice(0, Number(readArg('--sample-limit') || 10)).map((candidate) => ({
      year: candidate.year,
      title: candidate.title,
      downloadUrl: candidate.downloadUrl,
    })),
  };
}

async function main() {
  try {
    const result = toResult(await discover());
    writeFile(readArg('--output'), `${JSON.stringify(result, null, 2)}\n`);
    writeFile(readArg('--report'), renderReport(result));
    if (hasFlag('--json')) {
      process.stdout.write(`${JSON.stringify({
        ok: true,
        totalCandidates: result.totalCandidates,
        excludedCount: result.excludedCount,
        outputPath: readArg('--output'),
        reportPath: readArg('--report'),
      }, null, 2)}\n`);
    } else {
      process.stdout.write(`discovered ${result.totalCandidates} KAAF result candidates\n`);
    }
  } catch (error) {
    const payload = { ok: false, error: { code: error.code || 'KAAF_DISCOVERY_FAILED', message: error.message } };
    if (hasFlag('--json')) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    else process.stderr.write(`${payload.error.code}: ${payload.error.message}\n`);
    process.exitCode = 1;
  }
}

main();
