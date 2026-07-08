const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const summaryPath = path.join(ROOT, 'data', 'manual', 'kaaf-top100', '20260708-kaaf-top100-summary.json');
const recordsPath = path.join(ROOT, 'data', 'manual', 'kaaf-top100', '20260708-kaaf-top100-records.jsonl');
const manualTopRecordsService = require('../../card-studio/services/manualTopRecordsService');
const recordAnalyticsService = require('../../card-studio/services/recordAnalyticsService');

test('manual TOP100 batch is safe to store as candidate data', () => {
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const records = fs.readFileSync(recordsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
  const recordKeys = new Set(records.flatMap((record) => Object.keys(record)));

  assert.equal(summary.candidateCount, 24630);
  assert.equal(summary.indexableCandidateCount, 16885);
  assert.equal(summary.heldCandidateCount, 7745);
  assert.equal(summary.yearRange.from, 2005);
  assert.equal(summary.yearRange.to, 2026);
  assert.deepEqual(summary.sensitiveScan.rawSensitiveKeyHits, []);
  assert.equal(records.length, 24630);
  assert.equal(
    [...recordKeys].some((key) => /person_no|PERSON_NO|birthDate|birthdate|resident|phone|email|contact|address/i.test(key)),
    false,
  );
});

test('manual TOP100 service exposes only athlete-searchable candidate rows', () => {
  const summary = manualTopRecordsService.getSummary();
  const records = manualTopRecordsService.listIndexableRecords();

  assert.equal(summary.batchCount, 1);
  assert.equal(records.length, 16885);
  assert.equal(records.some((record) => record.athleteName.includes(',')), false);
  assert.equal(records.some((record) => /4x|역전경기|relay/i.test(record.event)), false);
  assert.ok(records.some((record) => record.athleteName === '김국영' && record.record === '10.07'));
});

test('manual TOP100 candidates are searchable without becoming official-result rows', () => {
  const koreanResults = recordAnalyticsService.searchAthletes('김국영', 10);
  const englishResults = recordAnalyticsService.searchAthletes('KIM KUKYOUNG', 10);

  assert.ok(koreanResults.length >= 1);
  assert.ok(englishResults.length >= 1);

  const profile = recordAnalyticsService.getAthleteSummary(koreanResults[0].athleteKey);
  const candidateRecord = profile.records.find((record) => record.source.sourceType === 'public_top_record_candidate');

  assert.ok(candidateRecord);
  assert.equal(candidateRecord.name, '김국영');
  assert.equal(candidateRecord.source.provider, 'KAAF');
  assert.equal(candidateRecord.source.reviewStatus, 'needs_external_confirmation');
  assert.equal(candidateRecord.source.sourceType, 'public_top_record_candidate');
});
