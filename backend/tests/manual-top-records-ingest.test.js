const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const summaryPath = path.join(ROOT, 'data', 'manual', 'kaaf-top100', '20260708-kaaf-top100-summary.json');
const recordsPath = path.join(ROOT, 'data', 'manual', 'kaaf-top100', '20260708-kaaf-top100-records.jsonl');
const {
  classifyManualTopRecordReviewStatus,
  REVIEW_STATUS,
} = require('../../card-studio/services/manualTopRecordReviewPolicy');
const manualTopRecordsService = require('../../card-studio/services/manualTopRecordsService');
const recordAnalyticsService = require('../../card-studio/services/recordAnalyticsService');

test('manual TOP100 batch is safe to store as candidate data', () => {
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const records = fs.readFileSync(recordsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
  const recordKeys = new Set(records.flatMap((record) => Object.keys(record)));

  assert.equal(summary.candidateCount, 24630);
  assert.equal(summary.indexableCandidateCount, 16885);
  assert.equal(summary.heldCandidateCount, 7745);
  assert.deepEqual(summary.reviewStatus, {
    source_verified: 23861,
    needs_external_confirmation: 769,
  });
  assert.equal(summary.reviewPolicy.sourceVerifiedCount, 23861);
  assert.equal(summary.reviewPolicy.externalHintCount, 769);
  assert.equal(summary.yearRange.from, 2005);
  assert.equal(summary.yearRange.to, 2026);
  assert.deepEqual(summary.sensitiveScan.rawSensitiveKeyHits, []);
  assert.equal(records.length, 24630);
  assert.equal(
    [...recordKeys].some((key) => /person_no|PERSON_NO|birthDate|birthdate|resident|phone|email|contact|address/i.test(key)),
    false,
  );
});

test('manual TOP100 review status policy promotes domestic rows and keeps overseas hints pending', () => {
  const records = fs.readFileSync(recordsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
  const byStatus = records.reduce((acc, record) => {
    acc[record.reviewStatus] = (acc[record.reviewStatus] || 0) + 1;
    return acc;
  }, {});

  assert.deepEqual(byStatus, {
    [REVIEW_STATUS.SOURCE_VERIFIED]: 23861,
    [REVIEW_STATUS.NEEDS_EXTERNAL_CONFIRMATION]: 769,
  });
  assert.equal(
    records.every((record) => classifyManualTopRecordReviewStatus(record) === record.reviewStatus),
    true,
  );
  assert.equal(
    records.some(
      (record) =>
        record.athleteName === '김국영'
        && record.competitionName === '2017 코리아오픈국제육상경기대회'
        && record.reviewStatus === REVIEW_STATUS.SOURCE_VERIFIED,
    ),
    true,
  );
  assert.equal(
    records.some(
      (record) =>
        /대만오픈|오사카|디스턴스첼린지대회\(5차\)/.test(record.competitionName)
        && record.reviewStatus === REVIEW_STATUS.NEEDS_EXTERNAL_CONFIRMATION,
    ),
    true,
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
  assert.ok(
    records.some(
      (record) => record.competitionName === '2018 대만오픈육상경기선수권대회'
        && record.reviewStatus === REVIEW_STATUS.NEEDS_EXTERNAL_CONFIRMATION,
    ),
  );
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
  assert.equal(candidateRecord.source.reviewStatus, 'source_verified');
  assert.equal(candidateRecord.source.sourceType, 'public_top_record_candidate');
  assert.match(candidateRecord.note, /KAAF 공개 기록/);
  assert.doesNotMatch(candidateRecord.note, /candidate|needs_external_confirmation|source_verified/i);
});

test('manual TOP100 index dedup keeps one public row per same athlete event date record', () => {
  const index = recordAnalyticsService.getIndex();
  const stats = index.manualTopRecordStats;
  const koreanResults = recordAnalyticsService.searchAthletes('김국영', 10);
  const profile = recordAnalyticsService.getAthleteSummary(koreanResults[0].athleteKey);
  const kimKoreaOpenHundred = profile.records.filter(
    (record) =>
      record.name === '김국영'
      && record.eventKey === '100m'
      && record.date === '2017-06-27'
      && record.record === '10.07',
  );

  assert.deepEqual(stats, {
    totalCandidates: 16885,
    appended: 9564,
    skippedDuplicates: 7321,
    skippedSuppressed: 0,
    skippedInvalidName: 0,
    skippedInvalidRecord: 0,
  });
  assert.equal(kimKoreaOpenHundred.length, 1);
  assert.equal(kimKoreaOpenHundred[0].source.sourceType, 'public_top_record_candidate');
});
