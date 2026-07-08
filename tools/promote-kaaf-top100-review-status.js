#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const {
  classifyManualTopRecordReviewStatus,
  hasExternalConfirmationHint,
  REVIEW_STATUS,
} = require('../card-studio/services/manualTopRecordReviewPolicy');

const ROOT = path.join(__dirname, '..');
const DEFAULT_BATCH = '20260708-kaaf-top100';
const TOP100_DIR = path.join(ROOT, 'data', 'manual', 'kaaf-top100');

function parseArgs(argv) {
  const args = {
    batch: DEFAULT_BATCH,
    check: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--batch') {
      args.batch = argv[i + 1] || '';
      i += 1;
    } else if (arg === '--check') {
      args.check = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!/^\d{8}-kaaf-top100$/.test(args.batch)) {
    throw new Error(`Invalid batch name: ${args.batch}`);
  }
  return args;
}

function readJsonl(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).map((line) => JSON.parse(line));
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function buildSummary(existing, records) {
  const reviewStatus = countBy(records, 'reviewStatus');
  const candidateCount = records.length;
  const indexableCandidateCount = records.filter((record) => record.indexingStatus === 'indexable_candidate').length;
  const heldCandidateCount = records.filter((record) => record.indexingStatus !== 'indexable_candidate').length;
  const years = records
    .map((record) => Number.parseInt(String(record.date || '').slice(0, 4), 10))
    .filter(Number.isFinite);

  return {
    ...existing,
    candidateCount,
    indexableCandidateCount,
    heldCandidateCount,
    reviewStatus,
    reviewPolicy: {
      domesticStatus: REVIEW_STATUS.SOURCE_VERIFIED,
      externalHintStatus: REVIEW_STATUS.NEEDS_EXTERNAL_CONFIRMATION,
      externalHintCount: reviewStatus[REVIEW_STATUS.NEEDS_EXTERNAL_CONFIRMATION] || 0,
      sourceVerifiedCount: reviewStatus[REVIEW_STATUS.SOURCE_VERIFIED] || 0,
      rule: 'KAAF TOP100 domestic rows are source_verified; overseas/foreign-hosted hints remain needs_external_confirmation.',
    },
    yearRange: {
      from: years.length ? Math.min(...years) : existing.yearRange?.from || null,
      to: years.length ? Math.max(...years) : existing.yearRange?.to || null,
    },
  };
}

function promote({ batch, check }) {
  const recordsPath = path.join(TOP100_DIR, `${batch}-records.jsonl`);
  const summaryPath = path.join(TOP100_DIR, `${batch}-summary.json`);
  if (!fs.existsSync(recordsPath)) throw new Error(`Records file not found: ${recordsPath}`);
  if (!fs.existsSync(summaryPath)) throw new Error(`Summary file not found: ${summaryPath}`);

  const beforeText = fs.readFileSync(recordsPath, 'utf8');
  const beforeSummaryText = fs.readFileSync(summaryPath, 'utf8');
  const records = readJsonl(recordsPath).map((record) => ({
    ...record,
    reviewStatus: classifyManualTopRecordReviewStatus(record),
  }));
  const summary = buildSummary(JSON.parse(beforeSummaryText), records);

  const afterText = records.map((row) => JSON.stringify(row)).join('\n') + '\n';
  const afterSummaryText = JSON.stringify(summary, null, 2) + '\n';

  const changed = beforeText !== afterText || beforeSummaryText !== afterSummaryText;
  if (check) {
    if (changed) {
      throw new Error('KAAF TOP100 review statuses or summary are not up to date.');
    }
  } else if (changed) {
    writeJsonl(recordsPath, records);
    fs.writeFileSync(summaryPath, afterSummaryText);
  }

  return {
    batch,
    changed,
    candidateCount: records.length,
    indexableCandidateCount: records.filter((record) => record.indexingStatus === 'indexable_candidate').length,
    heldCandidateCount: records.filter((record) => record.indexingStatus !== 'indexable_candidate').length,
    reviewStatus: countBy(records, 'reviewStatus'),
    externalHintCount: records.filter(hasExternalConfirmationHint).length,
  };
}

if (require.main === module) {
  try {
    const result = promote(parseArgs(process.argv.slice(2)));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  promote,
};
