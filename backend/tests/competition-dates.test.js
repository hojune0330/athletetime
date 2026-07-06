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
  test(`${label}: computeStatus uses the Korea service day around midnight`, () => {
    // Given: it is already June 21 in Korea, but still June 20 in UTC.
    const now = new Date('2099-06-20T15:30:00.000Z');
    const oneDayCompetition = { start: '2099-06-21', end: '2099-06-21' };

    // When: the competition status is computed for the service day.
    const status = service.computeStatus(oneDayCompetition, now);

    // Then: the competition is live on June 21 KST.
    assert.equal(status, service.STATUS.LIVE);
  });

  test(`${label}: getDDay uses the Korea service day around midnight`, () => {
    // Given: it is already June 21 in Korea, but still June 20 in UTC.
    const now = new Date('2099-06-20T15:30:00.000Z');
    const oneDayCompetition = { start: '2099-06-21', end: '2099-06-21' };

    // When: D-day is rendered for the service day.
    const dday = service.getDDay(oneDayCompetition, now);

    // Then: the first competition day is shown, not D-1.
    assert.deepEqual(dday, { text: '1일차', sub: '/ 1일간', isLive: true });
  });
}
