const assert = require('node:assert/strict');
const test = require('node:test');

const { scanDuplicateRows } = require('../../card-studio/services/dataQualityService');

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
