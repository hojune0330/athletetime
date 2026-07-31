const assert = require('node:assert/strict');
const test = require('node:test');

const { summarize } = require('../../card-studio/services/teamPerformanceService');

test('Given final preliminary ambiguous and relay results When podium is summarized Then only defensible counts are confirmed', () => {
  const result = summarize([
    record({ id: 'final-1', rank: 1, phase: '결승' }),
    record({ id: 'prelim-1', rank: 1, phase: '예선' }),
    record({ id: 'unknown-2', rank: 2, phase: '' }),
    record({ id: 'final-2', athleteKey: 'athlete-b', rank: 2, phase: 'Final' }),
    record({ id: 'final-3', athleteKey: 'athlete-c', rank: 3, phase: '종합' }),
    record({ id: 'relay-a', athleteKey: 'relay-a', eventKey: '4x100m-relay', eventLabel: '4x100m 계주', rank: 1, phase: '결승' }),
    record({ id: 'relay-b', athleteKey: 'relay-b', eventKey: '4x100m-relay', eventLabel: '4x100m 계주', rank: 1, phase: '결승' }),
  ]);

  assert.deepEqual(result.podium.confirmed, { first: 2, second: 1, third: 1, total: 4 });
  assert.deepEqual(result.podium.ambiguous, { first: 0, second: 1, third: 0, total: 1 });
  assert.equal(result.podium.preliminaryRowsExcluded, 1);
});

test('Given duplicate result rows and status-only evidence When participation is summarized Then competitions remain unique', () => {
  const result = summarize([
    record({ id: 'one-a', competitionId: 'competition-one' }),
    record({ id: 'one-b', competitionId: 'competition-one' }),
    record({ id: 'two-status', competitionId: '', competitionName: '두번째 대회', isComparable: false, recordValue: null }),
  ]);

  assert.equal(result.participation.competitionCount, 2);
});

test('Given comparable track and field progressions When improvements are summarized Then first observations and illegal wind are excluded', () => {
  const result = summarize([
    record({ id: 'track-1', date: '2026-01-01', recordValue: 11, note: 'PB' }),
    record({ id: 'track-2', date: '2026-02-01', recordValue: 10.9 }),
    record({ id: 'track-3', date: '2026-03-01', recordValue: 11.1 }),
    record({ id: 'track-4', date: '2026-04-01', recordValue: 10.7, windLegal: false }),
    record({ id: 'track-5', date: '2026-05-01', recordValue: 10.8, personal_best: 'Personal Best' }),
    record({ id: 'field-1', athleteKey: 'athlete-field', eventKey: 'long-jump', eventLabel: '멀리뛰기', direction: 'higher', date: '2026-01-01', recordValue: 6 }),
    record({ id: 'field-2', athleteKey: 'athlete-field', eventKey: 'long-jump', eventLabel: '멀리뛰기', direction: 'higher', date: '2026-02-01', recordValue: 6.2 }),
    record({ id: 'fragment-only', athleteKey: 'other-team-fragment', date: '2026-06-01', recordValue: 10.5 }),
  ]);

  assert.equal(result.improvements.indexedImprovementCount, 3);
  assert.equal(result.improvements.sourceMarkedPersonalBestCount, 2);
});

test('Given preliminary and final marks on one day When chronology is compared Then the final can improve the baseline', () => {
  const result = summarize([
    record({ id: 'same-day-heat', date: '2026-07-01', phase: '예선', recordValue: 11 }),
    record({ id: 'same-day-final', date: '2026-07-01', phase: '결승', recordValue: 10.8 }),
  ]);

  assert.equal(result.improvements.indexedImprovementCount, 1);
});

test('Given ambiguous and confirmed relay copies When podium is summarized Then confirmed evidence wins regardless of order', () => {
  const result = summarize([
    record({ id: 'relay-unknown', athleteKey: 'relay-a', eventKey: 'relay', eventLabel: '4x100m 계주', rank: 1, phase: '' }),
    record({ id: 'relay-final', athleteKey: 'relay-b', eventKey: 'relay', eventLabel: '4x100m 계주', rank: 1, phase: '결승' }),
  ]);

  assert.equal(result.podium.confirmed.total, 1);
  assert.equal(result.podium.ambiguous.total, 0);
});

function record(overrides = {}) {
  return {
    id: 'record-1',
    athleteKey: 'athlete-a',
    name: '김선수',
    team: '진도군청',
    season: 2026,
    competitionId: 'competition-one',
    competitionName: '첫번째 대회',
    date: '2026-01-01',
    eventKey: '100m',
    eventLabel: '100m',
    divisionKey: 'men-general',
    phase: '결승',
    rank: 4,
    recordValue: 11,
    recordDisplay: '11.00',
    direction: 'lower',
    windLegal: true,
    isComparable: true,
    note: '',
    ...overrides,
  };
}
