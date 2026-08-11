const assert = require('node:assert/strict');
const test = require('node:test');

const { checkRecord, scanDuplicateRows } = require('../../card-studio/services/dataQualityService');

function issueBucket() {
  return {
    duplicateAthleteEventRow: {
      count: 0,
      affectedRows: 0,
      samples: [],
    },
  };
}

const context = {
  competitionId: 'competition-1',
  event: 'high-jump',
  division: 'women-elementary',
};

function recordIssueBuckets() {
  return Object.fromEntries([
    'invalidRecord',
    'malformedRecord',
    'statusOnlyRecord',
    'nonPositiveRecord',
  ].map((key) => [key, { count: 0, affectedRows: 0, samples: [] }]));
}

test('Given same-name athletes at different affiliations When quality checks rows Then they are not claimed as duplicate people', () => {
  const issues = issueBucket();

  scanDuplicateRows(issues, context, [
    { name: 'Kim Athlete', affiliation: 'School A', record: '1.45' },
    { name: 'Kim Athlete', affiliation: 'School B', record: '1.45' },
  ]);

  assert.equal(issues.duplicateAthleteEventRow.count, 0);
});

test('Given repeated identical result rows When quality checks rows Then it retains one redacted duplicate warning', () => {
  const issues = issueBucket();

  scanDuplicateRows(issues, context, [
    { name: 'Kim Athlete', affiliation: 'School A', record: '1.45' },
    { name: 'Kim Athlete', affiliation: 'School A', record: '1.45' },
  ]);

  assert.equal(issues.duplicateAthleteEventRow.count, 1);
  assert.equal(issues.duplicateAthleteEventRow.samples.length, 1);
  assert.equal(JSON.stringify(issues.duplicateAthleteEventRow.samples).includes('Kim Athlete'), false);
  assert.equal(JSON.stringify(issues.duplicateAthleteEventRow.samples).includes('School A'), false);
});

test('Given a known race status When quality checks a record Then it is not counted as a malformed result', () => {
  const issues = recordIssueBuckets();

  checkRecord(issues, context, 'DNS', 'lower');

  assert.equal(issues.statusOnlyRecord.count, 1);
  assert.equal(issues.invalidRecord.count, 0);
  assert.equal(issues.malformedRecord.count, 0);
});

test('Given a non-status unparseable record When quality checks it Then it remains an invalid result', () => {
  const issues = recordIssueBuckets();

  checkRecord(issues, context, 'not-a-mark', 'lower');

  assert.equal(issues.statusOnlyRecord.count, 0);
  assert.equal(issues.invalidRecord.count, 1);
  assert.equal(issues.malformedRecord.count, 1);
});
