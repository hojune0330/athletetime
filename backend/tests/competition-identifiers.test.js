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

  test(`${label}: direct result references count as traceable source metadata`, () => {
    // A result page can be the source even when the schedule-page sequence is absent.
    const directResultCompetition = {
      id: '2026-road-fixture',
      name: '검증용 도로 대회',
      period: { start: '2026-02-22', end: '2026-02-22' },
      source: 'kaaf_result_fixture',
      toCd: 'E000000001',
      resultUrl: 'https://example.test/result/E000000001',
    };

    assert.deepEqual(service.validateDataIntegrity([directResultCompetition]), []);
    assert.equal(
      service.getCompetitions(2026).some((competition) => competition.stableKey === '2026-road-001-result-E014030185'),
      true,
    );
  });
}
