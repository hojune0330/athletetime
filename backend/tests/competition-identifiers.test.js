const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const competitionYears = fs.readdirSync(path.join(__dirname, '../../data/competitions'))
  .filter((file) => /^\d{4}\.json$/u.test(file))
  .map((file) => Number(file.slice(0, 4)))
  .sort((left, right) => left - right);

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

  test(`${label}: every local competition catalogue entry keeps a traceable source and unique display key`, () => {
    const catalogue = competitionYears.flatMap((year) => service.getCompetitions(year));
    const stableKeys = catalogue.map((competition) => competition.stableKey);

    assert.ok(catalogue.length > 0, 'local competition catalogue must not be empty');
    assert.deepEqual(service.validateDataIntegrity(catalogue), []);
    assert.equal(new Set(stableKeys).size, stableKeys.length);
    assert.ok(stableKeys.every((key) => typeof key === 'string' && key.length > 0));
  });
}
