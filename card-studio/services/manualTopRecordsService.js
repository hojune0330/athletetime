'use strict';

const fs = require('fs');
const path = require('path');

const config = require('../config');

const TOP_RECORDS_DIR = path.join(config.dirs.data, 'manual', 'kaaf-top100');

let cache = null;
let cacheSignature = '';

function getSignature() {
  try {
    const files = fs
      .readdirSync(TOP_RECORDS_DIR)
      .filter((file) => /^\d{8}-kaaf-top100-records\.jsonl$/.test(file) || /^\d{8}-kaaf-top100-summary\.json$/.test(file))
      .sort();
    return files
      .map((file) => {
        const stat = fs.statSync(path.join(TOP_RECORDS_DIR, file));
        return `${file}:${stat.size}:${stat.mtimeMs}`;
      })
      .join('|');
  } catch {
    return '';
  }
}

function getBatches() {
  const signature = getSignature();
  if (cache && cacheSignature === signature) return cache;

  const batches = [];
  if (signature) {
    const files = fs
      .readdirSync(TOP_RECORDS_DIR)
      .filter((file) => /^\d{8}-kaaf-top100-records\.jsonl$/.test(file))
      .sort();

    for (const file of files) {
      try {
        const batch = file.replace('-records.jsonl', '');
        const summaryPath = path.join(TOP_RECORDS_DIR, `${batch}-summary.json`);
        const summary = fs.existsSync(summaryPath)
          ? JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
          : {};
        const records = fs
          .readFileSync(path.join(TOP_RECORDS_DIR, file), 'utf8')
          .split(/\r?\n/)
          .filter(Boolean)
          .map((line) => JSON.parse(line));
        batches.push({
          filename: file,
          summary,
          records,
        });
      } catch {
      }
    }
  }

  cache = batches;
  cacheSignature = signature;
  return cache;
}

function listIndexableRecords() {
  return getBatches().flatMap((batch) =>
    batch.records
      .filter((record) => record.indexingStatus === 'indexable_candidate')
      .map((record) => ({
        ...record,
        batchFilename: batch.filename,
        batchSummary: batch.summary,
      })),
  );
}

function getSummary() {
  const batches = getBatches();
  return {
    batchCount: batches.length,
    candidateCount: batches.reduce((sum, batch) => sum + (batch.summary.candidateCount || 0), 0),
    indexableCandidateCount: batches.reduce((sum, batch) => sum + (batch.summary.indexableCandidateCount || 0), 0),
    heldCandidateCount: batches.reduce((sum, batch) => sum + (batch.summary.heldCandidateCount || 0), 0),
    yearRange: batches.reduce(
      (range, batch) => {
        const from = batch.summary.yearRange?.from;
        const to = batch.summary.yearRange?.to;
        if (Number.isFinite(from)) range.from = Math.min(range.from || from, from);
        if (Number.isFinite(to)) range.to = Math.max(range.to || to, to);
        return range;
      },
      { from: null, to: null },
    ),
  };
}

module.exports = {
  getSignature,
  getBatches,
  getSummary,
  listIndexableRecords,
};
