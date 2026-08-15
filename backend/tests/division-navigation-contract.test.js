const assert = require('node:assert/strict');
const test = require('node:test');

const analytics = require('../../card-studio/services/recordAnalyticsService');
const divisionHierarchy = require('../../card-studio/services/divisionHierarchyService');

test('division labels preserve stable keys while replacing ambiguous copy', () => {
  const menOnly = analytics.normalizeEvent('남자 100m 결승', '남자부');
  const unknownHigh = analytics.normalizeEvent('100m 결승', '고 1학년부');
  const unknownUnspecified = analytics.normalizeEvent('100m 결승', '통합부');

  assert.equal(menOnly.divisionKey, 'men-unspecified');
  assert.equal(menOnly.divisionLabel, '남자 (세부부문 없음)');
  assert.equal(unknownHigh.divisionKey, 'unknown-high');
  assert.equal(unknownHigh.divisionLabel, '고등부 (남녀 통합)');
  assert.equal(unknownUnspecified.divisionKey, 'unknown-unspecified');
  assert.equal(unknownUnspecified.divisionLabel, '부문 정보 없음');

  const filters = analytics.getFilters();
  assert.equal(
    filters.levelOptions.find((option) => option.key === 'unspecified').label,
    '부문 통합·기타',
  );
  assert.equal(
    divisionHierarchy.buildDivisionFilters(new Map([
      ['unknown-high', { divisionKey: 'unknown-high', divisionLabel: '고등부 (남녀 통합)', gender: 'unknown', divisionLevel: 'high' }],
    ])).genderOptions[0].label,
    '남녀 통합·기타',
  );
});

test('available season combinations contain only real non-empty tuples without counts or records', () => {
  const filters = analytics.getFilters();
  const combinations = filters.availableSeasonCombinations;

  assert.ok(Array.isArray(combinations));
  assert.ok(combinations.length > 0);
  assert.deepEqual(
    combinations.map((combination) => Object.keys(combination).sort()),
    combinations.map(() => ['divisionKey', 'eventKey', 'season']),
  );
  assert.equal(
    new Set(combinations.map(({ season, eventKey, divisionKey }) => `${season}|${eventKey}|${divisionKey}`)).size,
    combinations.length,
  );

  const seasons = new Set(filters.seasons);
  const events = new Set(filters.events.map((event) => event.key));
  const divisions = new Set(filters.divisions.map((division) => division.key));
  for (const combination of combinations) {
    assert.ok(seasons.has(combination.season));
    assert.ok(events.has(combination.eventKey));
    assert.ok(divisions.has(combination.divisionKey));
    assert.equal(Object.prototype.hasOwnProperty.call(combination, 'rowCount'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(combination, 'recordCount'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(combination, 'athleteCount'), false);
    assert.ok(analytics.getSeasonRecords(combination).rows.length > 0);
  }

});
test('season records keep legacy filters without availability payload', () => {
  const filters = analytics.getFilters();
  const seasonResponse = analytics.getSeasonRecords(filters.defaultSeasonSelection);
  const beforeResponse = { ...seasonResponse, filters };
  const beforeSize = JSON.stringify(beforeResponse).length;
  const afterSize = JSON.stringify(seasonResponse).length;

  assert.equal('availableSeasonCombinations' in seasonResponse.filters, false);
  assert.deepEqual(Object.keys(seasonResponse.filters).sort(), [
    'defaultSeasonSelection',
    'divisions',
    'events',
    'genderOptions',
    'levelOptions',
    'seasons',
  ]);
  assert.ok(afterSize < beforeSize);
  assert.ok(beforeSize - afterSize > 1000);
});
