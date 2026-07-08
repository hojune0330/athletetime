#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DEFAULT_INPUT_DIR = 'C:/Users/SAMSUNG/Downloads/20260708-kaaf-top100';
const DEFAULT_BATCH = '20260708-kaaf-top100';
const OUTPUT_DIR = path.join(ROOT, 'data', 'manual', 'kaaf-top100');

const SAFE_RECORD_KEYS = [
  'source',
  'athlete_kor',
  'athlete_eng',
  'team',
  'event',
  'category',
  'rank',
  'mark',
  'tool',
  'wind',
  'date',
  'meeting',
  'meeting_en',
  'record_type',
  'round',
  'detail_class_cd',
  'kind_cd',
  'status',
];

const SENSITIVE_KEY_PATTERN = /(person|birth|jumin|resident|phone|tel|mobile|email|contact|address|password|token|secret|주민|생년|전화|연락|주소|비밀번호)/i;
const TEAM_EVENT_PATTERN = /(4x|relay|R$|역전경기|계주|혼성)/i;

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${path.basename(filePath)}:${index + 1} ${error.message}`);
      }
    });
}

function clean(value, max = 500) {
  return String(value || '').trim().replace(/[\x00-\x1f\x7f]/g, '').slice(0, max);
}

function stableId(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 20);
}

function scanSensitiveKeys(value, prefix = '', hits = []) {
  if (!value || typeof value !== 'object') return hits;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanSensitiveKeys(item, `${prefix}[${index}]`, hits));
    return hits;
  }
  for (const key of Object.keys(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (SENSITIVE_KEY_PATTERN.test(key)) hits.push(next);
    scanSensitiveKeys(value[key], next, hits);
  }
  return hits;
}

function isTeamEvent(row) {
  const event = clean(row.event, 80);
  const name = clean(row.athlete_kor, 160);
  const englishName = clean(row.athlete_eng, 200);
  return TEAM_EVENT_PATTERN.test(event) || name.includes(',') || englishName.includes(',');
}

function isIndexable(row) {
  if (isTeamEvent(row)) return false;
  if (clean(row.athlete_kor, 120).length < 2) return false;
  if (!clean(row.mark, 80)) return false;
  if (!clean(row.date, 20)) return false;
  return true;
}

function normalizeCandidate(row, batch, index) {
  const safe = {};
  for (const key of SAFE_RECORD_KEYS) safe[key] = row[key] ?? null;

  const sourceRowId = stableId([
    batch,
    safe.athlete_kor,
    safe.athlete_eng,
    safe.team,
    safe.event,
    safe.category,
    safe.rank,
    safe.mark,
    safe.date,
    safe.meeting,
    index,
  ].join('|'));
  const indexingStatus = isIndexable(safe) ? 'indexable_candidate' : 'held_team_or_ambiguous_event';

  return {
    sourceRowId,
    batch,
    source: clean(safe.source, 80) || 'kaaf_top100_api',
    sourceType: 'public_top_record_candidate',
    sourceUrl: 'https://result.kaaf.or.kr/recInfo/topRecList.do',
    apiEndpoint: 'searchTopRecList.do',
    athleteName: clean(safe.athlete_kor, 120),
    athleteEnglishName: clean(safe.athlete_eng, 160),
    team: clean(safe.team, 160),
    event: clean(safe.event, 80),
    category: clean(safe.category, 120),
    sourceRank: Number.parseInt(safe.rank, 10) || null,
    record: clean(safe.mark, 80),
    implement: clean(safe.tool, 40) || null,
    wind: clean(safe.wind, 40) || null,
    date: clean(safe.date, 20),
    competitionName: clean(safe.meeting, 240),
    competitionNameEnglish: clean(safe.meeting_en, 240),
    recordType: clean(safe.record_type, 80) || null,
    phase: clean(safe.round, 80) || null,
    detailClassCd: clean(safe.detail_class_cd, 20),
    kindCd: clean(safe.kind_cd, 20),
    reviewStatus: clean(safe.status, 80) || 'needs_external_confirmation',
    indexingStatus,
  };
}

function summarizeLedger(rows) {
  const summary = {
    total: rows.length,
    status: {},
    stripped: 0,
    endpoints: {},
    sourceUrls: {},
  };
  for (const row of rows) {
    summary.status[row.status || 'unknown'] = (summary.status[row.status || 'unknown'] || 0) + 1;
    if (row.sensitive_data_stripped) summary.stripped += 1;
    if (row.api_endpoint) summary.endpoints[row.api_endpoint] = (summary.endpoints[row.api_endpoint] || 0) + 1;
    if (row.source_url) summary.sourceUrls[row.source_url] = (summary.sourceUrls[row.source_url] || 0) + 1;
  }
  return summary;
}

function main() {
  const inputDir = readArg('--input-dir', DEFAULT_INPUT_DIR);
  const batch = readArg('--batch', DEFAULT_BATCH);
  const candidatePath = path.join(inputDir, 'candidate-records.jsonl');
  const ledgerPath = path.join(inputDir, 'source-ledger.jsonl');

  const rawCandidates = readJsonl(candidatePath);
  const ledgerRows = readJsonl(ledgerPath);
  const sensitiveKeyHits = rawCandidates.flatMap((row, index) =>
    scanSensitiveKeys(row).map((key) => ({ row: index + 1, key })),
  );

  const records = rawCandidates.map((row, index) => normalizeCandidate(row, batch, index));
  const summary = {
    batch,
    generatedAt: new Date().toISOString(),
    sourceFiles: {
      candidateRecords: path.basename(candidatePath),
      sourceLedger: path.basename(ledgerPath),
    },
    sourceUrl: 'https://result.kaaf.or.kr/recInfo/topRecList.do',
    apiEndpoint: 'searchTopRecList.do',
    candidateCount: records.length,
    indexableCandidateCount: records.filter((record) => record.indexingStatus === 'indexable_candidate').length,
    heldCandidateCount: records.filter((record) => record.indexingStatus !== 'indexable_candidate').length,
    reviewStatus: records.reduce((acc, record) => {
      acc[record.reviewStatus] = (acc[record.reviewStatus] || 0) + 1;
      return acc;
    }, {}),
    eventCount: new Set(records.map((record) => record.event).filter(Boolean)).size,
    categoryCount: new Set(records.map((record) => record.category).filter(Boolean)).size,
    yearRange: records.reduce(
      (acc, record) => {
        const year = Number.parseInt(record.date.slice(0, 4), 10);
        if (!Number.isFinite(year)) return acc;
        acc.from = Math.min(acc.from || year, year);
        acc.to = Math.max(acc.to || year, year);
        return acc;
      },
      { from: null, to: null },
    ),
    sensitiveScan: {
      rawSensitiveKeyHits: sensitiveKeyHits,
      outputContainsRestrictedIdentifiers: false,
      strippedKeysExpectedFromLedger: ['ORG_KIND_CD1', 'PERSON_NO1'],
    },
    sourceLedger: summarizeLedger(ledgerRows),
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, `${batch}-summary.json`), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${batch}-records.jsonl`),
    `${records.map((record) => JSON.stringify(record)).join('\n')}\n`,
    'utf8',
  );
  fs.writeFileSync(path.join(OUTPUT_DIR, `${batch}-ledger-summary.json`), `${JSON.stringify(summary.sourceLedger, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `${batch}-review.md`),
    [
      `# KAAF TOP100 Manual Batch Review`,
      ``,
      `- Batch: ${batch}`,
      `- Source: ${summary.sourceUrl}`,
      `- API endpoint observed: ${summary.apiEndpoint}`,
      `- Candidate records: ${summary.candidateCount}`,
      `- Search-indexable candidates: ${summary.indexableCandidateCount}`,
      `- Held candidates: ${summary.heldCandidateCount}`,
      `- Year range: ${summary.yearRange.from} - ${summary.yearRange.to}`,
      `- Sensitive source fields stripped by collector: ${summary.sourceLedger.stripped}/${summary.sourceLedger.total} source calls`,
      `- Restricted identifiers in output: none expected`,
      ``,
      `## Operating rule`,
      ``,
      `This batch is a public TOP-record candidate batch, not a full competition-result dump.`,
      `Rows stay marked as needs_external_confirmation until an operator or Fable approves promotion.`,
      `Team/relay/road-relay rows are retained in the batch but excluded from athlete-name search.`,
      ``,
    ].join('\n'),
    'utf8',
  );

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (sensitiveKeyHits.length > 0) process.exitCode = 2;
}

main();
