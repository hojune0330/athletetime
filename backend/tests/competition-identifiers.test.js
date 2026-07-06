const assert = require('node:assert/strict');
const test = require('node:test');

const services = [
  {
    label: 'src service',
    module: require('../../src/services/competitionService'),
  },
  {
    label: 'card-studio service',
    module: require('../../card-studio/services/competitionService'),
  },
];

for (const { label, module: service } of services) {
  test(`${label}: decorated 2026 competitions expose unique stable keys`, () => {
    // Given: 2026 road competitions contain duplicated internal ids.
    const competitions = service.getCompetitions(2026);

    // When: the display key list is built from the decorated response.
    const stableKeys = competitions.map((competition) => competition.stableKey);

    // Then: every row has a unique key for React rendering and UI linking.
    assert.equal(stableKeys.length, competitions.length);
    assert.equal(new Set(stableKeys).size, competitions.length);
    assert.ok(stableKeys.every((key) => typeof key === 'string' && key.length > 0));
  });
}
